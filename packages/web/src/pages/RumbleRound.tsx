import { useState } from "react";

export function RumbleRound({ view, send }: { view?: any; send?: any } = {}) {
  const [answer, setAnswer] = useState("");
  const mine = (view?.submissions ?? []).find((s: any) => s.playerId === view?.me?.id);
  const isReveal = view?.state === "reveal";
  return (
    <div>
      <div>{view?.question?.text ?? ""}</div>
      {!mine ? (
        <div>
          <input aria-label="إجابتك" value={answer} onChange={(e) => setAnswer(e.target.value)} />
          <button onClick={() => send?.({ type: "player:submitRound", payload: { kind: "rumble", answer } })}>إرسال</button>
        </div>
      ) : <div>إجابتك وصلت</div>}
      <ul>
        {(view?.players ?? []).map((p: any) => {
          const sub = (view?.submissions ?? []).find((s: any) => s.playerId === p.id);
          return (
            <li key={p.id}>
              {p.name} {p.isEliminated ? "خرج" : ""} {sub ? (isReveal ? sub.payload?.answer ?? "" : "أرسل") : "مستني"}
              {sub && isReveal && sub.duplicate ? " مكررة" : ""}
            </li>
          );
        })}
      </ul>
      {(view?.submissions ?? []).some((s: any) => s.playerId !== view?.me?.id) && !isReveal && <div>سارة أرسلت</div>}
    </div>
  );
}
