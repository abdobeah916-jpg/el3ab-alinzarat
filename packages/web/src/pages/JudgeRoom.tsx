import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { createGameSocket, sendCommand } from "../lib/socket";
import { loadSession } from "../lib/tokenStore";
import { useGameStore } from "../store/gameStore";
import { QuestionCard } from "../components/QuestionCard";
import { Scoreboard } from "../components/Scoreboard";
import { Lobby } from "./Lobby";
import { BusRound } from "./BusRound";
import { RumbleRound } from "./RumbleRound";
import { Results } from "./Results";

export function JudgeRoom({ view: propView, send }: { view?: any; send?: any } = {}) {
  const [view, setView] = useState<any>(propView ?? null);
  const params = useParams();
  const code = params.code ?? "";
  const session = loadSession();
  const setViewStore = useGameStore((s) => s.setView);

  useEffect(() => { if (!code || !session) return; const socket = createGameSocket(session); socket.on("state:patch", (v: any) => { setView(v); setViewStore(v); }); return () => { socket.close(); }; }, [code]);

  const cmd = (command: any) => {
    if (send) return send(command);
    const socket = createGameSocket(session!);
    return sendCommand(socket, { id: crypto.randomUUID(), actorId: "judge", role: "judge", expectedState: view?.state ?? "lobby", command });
  };

  if (!view) return <div>بيحمل…</div>;
  if (view.state === "lobby" || view.state === "powerup_selection") return <Lobby view={view} onChoose={undefined} />;
  if (view.state === "finished") return <Results players={view.players} winnerId={view.round?.winnerId} tied={[]} onTieBreak={() => cmd({ type: "judge:startTieBreaker" })} onRematch={() => cmd({ type: "judge:rematch" })} />;

  return (
    <main>
      <div data-testid="room-code">{view.code}</div>
      <QuestionCard question={view.question} showAnswer />
      <Scoreboard players={view.players} />
      {view.roundKind === "bus" && <BusRound view={view} send={cmd} />}
      {view.roundKind === "rumble" && <RumbleRound view={view} send={cmd} />}
      {(view.state === "question_active" || view.state === "buzzer_locked") && <button onClick={() => cmd({ type: "judge:closeBuzzer" })}>اقفل الجرس</button>}
      {view.state === "answering" && (
        <div>
          <button onClick={() => cmd({ type: "judge:markCorrect" })}>صح</button>
          <button onClick={() => cmd({ type: "judge:markWrong" })}>غلط</button>
        </div>
      )}
      {view.state === "card_action" && (
        <div>
          {view.players.map((p: any) => (
            <span key={p.id}>
              <button aria-label={`إنذار أصفر لـ${p.name}`} onClick={() => cmd({ type: "judge:playCard", playerId: p.id, card: "yellow" })}>إنذار أصفر لـ{p.name}</button>
              <button aria-label={`إنذار أحمر لـ${p.name}`} onClick={() => cmd({ type: "judge:playCard", playerId: p.id, card: "red" })}>إنذار أحمر لـ{p.name}</button>
            </span>
          ))}
          <button onClick={() => cmd({ type: "judge:endQuestion" })}>إنهاء السؤال</button>
        </div>
      )}
      {view.state === "result" && (
        <div>
          <button onClick={() => cmd({ type: "judge:nextQuestion" })}>الجولة التالية</button>
          <button onClick={() => cmd({ type: "judge:endGame" })}>إنهاء اللعبة</button>
        </div>
      )}
      {view.state === "ready" && (
        <div>
          {["buzzer", "bus", "letter_race", "rumble"].map((k) => (
            <button key={k} onClick={() => cmd({ type: "judge:selectRoundKind", kind: k })}>{k === "buzzer" ? "جرس" : k === "bus" ? "أتوبيس" : k === "letter_race" ? "أكتر كلمات" : "رويال رامبل"}</button>
          ))}
        </div>
      )}
      {view.state === "round_intro" && <button onClick={() => cmd({ type: "judge:beginRound" })}>ابدأ الجولة</button>}
      {view.state === "question_setup" && (
        <div>
          <button onClick={() => cmd({ type: "judge:selectCategory", categorySlug: "general" })}>general</button>
          <button onClick={() => cmd({ type: "judge:selectQuestion" })}>اسحب سؤال</button>
          <button onClick={() => cmd({ type: "judge:startQuestion" })}>ابدأ السؤال</button>
        </div>
      )}
      {view.state === "next_question" && (
        <div>
          {["buzzer", "bus", "letter_race", "rumble"].map((k) => (
            <button key={k} onClick={() => cmd({ type: "judge:selectRoundKind", kind: k })}>{k === "buzzer" ? "جرس" : k === "bus" ? "أتوبيس" : k === "letter_race" ? "أكتر كلمات" : "رويال رامبل"}</button>
          ))}
          <button onClick={() => cmd({ type: "judge:endGame" })}>إنهاء اللعبة</button>
        </div>
      )}
      {view.state === "submissions_closed" && (
        <div>
          <button onClick={() => cmd({ type: "judge:openReveal" })}>اكشف الإجابات</button>
          <button onClick={() => cmd({ type: "judge:confirmRumbleResult" })}>اعتمد النتيجة</button>
        </div>
      )}
      {view.state === "reveal" && (
        <div>
          <button onClick={() => cmd({ type: "judge:approveAllSubmissions" })}>اعتمد الكل</button>
          <button onClick={() => cmd({ type: "judge:nextQuestion" })}>الجولة التالية</button>
        </div>
      )}
      {view.state === "simultaneous_active" && <button onClick={() => cmd({ type: "judge:closeSubmissions" })}>اقفل الإرسال</button>}
      {view.state === "tie_breaker" && <button onClick={() => cmd({ type: "judge:declareTie" })}>تعادل</button>}
    </main>
  );
}
