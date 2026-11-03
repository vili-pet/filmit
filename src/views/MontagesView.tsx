import { useMemo, useState } from "react";
import { SequencePlayer } from "../components/SequencePlayer";
import { EmptyState } from "../components/EmptyState";
import { Icon } from "../components/Icon";
import { VideoThumb } from "../components/VideoThumb";
import { useObjectUrl } from "../hooks/useObjectUrl";
import { montagePlan, selectClipsInRange, summarizeMontage, weekNumber } from "../lib/montage";
import { shareVideos, videoExtension } from "../lib/share";
import {
  addDays,
  endOfMonth,
  endOfYear,
  formatMonthHeadingEN,
  startOfMonth,
  startOfWeek,
  startOfYear,
  toDateKey,
} from "../lib/dates";
import type { DateRange, RangePreset } from "../lib/types";
import { useApp } from "../hooks/useApp";

const MIN_CLIPS = 2;

type Period = { range: DateRange; label: string; current: boolean };

function periodsFor(preset: RangePreset, now: Date): Period[] {
  if (preset === "week") {
    return Array.from({ length: 4 }, (_, index) => {
      const anchor = addDays(startOfWeek(now), -7 * index);
      const range = {
        startDateKey: toDateKey(anchor),
        endDateKey: toDateKey(addDays(anchor, 6)),
      };
      return {
        range,
        current: index === 0,
        label: index === 0 ? "This Week" : `Week ${weekNumber(anchor)}, ${anchor.getFullYear()}`,
      };
    });
  }
  if (preset === "month") {
    return Array.from({ length: 4 }, (_, index) => {
      const anchor = new Date(now.getFullYear(), now.getMonth() - index, 1);
      const range = {
        startDateKey: toDateKey(startOfMonth(anchor)),
        endDateKey: toDateKey(endOfMonth(anchor)),
      };
      return {
        range,
        current: index === 0,
        label:
          index === 0
            ? "This Month"
            : formatMonthHeadingEN(anchor.getFullYear(), anchor.getMonth()),
      };
    });
  }
  return Array.from({ length: 2 }, (_, index) => {
    const anchor = new Date(now.getFullYear() - index, 0, 1);
    const range = {
      startDateKey: toDateKey(startOfYear(anchor)),
      endDateKey: toDateKey(endOfYear(anchor)),
    };
    return {
      range,
      current: index === 0,
      label: index === 0 ? "This Year" : `${anchor.getFullYear()}`,
    };
  });
}

const TABS: { id: RangePreset; label: string }[] = [
  { id: "week", label: "Weekly" },
  { id: "month", label: "Monthly" },
  { id: "year", label: "Yearly" },
];

