import { Icon, type IconName } from "./Icon";
import type { Route } from "../lib/route";

const ITEMS: { route: Route; label: string; icon: IconName }[] = [
  { route: { view: "home" }, label: "Home", icon: "home" },
  { route: { view: "map" }, label: "Map", icon: "map" },
  { route: { view: "memories", mode: "list" }, label: "Timeline", icon: "timeline" },
  { route: { view: "montages" }, label: "Montages", icon: "montages" },
];

export function BottomNav({
  route,
  onNavigate,
}: {
  route: Route;
  onNavigate: (route: Route) => void;
}) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {ITEMS.map((item) => {
        const active =
          item.route.view === "home"
            ? route.view === "home" || route.view === "capture"
            : item.route.view === route.view;
        return (
          <button
            key={item.label}
            type="button"
            className={active ? "nav-item is-active" : "nav-item"}
            aria-current={active ? "page" : undefined}
            onClick={() => onNavigate(item.route)}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
