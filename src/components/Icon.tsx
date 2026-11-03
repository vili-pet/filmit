type IconName =
  | "home"
  | "timeline"
  | "montages"
  | "gear"
  | "video"
  | "video-off"
  | "plus"
  | "play"
  | "lock"
  | "hourglass"
  | "flame"
  | "trophy"
  | "bolt"
  | "calendar"
  | "map"
  | "close";

const STROKE_PATHS: Partial<Record<IconName, string>> = {
  home: "M4 11.2 12 4.5l8 6.7M6 9.9V19a1 1 0 0 0 1 1h3.4v-5.2h3.2V20H17a1 1 0 0 0 1-1V9.9",
  timeline:
    "M4 4h6.4v6.4H4zM13.6 4H20v6.4h-6.4zM4 13.6h6.4V20H4zM13.6 13.6H20V20h-6.4z",
  montages: "M3.5 6.5h13.5a1.5 1.5 0 0 1 1.5 1.5v9.5a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5V6.5ZM7 3.5v3M11 3.5v3M15 3.5v3M7 16v4M11 16v4M15 16v4M3.5 10h15M3.5 13.5h15",
  gear: "M12 9.2a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6Zm8 2.8-.1-1.2 1.6-1.5-1.5-2.6-2.1.6-1-.7-.4-2.1h-3l-.4 2.1-1 .7-2.1-.6-1.5 2.6L6 10.8l-.1 1.2.1 1.2-1.6 1.5 1.5 2.6 2.1-.6 1 .7.4 2.1h3l.4-2.1 1-.7 2.1.6 1.5-2.6-1.6-1.5.1-1.2Z",
  video:
    "M3.5 7.8A1.8 1.8 0 0 1 5.3 6h8.4A1.8 1.8 0 0 1 15.5 7.8v8.4a1.8 1.8 0 0 1-1.8 1.8H5.3a1.8 1.8 0 0 1-1.8-1.8V7.8ZM15.5 10.5l4.2-2.6a.6.6 0 0 1 .9.5v7.2a.6.6 0 0 1-.9.5l-4.2-2.6v-3Z",
  "video-off":
    "M3.5 7.8A1.8 1.8 0 0 1 5.3 6h8.4A1.8 1.8 0 0 1 15.5 7.8v8.4a1.8 1.8 0 0 1-1.8 1.8H5.3a1.8 1.8 0 0 1-1.8-1.8V7.8ZM15.5 10.5l4.2-2.6a.6.6 0 0 1 .9.5v7.2a.6.6 0 0 1-.9.5l-4.2-2.6M4 20 20 4",
  plus: "M12 5.5v13M5.5 12h13",
  lock: "M7 11h10a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 17 20H7a1.5 1.5 0 0 1-1.5-1.5v-6A1.5 1.5 0 0 1 7 11Zm2.2 0V8.2a2.8 2.8 0 0 1 5.6 0V11",
  hourglass:
    "M6.5 3.5h11M6.5 20.5h11M7.5 3.5v3.2c0 2 1.5 3.2 3 4.3 1.5 1.1 3 2.3 3 4.3v5.2M16.5 3.5v3.2c0 2-1.5 3.2-3 4.3-1.5 1.1-3 2.3-3 4.3v5.2",
  calendar:
    "M5 6h14a1.5 1.5 0 0 1 1.5 1.5V19A1.5 1.5 0 0 1 19 20.5H5A1.5 1.5 0 0 1 3.5 19V7.5A1.5 1.5 0 0 1 5 6Zm2.5-2.5V6m9-2.5V6M3.5 10.5h17",
  map: "M12 20.5C9.3 17.9 6 14.6 6 11a6 6 0 1 1 12 0c0 3.6-3.3 6.9-6 9.5ZM14.2 11a2.2 2.2 0 1 1-4.4 0 2.2 2.2 0 0 1 4.4 0Z",
  close: "M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5",
};

const FILL_PATHS: Partial<Record<IconName, string>> = {
  play: "M8.5 5.9a.7.7 0 0 1 1.06-.6l9.2 5.6a.7.7 0 0 1 0 1.2l-9.2 5.6a.7.7 0 0 1-1.06-.6V5.9Z",
  flame:
    "M12 3.5c.6 2.3 2 3.6 3.4 5 1.4 1.5 2.6 3 2.6 5.3A6 6 0 0 1 6 13.8c0-1.7.8-3 1.8-4.2.3.9.9 1.5 1.7 1.7-.4-2.9.8-5.8 2.5-7.8Z",
  trophy:
    "M7 4.5h10v3a5 5 0 0 1-10 0v-3ZM7 5.5H4.5v1.8A3.2 3.2 0 0 0 7.4 10.5M17 5.5h2.5v1.8a3.2 3.2 0 0 1-2.9 3.2M12 12.5v3.5m-3.5 4h7m-5.5-4h4a1.5 1.5 0 0 1 1.5 1.5V20H8.5v-2.5a1.5 1.5 0 0 1 1.5-1.5Z",
  bolt: "M13.2 3.5 6 13.4h4.6L10 20.5l7.5-10.2h-4.8l.5-6.8Z",
};

export function Icon({ name, label }: { name: IconName; label?: string }) {
  const strokePath = STROKE_PATHS[name];
  const fillPath = FILL_PATHS[name];
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className="icon"
    >
      {strokePath ? (
        <path
          d={strokePath}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {fillPath ? <path d={fillPath} fill="currentColor" /> : null}
    </svg>
  );
}

export type { IconName };
