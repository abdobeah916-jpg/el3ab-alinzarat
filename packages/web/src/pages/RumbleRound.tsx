import { useState } from "react";

export function RumbleRound({ view, send }: { view?: any; send?: any } = {}) {
  const [answer, setAnswer] = useState("");
  const mine = (view?.submissions ?? []).find((s: any) => s.playerId === view?.me?.id);
  const isReveal = view?.state === "reveal";
  return (
    <div className="rumble">
      <p className="question" style={{ fontSize: "clamp(18px,4vw,22px)" }}>{view?.question?.text ?? ""}</p>
      {!mine ? (
        <div className="stack">
          <input className="input" aria-label="إجابتك" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="اكتب إجابتك…" />
          <button type="button" className="btn btn--gold btn--block" onClick={() => send?.({ type: "player:submitRound", payload: { kind: "rumble", answer } })} disabled={!answer.trim()}>
            إرسال
          </button>
        </div>
      ) : (
        <div className="console__hint">إجابتك وصلت — مستنيين الباقي.</div>
      )}
      <ul className="rumble__list">
        {(view?.players ?? []).map((p: any) => {
          const sub = (view?.submissions ?? []).find((s: any) => s.playerId === p.id);
          return (
            <li className="rumble__item" key={p.id} data-out={p.isEliminated ? "true" : "false"} data-me={view?.me?.id === p.id ? "true" : "false"}>
              <span>{p.name} {p.isEliminated ? <span className="tag tag--red">خرج</span> : null}</span>
              <span className="muted" style={{ fontSize: 13 }}>
                {sub ? (isReveal ? sub.payload?.answer ?? "" : "أرسل") : "مستني"}
                {sub && isReveal && sub.duplicate ? " · مكررة" : ""}
              </span>
            </li>
          );
        })}
      </ul>
      {(view?.submissions ?? []).some((s: any) => s.playerId !== view?.me?.id) && !isReveal && (
        <div className="console__hint console__hint--wait">سارة أرسلت — استنى الباقي.</div>
      )}
    </div>
  );
}
