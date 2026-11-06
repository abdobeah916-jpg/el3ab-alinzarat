import { useEffect, useRef, useState } from "react";
import { formatNumber } from "../lib/format";
import { CrownIcon } from "./icons";

type Card = { playerId: string; card: "yellow" | "red" };

export function Scoreboard({ players, cards = [], meId }: { players: any[]; cards?: Card[]; meId?: string }) {
  const top = Math.max(...players.map((p) => p.score ?? 0), -Infinity);
  const prev = useRef<Record<string, number>>({});
  const [popped, setPopped] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const p of players) {
      const before = prev.current[p.id];
      if (before !== undefined && before !== p.score) next[p.id] = true;
      prev.current[p.id] = p.score;
    }
    if (!Object.keys(next).length) return;
    setPopped(next);
    const t = setTimeout(() => setPopped({}), 550);
    return () => clearTimeout(t);
  }, [players]);

  if (!players?.length) return <div className="empty-note">لسه محدش دخل الغرفة</div>;

  return (
    <ol className="roster" style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {players.map((p, i) => {
        const myCards = cards.filter((c) => c.playerId === p.id);
        return (
          <li
            key={p.id}
            className="player"
            data-testid={`score-${p.id}`}
            data-leader={players.length > 1 && p.score === top && !p.isEliminated ? "true" : "false"}
            data-out={p.isEliminated ? "true" : "false"}
            data-me={meId === p.id ? "true" : "false"}
          >
            <span className={`avatar avatar--${(i % 3) + 1}`} aria-hidden="true">
              {(p.name ?? "?").trim().charAt(0)}
            </span>
            <div className="player__body">
              <span className="player__name">
                <span>{p.name}</span>
                {players.length > 1 && p.score === top && !p.isEliminated && <CrownIcon className="crown" />}
                {p.isEliminated && <span className="tag tag--red">خرج</span>}
                {meId === p.id && <span className="tag tag--gold">أنت</span>}
              </span>
              <span className="player__meta">
                {p.powerupKey && <span>{p.powerupKey === "shank" ? "شنك الحرمية" : p.powerupKey === "cobri" ? "كوبري" : "سلم وتعبان"}</span>}
                {myCards.length > 0 && (
                  <span className="card-marks" aria-label="إنذارات">
                    {myCards.map((c, idx) => (
                      <i key={idx} className={`card-mark card-mark--${c.card}`} />
                    ))}
                  </span>
                )}
              </span>
            </div>
            <span className={`score${popped[p.id] ? " score--pop" : ""}`} data-sign={(p.score ?? 0) < 0 ? "neg" : (p.score ?? 0) > 0 ? "pos" : undefined}>
              {formatNumber(p.score ?? 0)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
