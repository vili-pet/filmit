import { CLIP_DURATION_MS } from "./types";

const MIME_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4",
];

export type CameraSupport = {
  mediaDevices: boolean;
  getUserMedia: boolean;
  mediaRecorder: boolean;
  preferredMimeType: string | null;
};

export function inspectCameraSupport(): CameraSupport {
  const mediaDevices = typeof navigator !== "undefined" && !!navigator.mediaDevices;
  const getUserMedia = mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function";
  const mediaRecorder = typeof MediaRecorder !== "undefined";
  return {
    mediaDevices,
    getUserMedia,
    mediaRecorder,
    preferredMimeType: mediaRecorder ? pickRecorderMimeType() : null,
  };
}

export function pickRecorderMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const candidate of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return "";
}

export async function requestCameraStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: true,
    video: {
      facingMode: { ideal: "user" },
      width: { ideal: 720 },
      height: { ideal: 1280 },
    },
  });
}

export function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

export function recordStream(
  stream: MediaStream,
  options: {
    durationMs?: number;
    mimeType?: string | null;
    onTick?: (elapsedMs: number) => void;
    signal?: AbortSignal;
  } = {},
): Promise<Blob> {
  const durationMs = options.durationMs ?? CLIP_DURATION_MS;
  const mimeType = options.mimeType ?? pickRecorderMimeType();
  if (typeof MediaRecorder === "undefined") {
    return Promise.reject(new Error("MediaRecorder ei ole tuettu tässä selaimessa."));
  }

  const recorder = mimeType
    ? new MediaRecorder(stream, { mimeType })
    : new MediaRecorder(stream);
  const chunks: BlobPart[] = [];

  return new Promise((resolve, reject) => {
    let startedAt = 0;
    let frame = 0;

    const tick = (now: number) => {
      if (!startedAt) startedAt = now;
      const elapsed = now - startedAt;
      options.onTick?.(Math.min(elapsed, durationMs));
      if (elapsed >= durationMs) {
        if (recorder.state === "recording") recorder.stop();
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = () => reject(new Error("Tallennus keskeytyi."));
    recorder.onstop = () => {
      cancelAnimationFrame(frame);
      const type = recorder.mimeType || mimeType || "video/webm";
      const blob = new Blob(chunks, { type });
      if (blob.size === 0) {
        reject(new Error("Tallenne jäi tyhjäksi. Kokeile tuoda video tiedostona."));
        return;
      }
      resolve(blob);
    };

    const abort = () => {
      cancelAnimationFrame(frame);
      if (recorder.state === "recording") recorder.stop();
    };

    options.signal?.addEventListener("abort", abort, { once: true });
    recorder.start(250);
    frame = requestAnimationFrame(tick);
  });
}

export async function blobFromVideoFile(file: File): Promise<Blob> {
  if (!file.type.startsWith("video/")) {
    throw new Error("Valitse videotiedosto.");
  }
  return file.slice(0, file.size, file.type || "video/mp4");
}

export async function generatePlaceholderBlob(hue: number, label: string): Promise<Blob | null> {
  if (typeof document === "undefined" || typeof MediaRecorder === "undefined") {
    return null;
  }
  const mimeType = pickRecorderMimeType();
  if (mimeType === null) return null;

  const canvas = document.createElement("canvas");
  canvas.width = 360;
  canvas.height = 640;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const stream = canvas.captureStream(24);
  const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  const chunks: BlobPart[] = [];
  const durationMs = 1600;
  const started = performance.now();

  const draw = (now: number) => {
    const t = (now - started) / durationMs;
    ctx.fillStyle = `hsl(${hue} 38% ${28 + t * 8}%)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255,253,248,0.92)";
    ctx.font = "600 28px Figtree, sans-serif";
    ctx.fillText("Filmit", 28, 80);
    ctx.font = "500 22px Fraunces, serif";
    ctx.fillText(label, 28, 130);
    if (now - started < durationMs && recorder.state === "recording") {
      requestAnimationFrame(draw);
    } else if (recorder.state === "recording") {
      recorder.stop();
    }
  };

  return new Promise((resolve) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || "video/webm" });
      resolve(blob.size > 0 ? blob : null);
    };
    recorder.start();
    requestAnimationFrame(draw);
  });
}

export type MontageComposeResult =
  | { status: "encoded"; blob: Blob; mimeType: string }
  | { status: "preview-only"; reason: string };

export async function composeMontage(
  clips: ClipLike[],
  onProgress?: (ratio: number) => void,
): Promise<MontageComposeResult> {
  const usable = clips.filter((clip) => clip.blob.size > 0);
  if (usable.length === 0) {
    return {
      status: "preview-only",
      reason: "Ei koodattavia videotiedostoja. Kooste voidaan silti toistaa peräkkäin.",
    };
  }
  if (typeof MediaRecorder === "undefined" || typeof document === "undefined") {
    return {
      status: "preview-only",
      reason: "MediaRecorder ei ole käytettävissä. Käytä peräkkäistä esikatselua tai ffmpeg.wasm-laajennusta.",
    };
  }

  const mimeType = pickRecorderMimeType();
  const canvas = document.createElement("canvas");
  canvas.width = 360;
  canvas.height = 640;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { status: "preview-only", reason: "Canvas-kontekstia ei saatu." };
  }

  let canvasStream: MediaStream;
  try {
    canvasStream = canvas.captureStream(24);
  } catch {
    return {
      status: "preview-only",
      reason: "Selain ei tue canvas.captureStream-koodausta.",
    };
  }

  let recorder: MediaRecorder;
  try {
    recorder = mimeType ? new MediaRecorder(canvasStream, { mimeType }) : new MediaRecorder(canvasStream);
  } catch {
    return {
      status: "preview-only",
      reason: "MediaRecorder ei hyväksynyt valittua videoformaattia.",
    };
  }

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const stopped = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      const type = recorder.mimeType || mimeType || "video/webm";
      const blob = new Blob(chunks, { type });
      resolve(blob);
    };
    recorder.onerror = () => reject(new Error("Koosteen koodaus keskeytyi."));
  });

  try {
    recorder.start(200);
    for (const [index, clip] of usable.entries()) {
      onProgress?.(index / usable.length);
      await paintClipToCanvas(clip.blob, ctx, canvas);
      onProgress?.((index + 1) / usable.length);
    }
    if (recorder.state === "recording") recorder.stop();
    const blob = await stopped;
    canvasStream.getTracks().forEach((track) => track.stop());
    if (blob.size === 0) {
      return {
        status: "preview-only",
        reason: "Koodaus tuotti tyhjän tiedoston. Peräkkäinen esikatselu on käytettävissä.",
      };
    }
    return { status: "encoded", blob, mimeType: blob.type };
  } catch (error) {
    if (recorder.state === "recording") recorder.stop();
    canvasStream.getTracks().forEach((track) => track.stop());
    return {
      status: "preview-only",
      reason:
        error instanceof Error
          ? error.message
          : "Koodaus epäonnistui. Kooste toistetaan peräkkäin.",
    };
  }
}

type ClipLike = { blob: Blob };

async function paintClipToCanvas(
  blob: Blob,
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
): Promise<void> {
  const url = URL.createObjectURL(blob);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.src = url;

  try {
    await video.play();
  } catch {
    URL.revokeObjectURL(url);
    throw new Error("Klipin toisto epäonnistui koostettaessa.");
  }

  await new Promise<void>((resolve) => {
    const draw = () => {
      ctx.fillStyle = "#161310";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const scale = Math.max(canvas.width / video.videoWidth || canvas.width, canvas.height / (video.videoHeight || canvas.height));
      const w = (video.videoWidth || canvas.width) * scale;
      const h = (video.videoHeight || canvas.height) * scale;
      ctx.drawImage(video, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      if (video.ended || video.paused) {
        resolve();
        return;
      }
      requestAnimationFrame(draw);
    };
    video.onended = () => resolve();
    draw();
  });

  URL.revokeObjectURL(url);
}

export function permissionErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      return "Kameran käyttö evättiin. Voit silti tuoda videon tiedostona.";
    }
    if (error.name === "NotFoundError") {
      return "Kameraa ei löytynyt. Tuo video tiedostona.";
    }
    if (error.name === "NotReadableError") {
      return "Kamera on varattu toisessa sovelluksessa.";
    }
  }
  if (error instanceof Error) return error.message;
  return "Kameran avaaminen epäonnistui.";
}
