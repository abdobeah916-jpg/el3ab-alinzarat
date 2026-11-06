import { useState } from "react";
import { PowerupCard } from "../components/PowerupCard";
import { ChipIcon, CopyIcon, UsersIcon } from "../components/icons";
import { formatNumber } from "../lib/format";

export function Lobby({ view, onChoose, isJudge, onStart, onOpenPowerups }: { view?: any; onChoose?: (key: string) => void; isJudge?: boolean; onStart?: () => void; onOpenPowerups?: () => void }) {
  const players = view?.players ?? [];
  const myTaken = view?.me?.powerupKey ?? null;
  const selecting = view?.state === "powerup_selection";
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(view?.code ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="screen lobby page-enter">
      <div className="lobby__head">
        <div className="lobby__code">
          <span>كود الغرفة</span>
          <b>{view?.code ?? ""}</b>
          {isJudge && <span className="tag tag--gold" style={{ marginTop: 8, width: "fit-content" }}>منظور الحكم</span>}
        </div>
        <div className="row">
          <button type="button" className="btn btn--ghost" onClick={copy} aria-label="انسخ الكود">
            <CopyIcon />
            {copied ? "اتنسخ" : "انسخ الكود"}
          </button>
          {isJudge && (
            <a className="btn btn--ghost" href={`/room/${view?.code ?? ""}/display`} target="_blank" rel="noreferrer">
              شاشة العرض
            </a>
          )}
          <span className="pill pill--gold">
            <ChipIcon style={{ width: 16, height: 16 }} />
            {formatNumber(players.length)} / {formatNumber(3)}
          </span>
        </div>
      </div>

      <div className="seats">
        {[0, 1, 2].map((i) => {
          const p = players[i];
          if (!p) return <div className="seat seat--empty" key={`empty-${i}`}>مقعد فاضي</div>;
          const mine = view?.me?.id === p.id;
          return (
            <div className="seat" key={p.id} data-me={mine ? "true" : "false"}>
              <span className={`avatar avatar--${(i % 3) + 1}`} aria-hidden="true">{(p.name ?? "?").charAt(0)}</span>
              <div className="stack" style={{ gap: 0 }}>
                <span className="seat__name">{p.name}</span>
                <span className="seat__meta">{p.powerupKey ? "اختار سلاحه" : "بيختار…"}</span>
              </div>
            </div>
          );
        })}
      </div>

      <hr className="divider" />

      <div className="stack">
        <div className="row row--between">
          <div className="stack" style={{ gap: 2 }}>
            <h2 style={{ fontSize: 20 }}>سِلاحك السري</h2>
            <p className="muted" style={{ fontSize: 14 }}>كل لاعب بياخد سلاح واحد بس — الأولوية للأسرع.</p>
          </div>
          <span className="tag tag--gold">٣ أسلحة فقط</span>
        </div>

        <div className="powerups">
          {(["shank", "cobri", "salem"] as const).map((key) => {
            const taken = players.some((p: any) => p.powerupKey === key);
            const mine = myTaken === key;
            return (
              <PowerupCard
                key={key}
                powerup={key}
                state={mine ? "reserved" : taken ? "reserved" : "none"}
                disabled={taken && !mine}
                onSelect={() => onChoose?.(key)}
              />
            );
          })}
        </div>
      </div>

      <div className="card card--inset row row--between" style={{ gap: 14 }}>
        <div className="row" style={{ gap: 10 }}>
          <UsersIcon style={{ width: 20, height: 20, color: "var(--gold)" }} />
          <span className="muted" style={{ fontSize: 14 }}>
            {isJudge
              ? selecting
                ? "استنى اللاعبين يخلصوا اختيار، وبعدين ابدأ."
                : "افتح اختيار الأسلحة لما الكل يدخل."
              : "استنى الحكم يبدأ اللعبة."}
          </span>
        </div>
        {isJudge && !selecting && (
          <button type="button" className="btn btn--gold" onClick={onOpenPowerups}>
            افتح اختيار الأسلحة
          </button>
        )}
        {isJudge && selecting && (
          <button type="button" className="btn btn--gold" onClick={onStart}>
            ابدأ اللعبة
          </button>
        )}
      </div>
    </div>
  );
}
