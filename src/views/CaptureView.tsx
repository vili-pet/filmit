import { useEffect, useRef, useState } from "react";
import { ProgressRing } from "../components/ProgressRing";
import { usePermissions } from "../hooks/usePermissions";
import {
  blobFromVideoFile,
  inspectCameraSupport,
  permissionErrorMessage,
  recordStream,
  requestCameraStream,
  stopStream,
} from "../lib/media";
import { CLIP_DURATION_MS } from "../lib/types";
import { useApp, useProgress } from "../hooks/useApp";
import type { Route } from "../lib/route";

type Phase = "idle" | "live" | "recording" | "preview" | "error";

export function CaptureView({ onNavigate }: { onNavigate: (route: Route) => void }) {
  const { saveClip, currentPlace, settings } = useApp();
  const { streak, progress } = useProgress();
  const { support } = usePermissions();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [preview, setPreview] = useState<{ blob: Blob; url: string; durationMs: number } | null>(
    null,
  );
  const cameraOk = support.getUserMedia && support.mediaRecorder;

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      stopStream(streamRef.current);
      if (preview?.url) URL.revokeObjectURL(preview.url);
    };
    // preview cleanup handled when replaced
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const attachStream = async () => {
    setError(null);
    try {
      const stream = await requestCameraStream();
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPhase("live");
    } catch (cause) {
      setError(permissionErrorMessage(cause));
      setPhase("error");
    }
  };

  const startRecording = async () => {
    if (!streamRef.current) return;
    setElapsed(0);
    setPhase("recording");
    const abort = new AbortController();
    abortRef.current = abort;
    try {
      const blob = await recordStream(streamRef.current, {
        durationMs: CLIP_DURATION_MS,
        onTick: setElapsed,
        signal: abort.signal,
      });
      stopStream(streamRef.current);
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      const url = URL.createObjectURL(blob);
      setPreview({ blob, url, durationMs: CLIP_DURATION_MS });
      setPhase("preview");
    } catch (cause) {
      setError(permissionErrorMessage(cause));
      setPhase("error");
    }
  };

  const resetToLive = async () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
    setElapsed(0);
    await attachStream();
  };

  const save = async () => {
    if (!preview) return;
    await saveClip({
      blob: preview.blob,
      mimeType: preview.blob.type,
      durationMs: preview.durationMs,
      source: "camera",
    });
    if (preview.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
    setPhase("idle");
    onNavigate({ view: "home" });
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const blob = await blobFromVideoFile(file);
      const durationMs = await readDuration(blob);
      await saveClip({
        blob,
        mimeType: blob.type,
        durationMs,
        source: "import",
      });
      setPhase("idle");
      setError(null);
      onNavigate({ view: "home" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Import failed.");
      setPhase("error");
    }
  };

  const remaining = Math.max(0, Math.ceil((CLIP_DURATION_MS - elapsed) / 1000));

  return (
    <section className="view capture-view">
      <header className="view-header">
        <p className="kicker">Today's Film</p>
        <h1>Capture Your Film</h1>
        <div className="stat-row">
          <span className="chip">{streak.current} day streak</span>
          <span className="chip">Level {progress.level}</span>
          {currentPlace ? <span className="chip">{currentPlace.name}</span> : null}
        </div>
      </header>

      <div className="viewfinder">
        <video ref={videoRef} className={phase === "preview" ? "is-hidden" : undefined} muted playsInline />
        {phase === "preview" && preview ? (
          <video src={preview.url} controls playsInline className="preview-video" />
        ) : null}
        {phase === "idle" || phase === "error" ? (
          <div className="viewfinder-idle">
            <p className="viewfinder-mark">7s</p>
            <p>One small moment from your day. No ads, no account.</p>
          </div>
        ) : null}
        {phase === "recording" ? (
          <div className="record-overlay">
            <ProgressRing
              value={elapsed}
              max={CLIP_DURATION_MS}
              label={`${remaining}`}
            />
            <p aria-live="assertive">Recording · {remaining}s left</p>
          </div>
        ) : null}
      </div>

      {!cameraOk ? (
        <p className="callout" role="status">
          Camera or MediaRecorder is not supported here. Import a video file instead.
        </p>
      ) : null}
      {error ? (
        <p className="callout danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="capture-actions">
        {phase === "idle" || phase === "error" ? (
          <>
            <button type="button" className="btn btn-primary" onClick={() => void attachStream()} disabled={!cameraOk}>
              Open camera
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
              Import video
            </button>
          </>
        ) : null}
        {phase === "live" ? (
          <button type="button" className="shutter" onClick={() => void startRecording()}>
            Record
          </button>
        ) : null}
        {phase === "recording" ? (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              abortRef.current?.abort();
              stopStream(streamRef.current);
              streamRef.current = null;
              setPhase("idle");
            }}
          >
            Cancel
          </button>
        ) : null}
        {phase === "preview" ? (
          <>
            <button type="button" className="btn btn-primary" onClick={() => void save()}>
              Save
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => void resetToLive()}>
              Retake
            </button>
          </>
        ) : null}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="video/*"
        className="sr-only"
        onChange={(event) => void importFile(event.target.files?.[0])}
      />

      <aside className="note">
        <p>
          Keep the app open while recording. Permissions: camera and optionally microphone. All
          clips stay in the app's private storage — they never appear in the phone gallery.
        </p>
        {settings.demoDataEnabled ? <p>Demo data is on — your own recordings are marked separately.</p> : null}
        {!inspectCameraSupport().mediaRecorder ? (
          <p>MediaRecorder is missing; only import is available.</p>
        ) : null}
      </aside>
    </section>
  );
}

async function readDuration(blob: Blob): Promise<number> {
  const url = URL.createObjectURL(blob);
  const video = document.createElement("video");
  video.preload = "metadata";
  video.src = url;
  const duration = await new Promise<number>((resolve) => {
    video.onloadedmetadata = () => resolve(video.duration * 1000);
    video.onerror = () => resolve(CLIP_DURATION_MS);
  });
  URL.revokeObjectURL(url);
  return Number.isFinite(duration) && duration > 0 ? duration : CLIP_DURATION_MS;
}
