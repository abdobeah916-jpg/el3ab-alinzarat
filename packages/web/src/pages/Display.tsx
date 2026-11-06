import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { createGameSocket } from "../lib/socket";
import { loadSession } from "../lib/tokenStore";
import { RoundTimer } from "../components/RoundTimer";
import { BellIcon, BroadcastIcon, CheckIcon } from "../components/icons";
import { formatNumber } from "../lib/format";
import { ROUND_KINDS, categoryName } from "../lib/categories";

export function Display({ view: propView }: { view?: any } = {}) {
  const { code = "" } = useParams();
  const session = loadSession();
  const [live, setLive] = useState<any>(null);
  const view = propView ?? live;
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    if (propView) return;
    if (!code || !session) return;
    const socket = createGameSocket(session);
    socket.on("state:patch", (v: any) => setLive(v));
    return () => { socket.close(); };
  }, [code]);

  useEffect(() => setShowAnswer(false), [view?.question?.id]);

  if (!view) {
    return <div className="loading"><span className="spinner" /><span>بنوصّل الشاشة…</span></div>;
  }

  const kind = ROUND_KINDS.find((k) => k.kind === view.roundKind);
  const sorted = [...(view.players ?? [])].sort((a, b) => b.score - a.score);
  const presses = view.buzzer?.presses ?? [];

  return (
    <div className="display">
      <header className="display__hud">
        <span className="brand brand--sm">
          <span className="brand__mark"><BellIcon /></span>
          كازينو الألعاب
        </span>
        <span className="pill pill--gold"><BroadcastIcon style={{ width: 15, height: 15 }} /> شاشة العرض</span>
        <span className="spacer" />
        <span className="pill">انضم على <b style={{ direction: "ltr", display: "inline-block" }}>{location.host}/join/{view.code}</b></span>
        {view.buzzer?.deadline && <RoundTimer deadline={view.buzzer.deadline} />}
      </header>

      <main className="display__stage">
        <div className="display__meta">
          <span className="stage__label">{kind?.name ?? "جولة"}</span>
          <span className="pill">{categoryName(view.question?.categorySlug)}</span>
        </div>

        {view.question ? (
          <>
            <h1 className="display__question">{view.question.text}</h1>
            {view.question.mediaUrl && <img className="display__media" src={view.question.mediaUrl} alt="" />}
            {showAnswer ? (
              <p className="display__answer"><CheckIcon style={{ width: 26, height: 26 }} /> {view.question.answer}</p>
            ) : (
              <button type="button" className="btn btn--ghost" onClick={() => setShowAnswer(true)}>اظهر الإجابة</button>
            )}
          </>
        ) : (
          <p className="display__waiting">
            {view.state === "lobby" || view.state === "powerup_selection" ? `الغرفة ${view.code} — مستنيين اللاعبين` : "استعد… السؤال جاي"}
          </p>
        )}

        {presses.length > 0 && (
          <ol className="display__order">
            {presses.map((p: any, i: number) => (
              <li key={p.playerId}>
                <span className="order__rank">{i + 1}</span>
                {view.players.find((x: any) => x.id === p.playerId)?.name}
              </li>
            ))}
          </ol>
        )}
      </main>

      <footer className="display__scores">
        {sorted.map((p: any) => (
          <div className="display__score" key={p.id} data-leader={p.score === sorted[0]?.score ? "true" : "false"}>
            <span className="display__score-name">{p.name}</span>
            <span className="display__score-value">{formatNumber(p.score ?? 0)}</span>
          </div>
        ))}
        {!sorted.length && <span className="muted">مفيش لاعبين لسه</span>}
      </footer>
    </div>
  );
}
