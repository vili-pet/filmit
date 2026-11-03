import { useMemo, useState } from "react";
import { ClipCard } from "../components/ClipCard";
import { EmptyState } from "../components/EmptyState";
import { Icon } from "../components/Icon";
import { VideoThumb } from "../components/VideoThumb";
import {
  formatCardDateEN,
  formatMonthHeadingEN,
  groupClipsByDate,
  groupClipsByMonth,
} from "../lib/dates";
import { shareVideos, videoFileName } from "../lib/share";
import type { Clip } from "../lib/types";
import type { Route } from "../lib/route";
import { useApp } from "../hooks/useApp";

export function MemoriesView({
  route,
  onNavigate,
}: {
  route: Extract<Route, { view: "memories" }>;
  onNavigate: (route: Route) => void;
}) {
  const { clips, removeClip } = useApp();
  const [openDay, setOpenDay] = useState<string | null>(route.dateKey ?? null);
  const [sharingDay, setSharingDay] = useState<string | null>(null);

  const months = useMemo(() => groupClipsByMonth(clips), [clips]);
  const groups = useMemo(() => groupClipsByDate(clips), [clips]);

  const shareDay = async (dayClips: Clip[]) => {
    const dateKey = dayClips[0]?.dateKey;
    if (!dateKey || sharingDay) return;
    setSharingDay(dateKey);
    try {
      await shareVideos(
        dayClips
          .filter((clip) => clip.blob.size > 0)
          .map((clip) => ({
            blob: clip.blob,
            name: videoFileName(clip.dateKey, clip.id, clip.mimeType),
          })),
      );
    } catch (cause) {
      alert(cause instanceof Error ? cause.message : "Jakaminen epäonnistui.");
    } finally {
      setSharingDay(null);
    }
  };

  if (clips.length === 0) {
    return (
      <section className="view timeline-view">
        <header className="view-header">
          <h1>Your Timeline</h1>
          <p className="lede">Your daily Films, beautifully organized</p>
        </header>
        <EmptyState
          title="No Films yet"
          body="Capture your first 7-second moment and it will show up here."
          action={{ label: "Capture a Film", onClick: () => onNavigate({ view: "capture" }) }}
        />
      </section>
    );
  }

  return (
    <section className="view timeline-view">
      <header className="view-header">
        <h1>Your Timeline</h1>
        <p className="lede">Your daily Films, beautifully organized</p>
      </header>

      {months.map((month) => (
        <section key={month.key} className="month-group">
          <h2 className="month-heading">
            <Icon name="calendar" />
            <span>{formatMonthHeadingEN(month.year, month.month)}</span>
          </h2>
          <div className="day-grid">
            {[...new Set(month.clips.map((clip) => clip.dateKey))].map((dateKey) => {
              const dayClips = month.clips.filter((clip) => clip.dateKey === dateKey);
              return (
                <button
                  key={dateKey}
                  type="button"
                  className={openDay === dateKey ? "day-card is-open" : "day-card"}
                  onClick={() => setOpenDay(openDay === dateKey ? null : dateKey)}
                >
                  <span className="day-card-media">
                    <VideoThumb clip={dayClips[0]} />
                    <span className="day-card-play">
                      <Icon name="play" />
                    </span>
                    {dayClips.length > 1 ? (
                      <span className="day-card-count">×{dayClips.length}</span>
                    ) : null}
                  </span>
                  <span className="day-card-caption">{formatCardDateEN(dateKey)}</span>
                </button>
              );
            })}
          </div>
          {openDay && month.clips.some((clip) => clip.dateKey === openDay) ? (
            <DayDetail
              dateKey={openDay}
              dayClips={groups.get(openDay) ?? []}
              sharing={sharingDay === openDay}
              onShare={() => void shareDay(groups.get(openDay) ?? [])}
              onDelete={(id) => void removeClip(id)}
            />
          ) : null}
        </section>
      ))}
    </section>
  );
}

function DayDetail({
  dateKey,
  dayClips,
  sharing,
  onShare,
  onDelete,
}: {
  dateKey: string;
  dayClips: Clip[];
  sharing: boolean;
  onShare: () => void;
  onDelete: (id: string) => void;
}) {
  const shareable = dayClips.filter((clip) => clip.blob.size > 0).length;
  return (
    <div className="day-detail">
      <div className="day-detail-head">
        <h3>{formatCardDateEN(dateKey)}</h3>
        {shareable > 0 ? (
          <button type="button" className="text-btn" disabled={sharing} onClick={onShare}>
            {sharing ? "Preparing…" : `Share day's films (${shareable})`}
          </button>
        ) : null}
      </div>
      <div className="clip-grid">
        {dayClips.map((clip) => (
          <ClipCard key={clip.id} clip={clip} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}
