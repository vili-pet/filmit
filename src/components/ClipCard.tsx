import { useRef, useState } from "react";
import { useObjectUrl } from "../hooks/useObjectUrl";
import { formatTime } from "../lib/dates";
import { shareVideos, videoFileName } from "../lib/share";
import type { Clip } from "../lib/types";

export function ClipCard({
  clip,
  onDelete,
}: {
  clip: Clip;
  onDelete?: (id: string) => void;
}) {
  const url = useObjectUrl(clip.blob);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    if (sharing || clip.blob.size === 0) return;
    setSharing(true);
    try {
      await shareVideos([
        {
          blob: clip.blob,
          name: videoFileName(clip.dateKey, clip.id, clip.mimeType),
        },
      ]);
    } catch (cause) {
      alert(cause instanceof Error ? cause.message : "Jakaminen epäonnistui.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <article className={clip.isDemo ? "clip-card is-demo" : "clip-card"}>
      <div className="clip-media">
        {url && clip.blob.size > 0 ? (
          <video
            ref={videoRef}
            src={url}
            playsInline
            preload="metadata"
            onEnded={() => setPlaying(false)}
          />
        ) : (
          <div
            className="clip-placeholder"
            style={{ background: `hsl(${clip.placeholderHue ?? 205} 42% 44%)` }}
          >
            <span>Preview</span>
          </div>
        )}
        <button
          type="button"
          className="play-btn"
          onClick={() => {
            const video = videoRef.current;
            if (!video) return;
            if (video.paused) {
              void video.play();
              setPlaying(true);
            } else {
              video.pause();
              setPlaying(false);
            }
          }}
        >
          {playing ? "Pause" : "Play"}
        </button>
      </div>
      <div className="clip-meta">
        <p className="clip-time">{formatTime(clip.createdAt)}</p>
        <p className="clip-place">{clip.placeLabel ?? "No place"}</p>
        {clip.isDemo ? <p className="demo-pill">Demo</p> : null}
        <p className="clip-source">
          {clip.source === "camera" ? "Camera" : clip.source === "import" ? "Imported" : "Demo"}
        </p>
      </div>
      {clip.blob.size > 0 ? (
        <button type="button" className="text-btn" disabled={sharing} onClick={() => void handleShare()}>
          {sharing ? "Preparing…" : "Save / share"}
        </button>
      ) : null}
      {onDelete ? (
        <button type="button" className="text-btn" onClick={() => onDelete(clip.id)}>
          Delete
        </button>
      ) : null}
    </article>
  );
}
