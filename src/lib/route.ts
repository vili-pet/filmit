export type MemoriesMode = "list" | "calendar";
export type View = "home" | "capture" | "memories" | "montages" | "map" | "settings";

export type Route =
  | { view: "home" }
  | { view: "capture" }
  | { view: "memories"; mode: MemoriesMode; dateKey?: string }
  | { view: "montages" }
  | { view: "map" }
  | { view: "settings" };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, "").replace(/^\//, "");
  const [head, ...rest] = path.split("/").filter(Boolean);
  if (head === "koti" || head === "home") return { view: "home" };
  if (head === "kuvaa" || head === "capture") return { view: "capture" };
  if (head === "kartta" || head === "map") return { view: "map" };
  if (head === "muistot") {
    const mode = rest[0] === "kalenteri" ? "calendar" : "list";
    const dateKey = rest[0] === "kalenteri" ? rest[1] : rest[0];
    return {
      view: "memories",
      mode,
      dateKey: dateKey && /^\d{4}-\d{2}-\d{2}$/.test(dateKey) ? dateKey : undefined,
    };
  }
  if (head === "koosteet") return { view: "montages" };
  if (head === "asetukset") return { view: "settings" };
  return { view: "home" };
}

export function toHash(route: Route): string {
  if (route.view === "home") return "#/koti";
  if (route.view === "capture") return "#/kuvaa";
  if (route.view === "memories") {
    const mode = route.mode === "calendar" ? "kalenteri" : "";
    const parts = ["muistot", mode, route.dateKey].filter(Boolean);
    return `#/${parts.join("/")}`;
  }
  if (route.view === "montages") return "#/koosteet";
  if (route.view === "map") return "#/kartta";
  if (route.view === "settings") return "#/asetukset";
  return "#/koti";
}
