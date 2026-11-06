import { useMemo } from "react";
import { formatNumber } from "../lib/format";
import { ArrowIcon, CrownIcon, TrophyIcon } from "../components/icons";

const COLORS = ["#F2B01E", "#F5C542", "#D92B2B", "#39D353", "#2FA8FF", "#F7F3EA"];

function Confetti({ count = 46 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 1.6,
        duration: 2.8 + Math.random() * 2.2,
        drift: (Math.random() - 0.5) * 220,
        color: COLORS[i % COLORS.length],
        rot: Math.random() * 360,
      })),
    [count]
  );
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p) => (
        <i
          key={p.id}
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ["--drift" as any]: `${p.drift}px`,
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export function Results({ players, winnerId, tied, onTieBreak, onRematch }: { players: any[]; winnerId: string | null; tied: string[]; onTieBreak: () => void; onRematch: () => void }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return (
    <div className="screen results page-enter">
      <Confetti />
      <div className="results__head">
        <span className="eyebrow">نهاية الليلة</span>
        <h1 className="title-xl" style={{ fontSize: "clamp(32px, 6vw, 56px)" }}>النتيجة النهائية</h1>
        <p className="lead">الطاولة قفلت — والكلام ده نهائي.</p>
      </div>

      <div className="podium">
        {sorted.map((p, i) => (
          <div className="podium__slot" key={p.id} data-place={i + 1}>
            <span className={`avatar avatar--${(i % 3) + 1}`} style={{ width: 54, height: 54, fontSize: 20 }} aria-hidden="true">{(p.name ?? "?").charAt(0)}</span>
            <span className="podium__place">المركز {formatNumber(i + 1)}</span>
            <span className="podium__name">{p.name}</span>
            <span className="podium__score">{formatNumber(p.score ?? 0)}</span>
            {winnerId === p.id && (
              <span className="podium__winner">
                <CrownIcon style={{ width: 14, height: 14 }} />
                الفايز
              </span>
            )}
            {i === 0 && winnerId === p.id && <TrophyIcon style={{ width: 28, height: 28, color: "var(--gold)" }} />}
          </div>
        ))}
      </div>

      <div className="row" style={{ justifyContent: "center" }}>
        {tied.length > 1 && (
          <button type="button" className="btn btn--gold btn--lg" onClick={onTieBreak}>
            سؤال فاصل
          </button>
        )}
        <button type="button" className="btn btn--lg" onClick={onRematch}>
          إعادة جولة
          <ArrowIcon />
        </button>
      </div>

      <p className="muted" style={{ textAlign: "center", fontSize: 13 }}>
        الغرفة بتفضل شغّالة — ابدأ إعادة الجولة من غير ما حد يخرج.
      </p>
    </div>
  );
}
