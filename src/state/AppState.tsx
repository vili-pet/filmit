import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { evaluateAchievements, newlyUnlocked } from "../lib/achievements";
import { createDemoClips } from "../lib/demo-data";
import { ensureNotificationSetup, notifyArrival } from "../lib/notify";
import { shouldProcessPosition } from "../lib/schedule";
import { createTrackingController, trackingDecision } from "../lib/tracking";
import {
  deleteClip as dbDeleteClip,
  deleteDemoClips,
  deletePlace as dbDeletePlace,
  listClips,
  listMontages,
  listPlaces,
  loadAchievements,
  loadSettings,
  putClip,
  putMontage,
  putPlace,
  replacePlaces,
  saveAchievements,
  saveSettings,
} from "../lib/db";
import {
  DEMO_PLACES,
  detectTransition,
  matchPlace,
  type GeofenceTransition,
} from "../lib/geofence";
import { toDateKey } from "../lib/dates";
import { createId } from "../lib/id";
import { composeMontage } from "../lib/media";
import { montagePlan } from "../lib/montage";
import { streakFromClips } from "../lib/streaks";
import { DEFAULT_SETTINGS, type Clip, type Coord, type Montage, type Place, type RangePreset, type Settings, type UnlockedAchievement } from "../lib/types";
import { AppContext, type AppContextValue, type SaveClipInput, type Toast } from "./app-context";

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [clips, setClips] = useState<Clip[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [achievements, setAchievements] = useState<UnlockedAchievement[]>([]);
  const [montages, setMontages] = useState<Montage[]>([]);
  const [currentPlace, setCurrentPlace] = useState<Place | null>(null);
  const [prompt, setPrompt] = useState<GeofenceTransition | null>(null);
  const [justUnlocked, setJustUnlocked] = useState<UnlockedAchievement[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const previousPlaceId = useRef<string | null>(null);
  const placesRef = useRef<Place[]>([]);
  const settingsRef = useRef(settings);
  const lastFixRef = useRef<{ coord: Coord; at: number } | null>(null);
  const lastProcessedAtRef = useRef<number | null>(null);
  const lastErrorToastRef = useRef(0);
  const controllerRef = useRef<ReturnType<typeof createTrackingController> | null>(null);
  // document.hidden stays false for a backgrounded Capacitor WebView, so the
  // reliable background signal comes from the native appStateChange event.
  const appBackgroundRef = useRef(document.hidden);

  useEffect(() => {
    placesRef.current = places;
  }, [places]);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const pushToast = useCallback((message: string) => {
    const id = createId("toast");
    setToasts((current) => [...current, { id, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4200);
  }, []);

  const syncAchievements = useCallback(
    async (nextClips: Clip[]) => {
      const streak = streakFromClips(nextClips, new Date());
      const nextIds = evaluateAchievements(nextClips, streak);
      setAchievements((previous) => {
        const fresh = newlyUnlocked(previous, nextIds);
        if (fresh.length === 0) return previous;
        const merged = [...previous, ...fresh];
        void saveAchievements(merged);
        setJustUnlocked(fresh);
        return merged;
      });
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [storedClips, storedPlaces, storedSettings, storedAchievements, storedMontages] =
        await Promise.all([
          listClips(),
          listPlaces(),
          loadSettings(),
          loadAchievements(),
          listMontages(),
        ]);
      if (cancelled) return;
      let nextPlaces = storedPlaces;
      if (nextPlaces.length === 0) {
        nextPlaces = DEMO_PLACES;
        await replacePlaces(DEMO_PLACES);
      }
      setClips(storedClips);
      setPlaces(nextPlaces);
      setSettings(storedSettings);
      setAchievements(storedAchievements);
      setMontages(storedMontages);
      await syncAchievements(storedClips);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [syncAchievements]);

  const applyCoord = useCallback((coord: Coord) => {
    const next = matchPlace(coord, placesRef.current, previousPlaceId.current);
    const previous =
      placesRef.current.find((place) => place.id === previousPlaceId.current) ?? null;
    const transition = detectTransition(previous, next);
    // Arrivals are always processed; only stationary re-fixes obey the
    // tracking interval — the plugin's distance filter already limits them.
    if (
      !transition &&
      !shouldProcessPosition(
        Date.now(),
        lastProcessedAtRef.current,
        settingsRef.current.trackingIntervalMin,
      )
    ) {
      lastFixRef.current = { coord, at: Date.now() };
      return;
    }
    lastProcessedAtRef.current = Date.now();
    previousPlaceId.current = next?.id ?? null;
    setCurrentPlace(next);
    lastFixRef.current = { coord, at: Date.now() };
    if (transition) {
      setPrompt(transition);
      // Backgrounded arrivals surface as system notifications; the in-app
      // sheet covers the foreground case.
      if ((appBackgroundRef.current || document.hidden) && transition.type !== "exit") {
        const place = transition.type === "transfer" ? transition.to : transition.place;
        void notifyArrival(place);
      }
    }
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    const handle = App.addListener("appStateChange", (state) => {
      appBackgroundRef.current = !state.isActive;
    });
    return () => {
      void handle.then((listener) => listener.remove());
    };
  }, []);

  useEffect(() => {
    const controller = createTrackingController({
      onCoord: (coord) => {
        applyCoord(coord);
      },
      onAutoStop: (state) => {
        if (state === "outside-active-hours") {
          pushToast("Seurantaikkuna päättyi — paikannus pysäytetty.");
        }
      },
      onError: (message) => {
        const now = Date.now();
        if (now - lastErrorToastRef.current < 60_000) return;
        lastErrorToastRef.current = now;
        pushToast(message);
      },
    });
    controllerRef.current = controller;
    return () => {
      controllerRef.current = null;
      void controller.stop();
    };
  }, [applyCoord, pushToast]);

  useEffect(() => {
    if (settings.demoLocationMode) {
      void controllerRef.current?.stop();
      if (settings.geofenceEnabled && settings.mockedLocation) {
        applyCoord(settings.mockedLocation);
      }
      return;
    }
    if (!settings.geofenceEnabled) {
      void controllerRef.current?.stop();
      setCurrentPlace(null);
      previousPlaceId.current = null;
      lastFixRef.current = null;
      return;
    }
    void ensureNotificationSetup();
    const drive = () => {
      const controller = controllerRef.current;
      if (!controller) return;
      if (trackingDecision(settings, new Date()) === "active") {
        void controller.apply(settings);
      } else {
        void controller.stop();
      }
    };
    drive();
    // The tick only flips the window edges while the process is alive;
    // fixes re-check the schedule themselves once timers are frozen.
    const tick = window.setInterval(drive, 60_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") drive();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [applyCoord, settings]);

  const saveClip = useCallback(
    async (input: SaveClipInput) => {
      const now = new Date();
      const place = settingsRef.current.attachPlaceLabels ? currentPlace : null;
      const freshFix = lastFixRef.current;
      const coord =
        freshFix && now.getTime() - freshFix.at <= 30 * 60_000 ? freshFix.coord : undefined;
      const clip: Clip = {
        id: createId("clip"),
        createdAt: now.getTime(),
        dateKey: toDateKey(now),
        durationMs: input.durationMs,
        blob: input.blob,
        mimeType: input.mimeType,
        source: input.source,
        isDemo: Boolean(input.isDemo),
        placeId: place?.id,
        placeLabel: place?.name,
        coord,
      };
      await putClip(clip);
      const next = [clip, ...clips];
      setClips(next);
      await syncAchievements(next);
      pushToast("Hetki tallennettu laitteellesi.");
    },
    [clips, currentPlace, pushToast, syncAchievements],
  );

  const removeClip = useCallback(async (id: string) => {
    await dbDeleteClip(id);
    setClips((current) => current.filter((clip) => clip.id !== id));
  }, []);

  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    const next = { ...settingsRef.current, ...patch };
    setSettings(next);
    await saveSettings(next);
  }, []);

  const toggleDemoData = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        const demoClips = await createDemoClips();
        await Promise.all(demoClips.map((clip) => putClip(clip)));
        const next = [...demoClips, ...clips.filter((clip) => !clip.isDemo)].sort(
          (a, b) => b.createdAt - a.createdAt,
        );
        setClips(next);
        await updateSettings({ demoDataEnabled: true });
        await syncAchievements(next);
        pushToast("Demodata päällä. Merkitty selvästi aikajanalla.");
        return;
      }
      await deleteDemoClips();
      const next = clips.filter((clip) => !clip.isDemo);
      setClips(next);
      await updateSettings({ demoDataEnabled: false });
      pushToast("Demodata poistettu. Omat klipit säilyivät.");
    },
    [clips, pushToast, syncAchievements, updateSettings],
  );

  const upsertPlace = useCallback(async (place: Place) => {
    await putPlace(place);
    setPlaces((current) => {
      const exists = current.some((item) => item.id === place.id);
      return exists ? current.map((item) => (item.id === place.id ? place : item)) : [...current, place];
    });
  }, []);

  const removePlace = useCallback(async (id: string) => {
    await dbDeletePlace(id);
    setPlaces((current) => current.filter((place) => place.id !== id));
  }, []);

  const resetDemoPlaces = useCallback(async () => {
    await replacePlaces(DEMO_PLACES);
    setPlaces(DEMO_PLACES);
  }, []);

  const setMockedLocation = useCallback(
    async (coord: Coord | null) => {
      await updateSettings({ mockedLocation: coord, demoLocationMode: true, geofenceEnabled: true });
      if (coord) applyCoord(coord);
    },
    [applyCoord, updateSettings],
  );

  const createMontage = useCallback(
    async (preset: RangePreset) => {
      const plan = montagePlan(clips, preset, new Date());
      const result = await composeMontage(plan.clips);
      const montage: Montage = {
        id: createId("montage"),
        createdAt: Date.now(),
        title: plan.title,
        startDateKey: plan.range.startDateKey,
        endDateKey: plan.range.endDateKey,
        clipIds: plan.clips.map((clip) => clip.id),
        status: result.status,
        reason: result.status === "preview-only" ? result.reason : undefined,
        blob: result.status === "encoded" ? result.blob : undefined,
        mimeType: result.status === "encoded" ? result.mimeType : undefined,
      };
      await putMontage(montage);
      setMontages((current) => [montage, ...current]);
      return montage;
    },
    [clips],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      clips,
      places,
      settings,
      achievements,
      montages,
      currentPlace,
      prompt,
      justUnlocked,
      toasts,
      saveClip,
      removeClip,
      updateSettings,
      toggleDemoData,
      upsertPlace,
      removePlace,
      resetDemoPlaces,
      setMockedLocation,
      dismissPrompt: () => setPrompt(null),
      createMontage,
      dismissUnlock: () => setJustUnlocked((current) => current.slice(1)),
      dismissToast: (id) => setToasts((current) => current.filter((toast) => toast.id !== id)),
    }),
    [
      achievements,
      clips,
      createMontage,
      currentPlace,
      justUnlocked,
      montages,
      places,
      prompt,
      ready,
      removeClip,
      removePlace,
      resetDemoPlaces,
      saveClip,
      setMockedLocation,
      settings,
      toasts,
      toggleDemoData,
      updateSettings,
      upsertPlace,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
