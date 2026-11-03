import { Capacitor } from "@capacitor/core";
import type { Place } from "./types";

const CHANNEL_ID = "arrival";
let nextNotificationId = 1;

/**
 * The LocalNotifications bridge is taken from Capacitor's injected global
 * instead of the npm module: in release builds the module's dynamic-import
 * chunk never resolves inside the Android WebView, while the natively
 * registered global works. Only used on native, where the global exists.
 */
type NotificationPermissionState = { display: "granted" | "denied" | "prompt" };

type LocalNotificationsBridge = {
  checkPermissions(): Promise<NotificationPermissionState>;
  requestPermissions(): Promise<NotificationPermissionState>;
  createChannel(options: {
    id: string;
    name: string;
    importance: number;
    visibility: number;
  }): Promise<void>;
  schedule(options: {
    notifications: Array<{
      id: number;
      channelId: string;
      title: string;
      body: string;
      schedule: { at: Date; allowWhileIdle?: boolean };
    }>;
  }): Promise<unknown>;
};

function bridge(): LocalNotificationsBridge | null {
  const plugins = (window as unknown as { Capacitor?: { Plugins?: Record<string, unknown> } })
    .Capacitor?.Plugins;
  const candidate = plugins?.LocalNotifications;
  return candidate ? (candidate as LocalNotificationsBridge) : null;
}

/**
 * Requests the Android 13+ notification permission and creates the arrival
 * channel. requestPermissions() runs unconditionally: when already granted it
 * resolves instantly, and it refreshes the plugin's native permission state
 * that schedule() checks again on its own.
 */
export async function ensureNotificationSetup(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const api = bridge();
  if (!api) return false;
  const requested = await api.requestPermissions().catch(() => null);
  if (!requested || requested.display !== "granted") return false;
  await api
    .createChannel({
      id: CHANNEL_ID,
      name: "Saapumismuistutukset",
      importance: 4, // Importance.HIGH
      visibility: 1, // Visibility.PRIVATE
    })
    .catch(() => undefined);
  return true;
}

/** Arrival reminder while the app is in the background. */
export async function notifyArrival(place: Place): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const api = bridge();
  if (!api) return;
  const status = await api.checkPermissions();
  if (status.display !== "granted") return;
  await api
    .schedule({
      notifications: [
        {
          id: nextNotificationId++,
          channelId: CHANNEL_ID,
          title: `Saavuit: ${place.name}`,
          body: "Tallenna 7 sekunnin filmi?",
          schedule: { at: new Date(Date.now() + 500), allowWhileIdle: true },
        },
      ],
    })
    .catch(() => undefined);
}