export function MontagesView() {
  const { clips, montages, createMontage } = useApp();
  const [preset, setPreset] = useState<RangePreset>("week");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const now = new Date();

  const periods = useMemo(() => periodsFor(preset, now), [preset]); // eslint-disable-line react-hooks/exhaustive-deps
  const currentPlan = useMemo(() => montagePlan(clips, preset, now), [clips, preset]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async () => {
    setError(null);
    setBusy(true);
    setProgress(0.15);
    try {
      const tick = window.setInterval(() => {
        setProgress((value) => Math.min(0.9, value + 0.08));
      }, 240);
      await createMontage(preset);
      window.clearInterval(tick);
      setProgress(1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Creating the montage failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="view story-view">
      <header className="view-header">
        <h1>Your Story</h1>
        <p className="lede">Create beautiful video montages from your captured Films</p>
      </header>

      <div className="underline-tabs" role="tablist" aria-label="Montage period">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={preset === tab.id}
            className={preset === tab.id ? "is-active" : undefined}
            onClick={() => setPreset(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="period-track">
        {periods.map((period) => {
          const periodClips = selectClipsInRange(clips, period.range);
          const enough = periodClips.length >= MIN_CLIPS;
          const cover = periodClips[0];
          if (period.current && enough) {
            return (
              <article key={period.label} className="period-card is-ready">
                <button
                  type="button"
                  className="period-media"
                  onClick={() => void run()}
                  disabled={busy}
                >
                  <VideoThumb clip={cover} />
                  <span className="day-card-play">
                    <Icon name="play" />
                  </span>
                </button>
                <button
                  type="button"
                  className="period-create"
                  onClick={() => void run()}
                  disabled={busy}
                >
                  {busy ? "Creating…" : `Create ${preset === "week" ? "weekly" : preset === "month" ? "monthly" : "yearly"} montage`}
                </button>
                <p className="period-label">{period.label}</p>
              </article>
            );
          }
          if (period.current) {
            return (
              <article key={period.label} className="period-card is-progress">
                <span className="period-ring">
                  <Icon name="video" />
                  <strong>
                    {periodClips.length}/{MIN_CLIPS}
                  </strong>
                </span>
                <p className="period-hint">
                  {MIN_CLIPS - periodClips.length} more needed ({MIN_CLIPS} minimum required)
                </p>
                <p className="period-label">{period.label}</p>
              </article>
            );
          }
          if (enough) {
            return (
              <article key={period.label} className="period-card is-locked">
                <span className="period-media">
                  <VideoThumb clip={cover} />
                  <span className="period-lock">
                    <Icon name="lock" />
                  </span>
                </span>
                <p className="period-label">{period.label}</p>
              </article>
            );
          }
          return (
            <article key={period.label} className="period-card is-empty">
              <span className="period-ring is-muted">
                <Icon name="video-off" />
              </span>
              <p className="period-title">Not enough Films</p>
              <p className="period-hint">
                Only {periodClips.length} of {MIN_CLIPS} required
              </p>
              <p className="period-label">{period.label}</p>
            </article>
          );
        })}
      </div>

      {busy ? (
        <div className="progress-line" role="status" aria-live="polite">
          <span style={{ width: `${Math.round(progress * 100)}%` }} />
          <p>Encoding… {Math.round(progress * 100)}%</p>
        </div>
      ) : null}
      {error ? (
        <p className="callout danger" role="alert">
          {error}
        </p>
      ) : null}

      <h2 className="section-title">Saved montages</h2>
      {montages.length === 0 ? (
        <EmptyState
          title="No saved montages"
          body={`Collect at least ${MIN_CLIPS} Films in a period and create your first montage.`}
        />
      ) : (
        <ul className="montage-list">
          {montages.map((montage) => (
            <li key={montage.id} className="montage-card">
              <div className="montage-card-head">
                <h3>{montage.title}</h3>
                <span className={montage.status === "encoded" ? "status-pill is-ok" : "status-pill"}>
                  {montage.status === "encoded" ? "Encoded file" : "Preview only"}
                </span>
              </div>
              <p className="muted">{summarizeMontage(montage)}</p>
              <MontageResult montageId={montage.id} />
            </li>
          ))}
        </ul>
      )}

      <p className="current-range muted">
        {preset === "week"
          ? `Current week: ${currentPlan.range.startDateKey} – ${currentPlan.range.endDateKey}`
          : `Current period: ${currentPlan.range.startDateKey} – ${currentPlan.range.endDateKey}`}
      </p>
    </section>
  );
}

function MontageResult({ montageId }: { montageId: string }) {
  const { montages, clips } = useApp();
  const [sharing, setSharing] = useState(false);
  const montage = montages.find((item) => item.id === montageId);
  const url = useObjectUrl(montage?.blob);
  const selected = clips
    .filter((clip) => montage?.clipIds.includes(clip.id))
    .sort((a, b) => a.createdAt - b.createdAt);

  if (!montage) return null;
  if (montage.status === "encoded" && url && montage.blob && montage.mimeType) {
    const share = async () => {
      setSharing(true);
      try {
        const safeTitle = montage.title.replace(/\s+/g, "-");
        await shareVideos([
          {
            blob: montage.blob as Blob,
            name: `filmit-${safeTitle}.${videoExtension(montage.mimeType as string)}`,
          },
        ]);
      } catch (cause) {
        alert(cause instanceof Error ? cause.message : "Jakaminen epäonnistui.");
      } finally {
        setSharing(false);
      }
    };
    return (
      <div className="montage-result">
        <video src={url} controls playsInline className="montage-video" />
        <button type="button" className="text-btn" disabled={sharing} onClick={() => void share()}>
          {sharing ? "Preparing…" : "Save / share film"}
        </button>
      </div>
    );
  }
  return <SequencePlayer clips={selected} title="Sequential preview" />;
}
