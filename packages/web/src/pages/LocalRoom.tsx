import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellIcon, CardsIcon, CheckIcon, ChipIcon, CrownIcon, PlayIcon, SparkIcon, TrophyIcon, UsersIcon, XIcon } from "../components/icons";
import { Confetti } from "./Results";
import { formatNumber } from "../lib/format";
import { CATEGORIES, categoryName } from "../lib/categories";
import { categoryLabel } from "../local/questions";
import {
  MAX_LOCAL_PLAYERS,
  DEFAULT_LOCAL_SETTINGS,
  addLocalPlayer,
  adjustScore,
  backToSetup,
  buzz,
  clearLocalState,
  createLocalState,
  drawQuestion,
  finishGame,
  judgeAnswer,
  loadLocalState,
  nextQuestion,
  playCard,
  rematch,
  resetBuzz,
  saveLocalState,
  setCategory,
  skipQuestion,
  startLocalGame,
  toggleAnswer,
  winnerOf,
  type LocalState,
} from "../local/engine";

function clock(at: number): string {
  return new Date(at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

function leaderId(state: LocalState): string | null {
  if (state.players.length < 2) return null;
  const top = Math.max(...state.players.map((p) => p.score));
  const leaders = state.players.filter((p) => p.score === top);
  return leaders.length === 1 ? leaders[0]!.id : null;
}

export function LocalRoom() {
  const [state, setState] = useState<LocalState>(() => loadLocalState() ?? createLocalState());
  const update = (fn: (s: LocalState) => LocalState) => setState((s) => fn(s));

  useEffect(() => {
    saveLocalState(state);
  }, [state]);

  if (state.phase === "setup") {
    return (
      <LocalSetup
        state={state}
        onStart={(names, settings) => update((s) => startLocalGame(s, names, settings))}
      />
    );
  }
  if (state.phase === "results") {
    return (
      <LocalResults
        state={state}
        onRematch={() => update(rematch)}
        onNewTable={() => update(backToSetup)}
      />
    );
  }
  return (
    <LocalTable
      state={state}
      update={update}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Setup                                                               */
/* ------------------------------------------------------------------ */

function LocalSetup({ state, onStart }: { state: LocalState; onStart: (names: string[], settings: LocalState["settings"]) => void }) {
  const nav = useNavigate();
  const [names, setNames] = useState<string[]>(() => state.players.map((p) => p.name));
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [settings, setSettings] = useState(state.settings);
  const inputRef = useRef<HTMLInputElement>(null);

  function addName() {
    const name = draft.trim();
    if (!name) return;
    if (names.length >= MAX_LOCAL_PLAYERS) {
      setError("الطاولة بتاخد ٣ لاعبين بالكتير.");
      return;
    }
    if (names.some((n) => n.trim() === name)) {
      setError("الاسم ده موجود بالفعل.");
      return;
    }
    setNames([...names, name]);
    setDraft("");
    setError("");
    inputRef.current?.focus();
  }

  function removeName(index: number) {
    setNames(names.filter((_, i) => i !== index));
    setError("");
  }

  function start() {
    if (!names.length) {
      setError("اكتب اسم لاعب واحد على الأقل.");
      return;
    }
    onStart(names, settings);
  }

  return (
    <div className="local local__setup page-enter">
      <div className="screen local__setup-inner">
        <div className="row row--between">
          <span className="brand brand--sm">
            <span className="brand__mark"><BellIcon /></span>
            كازينو الألعاب
          </span>
          <button type="button" className="btn btn--ghost" onClick={() => nav("/")}>الرئيسية</button>
        </div>

        <div className="local__hero">
          <span className="eyebrow">بدون غرف · بدون أكواد · تليفون واحد</span>
          <h1 className="title-xl">
            حكم واحد،
            <br />
            <span className="gold-text">وكل اللاعبين قدامك.</span>
          </h1>
          <p className="lead">
            ادخل أسماء اللاعبين، اقرأ السؤال بصوت عالي، ودوس على اللي جاوب الأول.
            أنت اللي بتحسب النقط والكروت — كل حاجة من نفس الشاشة.
          </p>
        </div>

        <section className="panel panel--gold">
          <div className="panel__head">
            <span className="panel__title">اللاعبون</span>
            <span className="tag">{formatNumber(names.length)} من {formatNumber(MAX_LOCAL_PLAYERS)}</span>
          </div>

          <div className="local__slots">
            {names.map((name, i) => (
              <div className="local__slot" key={`${name}-${i}`}>
                <span className={`avatar avatar--${(i % 3) + 1}`} aria-hidden="true">{name.trim().charAt(0)}</span>
                <b>{name}</b>
                <button type="button" className="local__slot-remove" onClick={() => removeName(i)} aria-label={`احذف ${name}`}>
                  <XIcon />
                </button>
              </div>
            ))}
            {names.length === 0 && <p className="empty-note">لسه مفيش لاعبين — ابدأ بكتابة اسم.</p>}
          </div>

          <div className="local__add">
            <input
              ref={inputRef}
              className="input"
              value={draft}
              onChange={(e) => { setDraft(e.target.value); setError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addName(); } }}
              placeholder="اسم اللاعب…"
              maxLength={16}
              aria-label="اسم اللاعب"
              disabled={names.length >= MAX_LOCAL_PLAYERS}
            />
            <button type="button" className="btn btn--gold" onClick={addName} disabled={!draft.trim() || names.length >= MAX_LOCAL_PLAYERS}>
              <UsersIcon />
              ضيف
            </button>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
        </section>

        <section className="panel">
          <div className="panel__head">
            <span className="panel__title">قواعد الحساب</span>
            <span className="tag tag--gold">تقدر تعدّلها في أي وقت</span>
          </div>

          <div className="local__setting">
            <div>
              <b>النقط السالبة</b>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>لو قفلتها، النتيجة بتقف عند صفر ومش بتنزل تحت.</p>
            </div>
            <button
              type="button"
              className="local__switch"
              data-on={settings.allowNegative ? "true" : "false"}
              onClick={() => setSettings({ ...settings, allowNegative: !settings.allowNegative })}
              role="switch"
              aria-checked={settings.allowNegative}
              aria-label="السماح بالنقط السالبة"
            >
              <span />
            </button>
          </div>

          <div className="local__setting">
            <div>
              <b>نقط الإجابة الصح</b>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>الكارت الأصفر {formatNumber(DEFAULT_LOCAL_SETTINGS.yellowPenalty)} والأحمر {formatNumber(DEFAULT_LOCAL_SETTINGS.redPenalty)}.</p>
            </div>
            <div className="local__seg" role="group" aria-label="نقط الإجابة الصح">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  data-on={settings.pointsPerCorrect === n ? "true" : "false"}
                  onClick={() => setSettings({ ...settings, pointsPerCorrect: n })}
                >
                  {formatNumber(n)}
                </button>
              ))}
            </div>
          </div>
        </section>

        <button type="button" className="btn btn--gold btn--lg local__start" onClick={start} disabled={!names.length}>
          <PlayIcon />
          ابدأ اللعب
        </button>
        {names.length === 1 && <p className="muted" style={{ textAlign: "center", fontSize: 13, margin: 0 }}>ضيف لاعب تاني على الأقل عشان المنافسة تبقى حلوة.</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Table                                                               */
/* ------------------------------------------------------------------ */

function LocalTable({ state, update }: { state: LocalState; update: (fn: (s: LocalState) => LocalState) => void }) {
  const nav = useNavigate();
  const [newName, setNewName] = useState("");
  const leader = leaderId(state);
  const answerer = state.players.find((p) => p.id === state.buzzedId) ?? null;
  const hasQuestion = Boolean(state.question);

  const nextAndDraw = () => update((s) => drawQuestion(nextQuestion(s)));

  return (
    <div className="local">
      <header className="hud">
        <span className="brand brand--sm">
          <span className="brand__mark"><BellIcon /></span>
          كازينو الألعاب
        </span>
        <span className="tag tag--gold">طاولة واحدة</span>
        <span className="pill pill--gold">جولة {formatNumber(state.roundIndex)}</span>
        <span className="pill">{categoryLabel(state.categorySlug)}</span>
        <div className="hud__mid">
          <span className="pill pill--code"><b>{formatNumber(state.players.length)}</b> لاعبين</span>
          <button type="button" className="btn btn--ghost" onClick={() => update(finishGame)}>
            <TrophyIcon /> النتيجة
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => nav("/")}>خروج</button>
        </div>
      </header>

      <main className="local__grid">
        <section className={`stage local__stage${state.answer === "idle" && hasQuestion ? " stage--live" : ""}`}>
          <div className="stage__head">
            <span className="stage__label" data-live={state.answer === "idle" && hasQuestion ? "true" : "false"}>
              {state.question ? categoryName(state.question.categorySlug) : "الطاولة"}
            </span>
            <span className="pill">{state.question ? `سؤال ${formatNumber(state.roundIndex)}` : "استعد"}</span>
          </div>

          {state.question ? (
            <>
              <p className="question local__question">{state.question.text}</p>
              {state.question.mediaUrl && (
                <figure className="question-media">
                  <img
                    src={state.question.mediaUrl}
                    alt={state.question.text}
                    onError={(e) => {
                      const fig = e.currentTarget.closest("figure");
                      if (fig instanceof HTMLElement) fig.style.display = "none";
                    }}
                  />
                  {state.question.mediaCredit && <figcaption>{state.question.mediaCredit}</figcaption>}
                </figure>
              )}
              <div className="row local__stage-actions">
                <button type="button" className={`btn ${state.showAnswer ? "btn--gold" : ""}`} onClick={() => update(toggleAnswer)}>
                  <SparkIcon />
                  {state.showAnswer ? "إخفاء الإجابة" : "إظهار الإجابة"}
                </button>
                <button type="button" className="btn" onClick={() => update(skipQuestion)}>
                  <XIcon /> تخطّي
                </button>
              </div>
              {state.showAnswer && (
                <div className="answer">
                  <span className="answer__label">الإجابة الصح</span>
                  <span className="answer__text">{state.question.answer}</span>
                </div>
              )}
            </>
          ) : (
            <div className="local__empty">
              <span className="local__empty-mark"><CardsIcon /></span>
              <p className="muted">اختار التصنيف واسحب سؤال عشان الجولة تبدأ.</p>
              <button type="button" className="btn btn--gold btn--lg" onClick={() => update(drawQuestion)}>
                <CardsIcon /> اسحب سؤال
              </button>
            </div>
          )}
        </section>

        <section className="panel console local__controls">
          <div className="panel__head">
            <span className="panel__title">لوحة الحكم</span>
            <span className={`pill ${state.answer === "buzzed" ? "pill--live" : "pill--gold"}`}>
              {state.answer === "idle" && "الجرس مفتوح"}
              {state.answer === "buzzed" && "بيجاوب"}
              {state.answer === "correct" && "إجابة صح"}
              {state.answer === "wrong" && "إجابة غلط"}
            </span>
          </div>

          {!hasQuestion && (
            <p className="muted local__hint">اسحب سؤال الأول، وبعدين اسأل اللاعبين ودوس على أول واحد جاوب.</p>
          )}

          {hasQuestion && state.answer === "idle" && (
            <div className="local__buzz">
              <p className="local__prompt">مين داس الجرس الأول؟</p>
              <div className="local__buzz-grid">
                {state.players.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    className="local__buzz-btn"
                    onClick={() => update((s) => buzz(s, p.id))}
                  >
                    <span className="row" style={{ gap: 10 }}>
                      <span className={`avatar avatar--${(i % 3) + 1}`} aria-hidden="true">{p.name.charAt(0)}</span>
                      <b>{p.name}</b>
                    </span>
                    <BellIcon />
                  </button>
                ))}
              </div>
              <button type="button" className="btn btn--ghost" onClick={() => update(skipQuestion)}>
                محدش جاوب — السؤال الجاي
              </button>
            </div>
          )}

          {state.answer === "buzzed" && answerer && (
            <div className="local__answer-panel">
              <p className="local__prompt"><b>{answerer.name}</b> بيجاوب…</p>
              <div className="local__judge-actions">
                <button type="button" className="btn btn--gold btn--lg" onClick={() => update((s) => judgeAnswer(s, true))}>
                  <CheckIcon /> صح
                </button>
                <button type="button" className="btn btn--danger btn--lg" onClick={() => update((s) => judgeAnswer(s, false))}>
                  <XIcon /> غلط
                </button>
              </div>
              <button type="button" className="btn btn--ghost" onClick={() => update(resetBuzz)}>
                رجّع الجرس
              </button>
            </div>
          )}

          {state.answer === "correct" && answerer && (
            <div className="local__result local__result--ok">
              <span className="local__result-mark"><CheckIcon /></span>
              <div>
                <b>{answerer.name} جاوب صح</b>
                <p className="muted" style={{ margin: 0 }}>+{formatNumber(state.settings.pointsPerCorrect)} نقطة — كمّل للسؤال اللي بعده.</p>
              </div>
              <button type="button" className="btn btn--gold btn--lg" onClick={nextAndDraw}>
                <PlayIcon /> السؤال الجاي
              </button>
            </div>
          )}

          {state.answer === "wrong" && answerer && (
            <div className="local__result local__result--bad">
              <span className="local__result-mark"><XIcon /></span>
              <div>
                <b>{answerer.name} جاوب غلط</b>
                <p className="muted" style={{ margin: 0 }}>وزّع كارت إنذار لو حابب، أو كمّل على طول.</p>
              </div>
              <div className="row">
                <button type="button" className="btn" onClick={() => update((s) => playCard(s, answerer.id, "yellow"))}>
                  <CardsIcon style={{ color: "var(--gold-soft)" }} /> أصفر {formatNumber(state.settings.yellowPenalty)}
                </button>
                <button type="button" className="btn btn--danger" onClick={() => update((s) => playCard(s, answerer.id, "red"))}>
                  <CardsIcon /> أحمر {formatNumber(state.settings.redPenalty)}
                </button>
                <button type="button" className="btn btn--gold" onClick={nextAndDraw}>
                  <PlayIcon /> السؤال الجاي
                </button>
              </div>
            </div>
          )}
        </section>

        <aside className="panel local__players">
          <div className="panel__head">
            <span className="panel__title">اللاعبون</span>
            <span className="tag">{formatNumber(state.players.length)} من {formatNumber(MAX_LOCAL_PLAYERS)}</span>
          </div>
          <div className="local__seats">
            {state.players.map((p, i) => {
              const isBuzzed = state.buzzedId === p.id;
              return (
                <div className="local__seat" key={p.id} data-buzzed={isBuzzed ? "true" : "false"} data-leader={leader === p.id ? "true" : "false"}>
                  <span className={`avatar avatar--${(i % 3) + 1}`} aria-hidden="true">{p.name.charAt(0)}</span>
                  <div className="local__seat-body">
                    <span className="local__seat-name">
                      {p.name}
                      {leader === p.id && <CrownIcon className="crown" />}
                      {isBuzzed && <span className="tag tag--gold">بيجاوب</span>}
                    </span>
                    <span className="local__seat-meta">
                      {p.cards.length === 0 && <span className="muted">مفيش كروت</span>}
                      {p.cards.length > 0 && (
                        <span className="card-marks" aria-label="إنذارات">
                          {p.cards.map((c, idx) => <i key={idx} className={`card-mark card-mark--${c}`} />)}
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="score local__score" data-testid="local-score" data-name={p.name} data-sign={p.score < 0 ? "neg" : p.score > 0 ? "pos" : undefined}>
                    {formatNumber(p.score)}
                  </span>
                </div>
              );
            })}
          </div>

          {state.players.length < MAX_LOCAL_PLAYERS && (
            <div className="local__add local__add--inline">
              <input
                className="input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  update((s) => addLocalPlayer(s, newName));
                  setNewName("");
                }}
                placeholder="ضيف لاعب للطاولة…"
                maxLength={16}
                aria-label="اسم لاعب جديد"
              />
              <button
                type="button"
                className="btn btn--gold"
                disabled={!newName.trim()}
                onClick={() => {
                  update((s) => addLocalPlayer(s, newName));
                  setNewName("");
                }}
              >
                <UsersIcon /> ضيف
              </button>
            </div>
          )}

          <div className="arms local__manual">
            <span className="eyebrow">تعديل يدوي</span>
            {state.players.map((p) => (
              <div className="local__tool-row" key={p.id}>
                <b className="local__tool-name">{p.name}</b>
                <button type="button" onClick={() => update((s) => adjustScore(s, p.id, -1))} aria-label={`ناقص نقطة ${p.name}`}>−</button>
                <span className="local__tool-score">{formatNumber(p.score)}</span>
                <button type="button" onClick={() => update((s) => adjustScore(s, p.id, 1))} aria-label={`زود نقطة ${p.name}`}>+</button>
                <button type="button" className="local__tool-card" data-card="yellow" onClick={() => update((s) => playCard(s, p.id, "yellow"))} aria-label={`كارت أصفر ${p.name}`}>
                  <CardsIcon />
                </button>
                <button type="button" className="local__tool-card" data-card="red" onClick={() => update((s) => playCard(s, p.id, "red"))} aria-label={`كارت أحمر ${p.name}`}>
                  <CardsIcon />
                </button>
              </div>
            ))}
          </div>
        </aside>

        <section className="panel local__categories">
          <div className="panel__head">
            <span className="panel__title">التصنيف</span>
            <span className="tag">للجولات الجاية</span>
          </div>
          <div className="local__cat-list">
            <button type="button" data-on={state.categorySlug === null ? "true" : "false"} onClick={() => update((s) => setCategory(s, null))}>
              <ChipIcon /> كل التصنيفات
            </button>
            {CATEGORIES.map((c) => (
              <button key={c.slug} type="button" data-on={state.categorySlug === c.slug ? "true" : "false"} onClick={() => update((s) => setCategory(s, c.slug))}>
                {c.name}
              </button>
            ))}
          </div>
        </section>

        <section className="panel local__log">
          <div className="panel__head">
            <span className="panel__title">سجل الطاولة</span>
            <span className="tag">{formatNumber(state.log.length)}</span>
          </div>
          <div className="log">
            {state.log.length === 0 && <span className="empty-note">لسه مفيش أحداث.</span>}
            {state.log.map((l) => (
              <div className="log__row" key={l.id}>
                <time>{clock(l.at)}</time>
                <span><b>{l.text}</b></span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Results                                                             */
/* ------------------------------------------------------------------ */

function LocalResults({ state, onRematch, onNewTable }: { state: LocalState; onRematch: () => void; onNewTable: () => void }) {
  const nav = useNavigate();
  const sorted = useMemo(() => [...state.players].sort((a, b) => b.score - a.score), [state.players]);
  const { winnerId } = winnerOf(state.players);

  return (
    <div className="screen results local__results page-enter">
      <Confetti />
      <div className="results__head">
        <span className="eyebrow">نهاية الطاولة</span>
        <h1 className="title-xl" style={{ fontSize: "clamp(32px, 6vw, 56px)" }}>النتيجة النهائية</h1>
        <p className="lead">{winnerId ? "الطاولة قفلت — والفايز واضح." : "الطاولة قفلت — والتعادل جزء من اللعبة."}</p>
      </div>

      <div className="podium">
        {sorted.map((p, i) => (
          <div className="podium__slot" key={p.id} data-place={i + 1}>
            <span className={`avatar avatar--${(i % 3) + 1}`} style={{ width: 54, height: 54, fontSize: 20 }} aria-hidden="true">{p.name.charAt(0)}</span>
            <span className="podium__place">المركز {formatNumber(i + 1)}</span>
            <span className="podium__name">{p.name}</span>
            <span className="podium__score">{formatNumber(p.score)}</span>
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
        <button type="button" className="btn btn--gold btn--lg" onClick={onRematch}>
          <PlayIcon /> نفس اللاعبين
        </button>
        <button type="button" className="btn btn--lg" onClick={onNewTable}>
          <UsersIcon /> طاولة جديدة
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => { clearLocalState(); nav("/"); }}>
          الرئيسية
        </button>
      </div>

      <p className="muted" style={{ textAlign: "center", fontSize: 13 }}>
        نفس اللاعبين بيفضلوا بنفس الأسماء — النقط بس هي اللي بتتصفّر.
      </p>
    </div>
  );
}
