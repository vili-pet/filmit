import { addDays, toDateKey } from "./dates";
import { DEMO_PLACES } from "./geofence";
import { generatePlaceholderBlob } from "./media";
import { createId } from "./id";
import type { Clip } from "./types";

const DEMO_DAYS: { offset: number; placeLabel: string; placeId: string; hue: number; label: string }[] =
  [
    { offset: 0, placeLabel: "Koti", placeId: "place_home", hue: 24, label: "Aamuikkuna" },
    { offset: -1, placeLabel: "Kahvila", placeId: "place_cafe", hue: 18, label: "Latte" },
    { offset: -2, placeLabel: "Työ", placeId: "place_work", hue: 210, label: "Käytävä" },
    { offset: -3, placeLabel: "Koti", placeId: "place_home", hue: 32, label: "Keittiö" },
    { offset: -5, placeLabel: "Kahvila", placeId: "place_cafe", hue: 12, label: "Iltavalo" },
    { offset: -6, placeLabel: "Koti", placeId: "place_home", hue: 28, label: "Kirja" },
    { offset: -8, placeLabel: "Työ", placeId: "place_work", hue: 200, label: "Pöytä" },
    { offset: -10, placeLabel: "Koti", placeId: "place_home", hue: 36, label: "Sade" },
  ];

export function buildDemoClipMetadata(now = new Date()): Omit<Clip, "blob" | "mimeType">[] {
  return DEMO_DAYS.map((item, index) => {
    const created = addDays(now, item.offset);
    created.setHours(8 + (index % 5), 12 + index, 0, 0);
    const place = DEMO_PLACES.find((candidate) => candidate.id === item.placeId);
    return {
      id: `demo_${item.offset}_${index}`,
      createdAt: created.getTime(),
      dateKey: toDateKey(created),
      durationMs: 1600,
      placeId: item.placeId,
      placeLabel: item.placeLabel,
      coord: place ? { lat: place.lat, lng: place.lng } : undefined,
      source: "demo" as const,
      isDemo: true,
      placeholderHue: item.hue,
    };
  });
}

export async function createDemoClips(now = new Date()): Promise<Clip[]> {
  const meta = buildDemoClipMetadata(now);
  const clips: Clip[] = [];
  for (const item of meta) {
    const label = DEMO_DAYS.find((day) => `demo_${day.offset}_${DEMO_DAYS.indexOf(day)}` === item.id)?.label ?? "Demo";
    const blob = await generatePlaceholderBlob(item.placeholderHue ?? 24, label);
    clips.push({
      ...item,
      blob: blob ?? new Blob(),
      mimeType: blob?.type ?? "application/octet-stream",
    });
  }
  return clips;
}

export function createIdSafe(): string {
  return createId("clip");
}
