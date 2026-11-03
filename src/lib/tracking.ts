import { Capacitor, registerPlugin } from "@capacitor/core";
import type { BackgroundGeolocationPlugin } from "@capacitor-community/background-geolocation";
import { isWithinActiveHours } from "./schedule";
import type { Coord, Settings } from "./types";

// The plugin ships native code and type declarations only — no JS entry —
// so the web-side proxy is registered by hand against the native name.
const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>(
  "BackgroundGeolocation",
);

export type TrackingState = "active" | "disabled" | "paused" | "outside-active-hours";

/** Pure decision shared by the 60 s tick, the settings UI and every fix. */
export function trackingDecision(settings: Settings, now: Date): TrackingState {
  if (!settings.geofenceEnabled || settings.demoLocationMode) return "disabled";
  if (settings.trackingPaused) return "paused";
  if (!isWithinActiveHours(now, settings.activeStart, settings.activeEnd)) {
    return "outside-active-hours";
  }
  return "active";
}

export type TrackingHandlers = {
  onCoord: (coord: Coord) => void;
  onAutoStop: (state: Exclude<TrackingState, "active">) => void;
  onError: (message: string) => void;
};

export type TrackingController = {
  /** Starts or stops the platform watcher so it matches `settings`. */
  apply: (settings: Settings) => Promise<void>;
  /** Idempotent; safe to call from inside the position callback. */
  stop: () => Promise<void>;
};

export function createTrackingController(handlers: TrackingHandlers): TrackingController {
  let settings: Settings | null = null;
  let starting = false;
  let stopNativeWatcher: (() => Promise<void>) | null = null;
  let stopWebWatcher: (() => void) | null = null;

  async function stop(): Promise<void> {
    const native = stopNativeWatcher;
    const web = stopWebWatcher;
    stopNativeWatcher = null;
    stopWebWatcher = null;
    if (web) web();
    if (native) await native();
  }

  async function handleFix(coord: Coord): Promise<void> {
    const current = settings;
    if (!current) return;
    // Android freezes background JS timers, so the schedule can never be
    // re-checked from the 60 s tick alone — every fix re-decides, and a
    // closed window stops the watcher from inside this callback.
    const decision = trackingDecision(current, new Date());
    if (decision !== "active") {
      await stop();
      handlers.onAutoStop(decision);
      return;
    }
    // Every fix is forwarded: arrivals must always notify. Throttling of
    // stationary fixes happens in AppState, where the place match is known.
    handlers.onCoord(coord);
  }

  async function apply(next: Settings): Promise<void> {
    settings = next;
    if (trackingDecision(next, new Date()) !== "active") {
      await stop();
      return;
    }
    if (starting || stopNativeWatcher || stopWebWatcher) return;

    if (Capacitor.isNativePlatform()) {
      starting = true;
      try {
        const watcherId = await BackgroundGeolocation.addWatcher(
          {
            backgroundTitle: "Filmit",
            backgroundMessage: "Paikkaseuranta päällä",
            distanceFilter: 50,
            requestPermissions: true,
          },
          (position, error) => {
            if (error) {
              handlers.onError("Sijaintia ei saatu — tarkista paikannusluvat.");
              return;
            }
            if (position) {
              void handleFix({ lat: position.latitude, lng: position.longitude });
            }
          },
        );
        stopNativeWatcher = async () => {
          stopNativeWatcher = null;
          await BackgroundGeolocation.removeWatcher({ id: watcherId }).catch(() => undefined);
        };
        return;
      } catch {
        // Plugin bridge unavailable — fall through to the browser watcher.
      } finally {
        starting = false;
      }
    }

    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        void handleFix({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      () => handlers.onError("Sijaintia ei saatu. Käytä demopaikannusta testaukseen."),
      { enableHighAccuracy: false, maximumAge: 15_000, timeout: 12_000 },
    );
    stopWebWatcher = () => navigator.geolocation.clearWatch(watchId);
  }

  return { apply, stop };
}

/** Opens Android's app settings so the user can grant "Allow all the time". */
export async function openLocationSettings(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await BackgroundGeolocation.openSettings().catch(() => undefined);
}
