import { achievementById } from "../lib/achievements";
import { transitionCopy } from "../lib/geofence";
import { useApp } from "../hooks/useApp";
import type { Route } from "../lib/route";

export function Overlays({ onNavigate }: { onNavigate: (route: Route) => void }) {
  const { prompt, dismissPrompt, justUnlocked, dismissUnlock, toasts, dismissToast } =
    useApp();

  return (
    <>
      {prompt ? (
        <div className="sheet" role="dialog" aria-labelledby="prompt-title">
          <div className="sheet-card">
            <p className="kicker">Paikka vaihtui</p>
            <h2 id="prompt-title">{transitionCopy(prompt).title}</h2>
            <p>{transitionCopy(prompt).body}</p>
            <p className="muted">
              Heräte toimii vain kun Filmit on avoinna. Taustaseuranta ei ole luotettavaa
              selaimessa.
            </p>
            <div className="row">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  dismissPrompt();
                  onNavigate({ view: "capture" });
                }}
              >
                Capture now
              </button>
              <button type="button" className="btn btn-ghost" onClick={dismissPrompt}>
                Not now
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {justUnlocked[0] ? (
        <div className="sheet" role="dialog" aria-labelledby="unlock-title">
          <div className="sheet-card celebrate">
            <p className="kicker">Achievement</p>
            <h2 id="unlock-title">{achievementById(justUnlocked[0].id).title}</h2>
            <p>{achievementById(justUnlocked[0].id).description}</p>
            <button type="button" className="btn btn-primary" onClick={dismissUnlock}>
              Continue
            </button>
          </div>
        </div>
      ) : null}

      <div className="toasts" aria-live="polite">
        {toasts.map((toast) => (
          <button key={toast.id} type="button" className="toast" onClick={() => dismissToast(toast.id)}>
            {toast.message}
          </button>
        ))}
      </div>
    </>
  );
}
