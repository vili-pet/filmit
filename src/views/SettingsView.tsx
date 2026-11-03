import { useState } from "react";
import { usePermissions } from "../hooks/usePermissions";
import { DEMO_OUTSIDE, DEMO_PLACES } from "../lib/geofence";
import { createId } from "../lib/id";
import { ACHIEVEMENTS } from "../lib/achievements";
import { openLocationSettings } from "../lib/tracking";
import { isNativePlatform } from "../lib/native";
import { useApp, useProgress } from "../hooks/useApp";
import { TRACKING_INTERVAL_OPTIONS, type Place } from "../lib/types";

export function SettingsView() {
  const {
    settings,
    updateSettings,
    toggleDemoData,
    places,
    upsertPlace,
    removePlace,
    resetDemoPlaces,
    setMockedLocation,
    achievements,
    currentPlace,
  } = useApp();
  const { streak, progress } = useProgress();
  const { camera, location, support } = usePermissions();
  const [draftName, setDraftName] = useState("");
  const [draftRadius, setDraftRadius] = useState(120);

  const saveCurrentAsPlace = async () => {
    const coord = settings.mockedLocation;
    if (!coord || !draftName.trim()) return;
    const place: Place = {
      id: createId("place"),
      name: draftName.trim(),
      lat: coord.lat,
      lng: coord.lng,
      radiusM: draftRadius,
      kind: "custom",
    };
    await upsertPlace(place);
    setDraftName("");
  };

  return (
    <section className="view settings-view">
      <header className="view-header">
        <p className="kicker">Profile</p>
        <h1>Settings</h1>
        <p className="lede">A private, ad-free daily diary. All data stays on your device.</p>
        <div className="stat-row">
          <span className="chip">{streak.current} day streak</span>
          <span className="chip">{progress.xp} XP</span>
          <span className="chip">Level {progress.level}</span>
        </div>
        <div className="xp-bar" aria-label={`Level progress ${progress.xpIntoLevel} / ${progress.xpForLevel}`}>
          <span style={{ width: `${progress.xpIntoLevel}%` }} />
        </div>
      </header>

      <section className="card">
        <h2>Achievements</h2>
        <ul className="achievement-list">
          {ACHIEVEMENTS.map((item) => {
            const unlocked = achievements.some((entry) => entry.id === item.id);
            return (
              <li key={item.id} className={unlocked ? "is-on" : undefined}>
                <strong>{item.title}</strong>
                <span>{item.description}</span>
                <em>{unlocked ? "Unlocked" : "Locked"}</em>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card">
        <h2>Appearance</h2>
        <fieldset className="segment">
          <legend className="sr-only">Theme</legend>
          {(["system", "light", "dark"] as const).map((theme) => (
            <button
              key={theme}
              type="button"
              className={settings.theme === theme ? "is-active" : undefined}
              onClick={() => void updateSettings({ theme })}
            >
              {theme === "system" ? "System" : theme === "light" ? "Light" : "Dark"}
            </button>
          ))}
        </fieldset>
      </section>

      <section className="card">
        <h2>Demo data</h2>
        <p>Show pre-made demo clips without using the camera or location.</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void toggleDemoData(!settings.demoDataEnabled)}
        >
          {settings.demoDataEnabled ? "Remove demo data" : "Enable demo data"}
        </button>
      </section>

      <section className="card">
        <h2>Location &amp; tracking</h2>
        <p>
          Filmit follows your places in the background and reminds you on arrival. GPS sleeps
          completely outside the active hours and while paused.
        </p>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.geofenceEnabled}
            onChange={(event) => void updateSettings({ geofenceEnabled: event.target.checked })}
          />
          <span>Place tracking (background service)</span>
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.trackingPaused}
            onChange={(event) => void updateSettings({ trackingPaused: event.target.checked })}
          />
          <span>Paused — no location checks now</span>
        </label>
        <fieldset className="segment" role="group" aria-label="Tracking interval">
          <legend className="sr-only">Tracking interval</legend>
          {TRACKING_INTERVAL_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={settings.trackingIntervalMin === option ? "is-active" : undefined}
              onClick={() => void updateSettings({ trackingIntervalMin: option })}
            >
              {option} min
            </button>
          ))}
        </fieldset>
        <p className="muted">Arrivals are checked at most this often.</p>
        <div className="row wrap">
          <label className="field">
            <span>Active from</span>
            <input
              type="time"
              value={settings.activeStart}
              onChange={(event) => void updateSettings({ activeStart: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Active until</span>
            <input
              type="time"
              value={settings.activeEnd}
              onChange={(event) => void updateSettings({ activeEnd: event.target.value })}
            />
          </label>
        </div>
        <p className="muted">
          Outside this window tracking is switched off entirely. A window may wrap midnight, e.g.
          22:00–06:00 covers the evening and the early morning.
        </p>
        {isNativePlatform() ? (
          <div className="row">
            <button type="button" className="btn btn-ghost" onClick={() => void openLocationSettings()}>
              Open Android location settings
            </button>
          </div>
        ) : null}
        {isNativePlatform() ? (
          <p className="muted">
            Background reminders need the "Allow all the time" location permission — grant it from
            the system settings if arrivals go unnoticed.
          </p>
        ) : null}
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.demoLocationMode}
            onChange={(event) => void updateSettings({ demoLocationMode: event.target.checked })}
          />
          <span>Demo location (testable transitions)</span>
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.attachPlaceLabels}
            onChange={(event) => void updateSettings({ attachPlaceLabels: event.target.checked })}
          />
          <span>Attach place names to new clips</span>
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.showExactLocation}
            onChange={(event) => void updateSettings({ showExactLocation: event.target.checked })}
          />
          <span>Show exact coordinates (off by default)</span>
        </label>
        <p className="muted">
          Now: {currentPlace?.name ?? "not at any place"}
          {settings.showExactLocation && settings.mockedLocation
            ? ` · ${settings.mockedLocation.lat.toFixed(4)}, ${settings.mockedLocation.lng.toFixed(4)}`
            : ""}
        </p>
        <div className="row wrap">
          <button type="button" className="btn btn-ghost" onClick={() => void setMockedLocation(DEMO_PLACES[0])}>
            Arrive home
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void setMockedLocation(DEMO_OUTSIDE)}>
            Leave home
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void setMockedLocation(DEMO_PLACES[1])}>
            Arrive at café
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void setMockedLocation(DEMO_PLACES[2])}>
            Arrive at work
          </button>
        </div>
        <ul className="place-list">
          {places.map((place) => (
            <li key={place.id}>
              <div>
                <strong>{place.name}</strong>
                <span>
                  {place.kind === "home" ? "Home" : "Custom place"} · about {place.radiusM} m
                </span>
                {settings.showExactLocation ? (
                  <span className="muted">
                    {place.lat.toFixed(4)}, {place.lng.toFixed(4)}
                  </span>
                ) : null}
              </div>
              {place.kind !== "home" ? (
                <button type="button" className="text-btn" onClick={() => void removePlace(place.id)}>
                  Delete
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="row">
          <label className="field grow">
            <span>New place (from demo point)</span>
            <input value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder="Name" />
          </label>
          <label className="field">
            <span>Radius (m)</span>
            <input
              type="number"
              min={30}
              max={500}
              value={draftRadius}
              onChange={(event) => setDraftRadius(Number(event.target.value))}
            />
          </label>
        </div>
        <div className="row">
          <button type="button" className="btn btn-ghost" onClick={() => void saveCurrentAsPlace()}>
            Save place
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void resetDemoPlaces()}>
            Restore example places
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Permissions and privacy</h2>
        <ul className="kv">
          <li>
            <span>Camera</span>
            <strong>{labelPermission(camera, support.getUserMedia)}</strong>
          </li>
          <li>
            <span>Location</span>
            <strong>{labelPermission(location, "geolocation" in navigator)}</strong>
          </li>
          <li>
            <span>MediaRecorder</span>
            <strong>{support.mediaRecorder ? "Supported" : "Not supported"}</strong>
          </li>
        </ul>
        <p>
          Filmit never uploads clips, location or identifiers to a server. Videos live in the app's
          private storage — they never appear in the phone gallery and leave the device only when
          you share or export them. The map is drawn locally from your own data.
        </p>
      </section>

    </section>
  );
}

function labelPermission(state: string, supported: boolean): string {
  if (!supported) return "Not supported";
  if (state === "granted") return "Allowed";
  if (state === "denied") return "Denied";
  return "Not asked";
}
