import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

const SHARE_DIR = "filmit-share";

export type ShareableVideo = {
  blob: Blob;
  /** File name including extension, e.g. "filmit-2026-11-03-x7f2.webm". */
  name: string;
};

export function videoExtension(mimeType: string): string {
  return mimeType.includes("mp4") ? "mp4" : "webm";
}

export function videoFileName(dateKey: string, id: string, mimeType: string): string {
  return `filmit-${dateKey}-${id}.${videoExtension(mimeType)}`;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Videon lukeminen epäonnistui."));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(blob);
  });
}

/** Removes leftovers from previous shares. */
async function clearShareDir(): Promise<void> {
  await Filesystem.rmdir({
    path: SHARE_DIR,
    directory: Directory.Cache,
    recursive: true,
  }).catch(() => undefined);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Shares videos through the Android share sheet (save to Drive, Files, etc.)
 * or downloads them on web. Blobs are written to disk one at a time so a
 * multi-clip share never holds several base64 copies in memory.
 *
 * Cleanup runs at the START of the next share, not after `Share.share()`
 * resolves — Android resolves that promise as soon as the sheet opens,
 * while the receiving app may still be reading the files.
 */
export async function shareVideos(items: ShareableVideo[]): Promise<void> {
  if (items.length === 0) return;
  if (!Capacitor.isNativePlatform()) {
    for (const item of items) downloadBlob(item.blob, item.name);
    return;
  }
  await clearShareDir();
  const files: string[] = [];
  for (const item of items) {
    const base64 = await blobToBase64(item.blob);
    const written = await Filesystem.writeFile({
      path: `${SHARE_DIR}/${item.name}`,
      data: base64,
      directory: Directory.Cache,
      recursive: true,
      // No encoding: the plugin decodes base64 into binary video data.
    });
    files.push(written.uri);
  }
  await Share.share({
    title: items.length === 1 ? "Filmit — jaettava video" : `Filmit — ${items.length} videota`,
    files,
  }).catch(() => undefined);
}
