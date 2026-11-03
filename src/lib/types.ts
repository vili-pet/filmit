export type ClipSource = "camera" | "import" | "demo";

export type Clip = {
  id: string;
  createdAt: number;
  dateKey: string;
  durationMs: number;
  blob: Blob;
  mimeType: string;
  placeId?: string;
  placeLabel?: string;
  /** Fix captured at recording time; used by the map and life timeline. */
  coord?: Coord;
  source: ClipSource;
  isDemo: boolean;
  /** Used when a real video blob could not be encoded (honest preview). */
  placeholderHue?: number;
};

export type PlaceKind = "home" | "custom";

export type Place = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusM: number;
  kind: PlaceKind;
};

export type Coord = {
  lat: number;
  lng: number;
};

export type ThemePreference = "system" | "light" | "dark";

export type Settings = {
  theme: ThemePreference;
  demoDataEnabled: boolean;
  /** Master switch for place tracking (background service on native). */
  geofenceEnabled: boolean;
  /** Manual pause — "day/night" switch. Overrides geofenceEnabled while set. */
  trackingPaused: boolean;
  /** Minutes between processed position fixes. */
  trackingIntervalMin: number;
  /** Active window "HH:MM" — GPS is fully off outside it. */
  activeStart: string;
  activeEnd: string;
  demoLocationMode: boolean;
  showExactLocation: boolean;
  attachPlaceLabels: boolean;
  mockedLocation: Coord | null;
};

export type AchievementId =
  | "first-snappit"
  | "streak-starter"
  | "week-keeper"
  | "ten-clips";

export type UnlockedAchievement = {
  id: AchievementId;
  unlockedAt: number;
};

export type MontageStatus = "encoded" | "preview-only";

export type Montage = {
  id: string;
  createdAt: number;
  title: string;
  startDateKey: string;
  endDateKey: string;
  clipIds: string[];
  status: MontageStatus;
  reason?: string;
  blob?: Blob;
  mimeType?: string;
};

export type DateRange = {
  startDateKey: string;
  endDateKey: string;
};

export type RangePreset = "week" | "month" | "year";

export type PermissionKind = "prompt" | "granted" | "denied" | "unsupported";

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  demoDataEnabled: false,
  geofenceEnabled: false,
  trackingPaused: false,
  trackingIntervalMin: 30,
  activeStart: "08:00",
  activeEnd: "22:00",
  demoLocationMode: false,
  showExactLocation: false,
  attachPlaceLabels: true,
  mockedLocation: null,
};

export const TRACKING_INTERVAL_OPTIONS = [15, 30, 60, 90] as const;

export const CLIP_DURATION_MS = 7_000;
