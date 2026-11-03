import { AppHeader } from "./components/AppHeader";
import { BottomNav } from "./components/BottomNav";
import { Overlays } from "./components/Overlays";
import { useHashRoute } from "./hooks/useHashRoute";
import { useTheme } from "./hooks/useTheme";
import { useApp } from "./hooks/useApp";
import { AppProvider } from "./state/AppState";
import { CaptureView } from "./views/CaptureView";
import { HomeView } from "./views/HomeView";
import { MapView } from "./views/MapView";
import { MemoriesView } from "./views/MemoriesView";
import { MontagesView } from "./views/MontagesView";
import { SettingsView } from "./views/SettingsView";

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

function Shell() {
  const { ready, settings } = useApp();
  const { route, navigate } = useHashRoute();
  useTheme(settings.theme);

  return (
    <div className="app-frame">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="app-shell">
        {settings.demoDataEnabled ? (
          <p className="demo-banner" role="status">
            Demo data is visible. It is marked and can be removed in Settings.
          </p>
        ) : null}
        <AppHeader route={route} onNavigate={navigate} />
        <main id="main">
          {!ready ? (
            <p className="loading">Opening your diary…</p>
          ) : route.view === "home" ? (
            <HomeView onNavigate={navigate} />
          ) : route.view === "capture" ? (
            <CaptureView onNavigate={navigate} />
          ) : route.view === "map" ? (
            <MapView onNavigate={navigate} />
          ) : route.view === "memories" ? (
            <MemoriesView route={route} onNavigate={navigate} />
          ) : route.view === "montages" ? (
            <MontagesView />
          ) : (
            <SettingsView />
          )}
        </main>
        <BottomNav route={route} onNavigate={navigate} />
      </div>
      <Overlays onNavigate={navigate} />
    </div>
  );
}
