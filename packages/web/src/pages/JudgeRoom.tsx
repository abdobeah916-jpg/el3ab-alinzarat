import { useEffect, useRef, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { createGameSocket, sendCommand } from "../lib/socket";
import { loadSession } from "../lib/tokenStore";
import { useGameStore } from "../store/gameStore";
import { QuestionCard } from "../components/QuestionCard";
import { Scoreboard } from "../components/Scoreboard";
import { RoundTimer } from "../components/RoundTimer";
import { Lobby } from "./Lobby";
import { Results } from "./Results";
import { CATEGORIES, ROUND_KINDS, categoryName } from "../lib/categories";
import { formatNumber } from "../lib/format";
import { BroadcastIcon, BellIcon, CardsIcon, CheckIcon, PlayIcon, SparkIcon, XIcon } from "../components/icons";

const STATE_LABEL: Record<string, string> = {
  lobby: "اللوبي",
  powerup_selection: "اختيار الأسلحة",
  ready: "جاهز",
  round_intro: "مقدمة الجولة",
  question_setup: "تجهيز السؤال",
  question_active: "السؤال شغّال",
  buzzer_locked: "الجرس اتقفل",
  answering: "الجواب جاي",
  judging: "تصحيح",
  card_action: "كروت الإنذار",
  result: "النتيجة",
  next_question: "السؤال الجاي",
  finished: "خلصت",
  tie_breaker: "سؤال فاصل",
  simultaneous_active: "إجابات متزامنة",
  submissions_closed: "الإرسال اتقفل",
  reveal: "كشف الإجابات",
};

function playerName(players: any[], id: string): string {
  return players.find((p) => p.id === id)?.name ?? "لاعب";
}

const HINTS: Record<string, string> = {
  lobby: "استنى اللاعبين يدخلوا، وبعدين افتح اختيار الأسلحة.",
  powerup_selection: "كل لاعب بيختار سلاح واحد — ابدأ لما الكل يخلص.",
  ready: "اختار طور الجولة اللي جاية.",
  round_intro: "اشرح الطور للاعبين وبعدين ابدأ الجولة.",
  question_setup: "اختار تصنيف، اسحب سؤال، وبعدين ابدأ.",
  question_active: "الجرس مفتوح — استنى الضغطات وبعدين اقفله.",
  buzzer_locked: "اختار أول لاعب داس الجرس.",
  answering: "اسمع الإجابة وقرر صح ولا غلط.",
  card_action: "وزّع كروت الإنذار على اللي غلط.",
  result: "النتيجة ظاهرة للكل — كمّل للسؤال الجاي.",
  simultaneous_active: "اللاعبين بيكتبوا — اقفل الإرسال لما تخلص.",
  submissions_closed: "راجع الإجابات وبعدين اكشفها.",
  reveal: "راجع إجابات اللاعبين واعتمد النتيجة.",
  tie_breaker: "سؤال فاصل بين المتعادلين.",
  next_question: "اختار طور الجولة الجاية أو اقفل اللعبة.",
  finished: "اللعبة خلصت.",
};

export function JudgeRoom({ view: propView, send }: { view?: any; send?: any } = {}) {
  const [view, setView] = useState<any>(propView ?? null);
  const [log, setLog] = useState<{ id: number; text: string; at: string }[]>([]);
  const params = useParams();
  const code = params.code ?? "";
  const session = loadSession();
  const setViewStore = useGameStore((s) => s.setView);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    if (propView) return;
    if (!code || !session) return;
    const socket = createGameSocket(session);
    socketRef.current = socket;
    socket.on("state:patch", (v: any) => { setView(v); setViewStore(v); });
    return () => { socket.close(); socketRef.current = null; };
  }, [code]);

  useEffect(() => {
    if (!view?.state) return;
    const text = `${STATE_LABEL[view.state] ?? view.state}${view.answererId ? ` — ${playerName(view.players, view.answererId)}` : ""}`;
    setLog((prev) => {
      if (prev[0]?.text === text) return prev;
      return [{ id: (prev[0]?.id ?? 0) + 1, text, at: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) }, ...prev].slice(0, 10);
    });
  }, [view?.state, view?.seq]);

  const cmd = (command: any) => {
    if (send) return send(command);
    if (!socketRef.current) return;
    return sendCommand(socketRef.current, { id: crypto.randomUUID(), actorId: "judge", role: "judge", expectedState: view?.state ?? "lobby", command });
  };

  if (!view) {
    return (
      <div className="loading">
        <span className="spinner" aria-hidden="true" />
        <span>بنفتح الطاولة…</span>
      </div>
    );
  }

  if (view.state === "lobby" || view.state === "powerup_selection") {
    return (
      <Lobby
        view={view}
        isJudge
        onOpenPowerups={() => cmd({ type: "judge:openPowerupSelection" })}
        onStart={() => cmd({ type: "judge:startGame" })}
      />
    );
  }

  if (view.state === "finished") {
    return <Results players={view.players} winnerId={view.round?.winnerId} tied={[]} onTieBreak={() => cmd({ type: "judge:startTieBreaker" })} onRematch={() => cmd({ type: "judge:rematch" })} />;
  }

  const kind = ROUND_KINDS.find((k) => k.kind === view.roundKind);
  const presses = view.buzzer?.presses ?? [];
  const cards = view.round?.cards ?? [];

  const roundChooser = (state: string) => (
    <div className="stack">
      <span className="eyebrow">اختار طور الجولة</span>
      <div className="choice-grid">
        {ROUND_KINDS.map((k) => (
          <button type="button" key={k.kind} className="choice" onClick={() => cmd({ type: "judge:selectRoundKind", kind: k.kind })}>
            <span className="choice__name">{k.name}</span>
            <span className="choice__desc">{k.desc}</span>
          </button>
        ))}
      </div>
      {state === "next_question" && (
        <button type="button" className="btn btn--ghost" onClick={() => cmd({ type: "judge:endGame" })}>إنهاء اللعبة</button>
      )}
    </div>
  );

  let controls: ReactNode = null;
  if (view.state === "ready" || view.state === "next_question") controls = roundChooser(view.state);
  else if (view.state === "round_intro") {
    controls = (
      <div className="stack">
        <p className="muted">{kind?.desc}</p>
        <button type="button" className="btn btn--gold btn--lg" onClick={() => cmd({ type: "judge:beginRound" })}>
          <PlayIcon /> ابدأ الجولة
        </button>
      </div>
    );
  } else if (view.state === "question_setup") {
    controls = (
      <div className="stack">
        <span className="eyebrow">اختار التصنيف</span>
        <div className="cat-grid">
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c.slug}
              className="cat"
              data-active={view.question?.categorySlug === c.slug ? "true" : "false"}
              onClick={() => cmd({ type: "judge:selectCategory", categorySlug: c.slug })}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className="btn-row">
          <button type="button" className="btn" onClick={() => cmd({ type: "judge:selectQuestion" })}>
            <SparkIcon /> اسحب سؤال
          </button>
          <button type="button" className="btn btn--gold" onClick={() => cmd({ type: "judge:startQuestion" })} disabled={!view.question}>
            <PlayIcon /> ابدأ السؤال
          </button>
        </div>
      </div>
    );
  } else if (view.state === "question_active") {
    controls = (
      <div className="btn-row">
        <button type="button" className="btn btn--danger" onClick={() => cmd({ type: "judge:closeBuzzer" })}>
          اقفل الجرس
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => cmd({ type: "judge:skipQuestion" })}>
          تخطي السؤال
        </button>
      </div>
    );
  } else if (view.state === "buzzer_locked") {
    controls = (
      <div className="stack">
        <span className="eyebrow">مين جاوب؟</span>
        <div className="btn-row">
          {presses.map((p: any) => (
            <button type="button" key={p.playerId} className="btn btn--gold" onClick={() => cmd({ type: "judge:selectAnswerer", playerId: p.playerId })}>
              {playerName(view.players, p.playerId)}
            </button>
          ))}
          {!presses.length && <span className="muted">محدش داس الجرس.</span>}
        </div>
        <div className="btn-row">
          <button type="button" className="btn" onClick={() => cmd({ type: "judge:openBuzzer" })}>افتح الجرس تاني</button>
          <button type="button" className="btn btn--ghost" onClick={() => cmd({ type: "judge:skipQuestion" })}>تخطي</button>
        </div>
      </div>
    );
  } else if (view.state === "answering") {
    controls = (
      <div className="stack">
        <p className="muted">بيجاوب: <b style={{ color: "var(--cream)" }}>{playerName(view.players, view.answererId)}</b></p>
        <div className="btn-row">
          <button type="button" className="btn btn--gold btn--lg" onClick={() => cmd({ type: "judge:markCorrect" })}>
            <CheckIcon /> صح
          </button>
          <button type="button" className="btn btn--danger btn--lg" onClick={() => cmd({ type: "judge:markWrong" })}>
            <XIcon /> غلط
          </button>
        </div>
      </div>
    );
  } else if (view.state === "card_action") {
    controls = (
      <div className="stack">
        <span className="eyebrow">كروت الإنذار</span>
        <div className="stack" style={{ gap: 8 }}>
          {view.players.map((p: any) => (
            <div key={p.id} className="row row--between card card--inset" style={{ padding: "10px 14px" }}>
              <span style={{ fontWeight: 600 }}>{p.name}</span>
              <span className="btn-row">
                <button type="button" className="btn" aria-label={`إنذار أصفر ل${p.name}`} onClick={() => cmd({ type: "judge:playCard", playerId: p.id, card: "yellow" })}>
                  <CardsIcon style={{ color: "var(--gold-soft)" }} /> إنذار أصفر
                </button>
                <button type="button" className="btn btn--danger" aria-label={`إنذار أحمر ل${p.name}`} onClick={() => cmd({ type: "judge:playCard", playerId: p.id, card: "red" })}>
                  <CardsIcon /> إنذار أحمر
                </button>
              </span>
            </div>
          ))}
        </div>
        <div className="btn-row">
          <button type="button" className="btn btn--ghost" onClick={() => cmd({ type: "judge:endQuestion" })}>إنهاء السؤال</button>
          <button type="button" className="btn" onClick={() => cmd({ type: "judge:openBuzzer" })}>افتح الجرس لباقي اللاعبين</button>
        </div>
      </div>
    );
  } else if (view.state === "result") {
    controls = (
      <div className="btn-row">
        <button type="button" className="btn btn--gold" onClick={() => cmd({ type: "judge:nextQuestion" })}>
          <PlayIcon /> السؤال الجاي
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => cmd({ type: "judge:endGame" })}>إنهاء اللعبة</button>
      </div>
    );
  } else if (view.state === "submissions_closed") {
    controls = (
      <div className="btn-row">
        <button type="button" className="btn btn--gold" onClick={() => cmd({ type: "judge:openReveal" })}>اكشف الإجابات</button>
        <button type="button" className="btn" onClick={() => cmd({ type: "judge:confirmRumbleResult" })}>اعتمد النتيجة</button>
      </div>
    );
  } else if (view.state === "reveal") {
    controls = (
      <div className="btn-row">
        <button type="button" className="btn btn--gold" onClick={() => cmd({ type: "judge:approveAllSubmissions" })}>
          <CheckIcon /> اعتمد الكل
        </button>
        <button type="button" className="btn" onClick={() => cmd({ type: "judge:nextQuestion" })}>السؤال الجاي</button>
      </div>
    );
  } else if (view.state === "simultaneous_active") {
    controls = (
      <button type="button" className="btn btn--danger" onClick={() => cmd({ type: "judge:closeSubmissions" })}>اقفل الإرسال</button>
    );
  } else if (view.state === "tie_breaker") {
    controls = (
      <div className="btn-row">
        <button type="button" className="btn" onClick={() => cmd({ type: "judge:startTieBreaker" })}>سؤال فاصل</button>
        <button type="button" className="btn btn--ghost" onClick={() => cmd({ type: "judge:declareTie" })}>إعلان التعادل</button>
      </div>
    );
  }

  const submissions = view.submissions ?? [];

  return (
    <div className="judge page-enter">
      <header className="hud">
        <span className="brand brand--sm">
          <span className="brand__mark"><BellIcon /></span>
          كازينو الألعاب
        </span>
        <span className="tag tag--gold">منظور الحكم</span>
        <span className={`pill ${view.state === "question_active" ? "pill--live" : "pill--gold"}`}>
          {STATE_LABEL[view.state] ?? view.state}
        </span>
        {view.round?.index ? <span className="tag">جولة {formatNumber(view.round.index)}</span> : null}
        <div className="hud__mid">
          <span className="pill pill--code">الغرفة <b>{view.code}</b></span>
          {view.buzzer?.deadline && <RoundTimer deadline={view.buzzer.deadline} />}
          {view.state === "simultaneous_active" && view.settings?.busSeconds && <span className="pill">{kind?.name}</span>}
          <a className="btn btn--ghost" href={`/room/${view.code}/display`} target="_blank" rel="noreferrer">
            <BroadcastIcon /> شاشة العرض
          </a>
        </div>
      </header>

      <div className="judge__grid">
        <section className={`stage judge__stage${view.state === "question_active" ? " stage--live" : ""}`} key={view.question?.id ?? view.state}>
          <div className="stage__head">
            <span className="stage__label" data-live={view.state === "question_active" ? "true" : "false"}>{kind?.name ?? "جولة"}</span>
            <span className="pill">{categoryName(view.question?.categorySlug)}</span>
          </div>
          <QuestionCard question={view.question} showAnswer />
          {view.state === "question_active" && presses.length > 0 && (
            <div className="order">
              <span className="eyebrow">ترتيب الضغط</span>
              {presses.map((p: any, i: number) => (
                <div className="order__row" key={p.playerId} style={{ animationDelay: `${i * 0.05}s` }}>
                  <span className="order__rank">{i + 1}</span>
                  <span style={{ fontWeight: 600 }}>{playerName(view.players, p.playerId)}</span>
                  <span className="spacer" />
                  <span className="muted" style={{ fontSize: 12 }}>داس الجرس</span>
                </div>
              ))}
            </div>
          )}
          {(view.state === "reveal" || view.state === "submissions_closed") && submissions.length > 0 && (
            <div className="order">
              <span className="eyebrow">إجابات اللاعبين</span>
              {submissions.map((s: any) => (
                <div className="order__row" key={s.playerId}>
                  <span style={{ fontWeight: 600 }}>{playerName(view.players, s.playerId)}</span>
                  <span className="spacer" />
                  <span className="muted" style={{ fontSize: 13 }}>{JSON.stringify(s.payload)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel console judge__console">
          <div className="panel__head">
            <span className="panel__title">لوحة التحكم</span>
          </div>
          {HINTS[view.state] && <p className="muted console__hint-text">{HINTS[view.state]}</p>}
          {controls}
        </section>

        <aside className="judge__side">
          <section className="panel judge__roster">
            <div className="panel__head">
              <span className="panel__title">اللاعبون</span>
              <span className="tag">{view.players.length} / 3</span>
            </div>
            <Scoreboard players={view.players} cards={cards} />
            {(view.roundKind === "bus" || view.roundKind === "rumble" || view.roundKind === "letter_race") && (
              <div className="stack" style={{ marginTop: 16 }}>
                {view.roundKind === "bus" && <div className="bus__letter" style={{ minHeight: 96, fontSize: 64 }}>{view.busLetter ?? "س"}</div>}
                <span className="eyebrow">حالة الإرسال</span>
                {view.players.map((p: any) => {
                  const sub = (view.submissions ?? []).find((s: any) => s.playerId === p.id);
                  return (
                    <div className="rumble__item" key={p.id} data-me={view.me?.id === p.id ? "true" : "false"}>
                      <span>{p.name}</span>
                      <span className={sub ? "tag tag--green" : "tag"}>{sub ? "أرسل" : "مستني"}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="panel judge__cards">
            <div className="panel__head">
              <span className="panel__title">الكروت</span>
              <span className="tag tag--red">{cards.length}</span>
            </div>
            <div className="ledger">
              {cards.length === 0 && <div className="ledger__empty">مفيش كروت في الجولة دي لسه.</div>}
              {cards.map((c: any, i: number) => (
                <div className="ledger__row" key={`${c.playerId}-${i}`} style={{ animationDelay: `${i * 0.04}s` }}>
                  <span className={`card-mark card-mark--${c.card}`} aria-hidden="true" />
                  <b>{playerName(view.players, c.playerId)}</b>
                  <span className={`tag ${c.card === "yellow" ? "tag--gold" : "tag--red"}`}>{c.card === "yellow" ? "أصفر" : "أحمر"}</span>
                </div>
              ))}
            </div>
            <div className="arms">
              {view.players.map((p: any) => (
                <div className="arms__row" key={p.id}>
                  <b>{p.name}</b>
                  <span className="tag">
                    {p.powerupKey === "shank" ? "شنك" : p.powerupKey === "cobri" ? "كوبري" : p.powerupKey === "salem" ? "سلم وتعبان" : "بدون سلاح"}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel judge__log">
            <div className="panel__head">
              <span className="panel__title">السجل</span>
              <span className="tag">{log.length}</span>
            </div>
            <div className="log">
              {log.length === 0 && <span className="empty-note">لسه مفيش أحداث.</span>}
              {log.map((l) => (
                <div className="log__row" key={l.id}>
                  <time>{l.at}</time>
                  <span><b>{l.text}</b></span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
