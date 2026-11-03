import { useMemo } from "react";
import { Icon } from "../components/Icon";
import { VideoThumb } from "../components/VideoThumb";
import { useApp, useProgress } from "../hooks/useApp";
import {
  addDays,
  formatDayLabelEN,
  formatTodayLongEN,
  toDateKey,
} from "../lib/dates";
import type { Route } from "../lib/route";
import type { Clip } from "../lib/types";

export function HomeView({ onNavigate }: { onNavigate: (route: Route) => void }) {
  const { clips, achievements, montages } = useApp();
  const { streak, progress } = useProgress();

  const coverByDay = useMemo(() => {
    const map = new Map<string, Clip>();
    for (const clip of clips) {
      const current = map.get(clip.dateKey);
      if (!current || clip.createdAt < current.createdAt) map.set(clip.dateKey, clip);
    }
    return map;
  }, [clips]);

  const days = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, index) => addDays(now, -index)).map((date) => {
      const dateKey = toDateKey(date);
      return { dateKey, clip: coverByDay.get(dateKey) };
    });
  }, [coverByDay]);

  const todayKey = toDateKey(new Date());
  const latestClip = clips[0];
  const savedMontage = montages[0];

  return (
    <section className="view home-view">
      <div className="story-row" role="list" aria-label="Recent days">
        {days.map(({ dateKey, clip }) => (
          <button
            key={dateKey}
            type="button"
            role="listitem"
            className={clip ? "story-day has-clip" : "story-day"}
            onClick={() =>
              onNavigate({ view: "memories", mode: "list", dateKey: dateKey === todayKey ? undefined : dateKey })
            }
          >
            <span className="story-circle">
              {clip ? (
                <VideoThumb clip={clip} className="story-thumb" />
              ) : dateKey === todayKey ? (
                <Icon name="plus" />
              ) : null}
            </span>
            <span className="story-label">{formatDayLabelEN(dateKey)}</span>
          </button>
        ))}
      </div>

      <div className="stats-card" role="group" aria-label="Progress">
        <div className="stat">
          <p className="stat-label">Streak</p>
          <p className="stat-value">
            <Icon name="flame" /> <span>{streak.current}</span>
          </p>
        </div>
        <div className="stat">
          <p className="stat-label">Rewards</p>
          <p className="stat-value">
            <Icon name="trophy" /> <span>{achievements.length}</span>
          </p>
        </div>
        <div className="stat">
          <p className="stat-label">Points</p>
          <p className="stat-value">
            <Icon name="bolt" /> <span>{progress.xp}</span>
          </p>
        </div>
      </div>

      <div className="today-card">
        <h2>Today's Film</h2>
        <p className="today-date">{formatTodayLongEN()}</p>
        <button
          type="button"
          className="capture-cta"
          onClick={() => onNavigate({ view: "capture" })}
        >
          <Icon name="video" />
          <span>Capture Your Film</span>
        </button>
      </div>

      <div className="section-row">
        <h2>Montages</h2>
        <button type="button" className="link-btn" onClick={() => onNavigate({ view: "montages" })}>
          View all
        </button>
      </div>

      <div className="montage-preview">
        <article className="montage-tile is-empty-tile">
          <span className="tile-pill">Monthly</span>
          <span className="tile-icon">
            <Icon name="hourglass" />
          </span>
        </article>
        <article className={latestClip || savedMontage ? "montage-tile is-dark" : "montage-tile is-dark is-blank"}>
          <span className="tile-pill is-pink">Yearly</span>
          {latestClip ? <VideoThumb clip={latestClip} className="tile-thumb" /> : null}
          <span className="tile-icon">
            <Icon name="lock" />
          </span>
        </article>
      </div>
    </section>
  );
}
