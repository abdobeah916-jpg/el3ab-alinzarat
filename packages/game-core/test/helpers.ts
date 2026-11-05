import { applyCommand, createInitialState } from "../src";
import { makeQuestion } from "./fixtures";

let seq = 0;
function next(state: any, command: any, actorId = "judge", role: "judge" | "player" | "system" = "judge", at = 5_000): any {
  seq += 1;
  const r: any = applyCommand(state, { id: `c${seq}`, actorId, role, expectedState: state.state, command }, { at, seq });
  if (!r.ok) throw new Error(`helper failed: ${r.code} ${r.message}`);
  return r.state;
}

export function startBuzzerRound(openedAt = 1_000, buzzerSeconds = 10): any {
  seq = 0;
  let s = createInitialState({ roomCode: "ABC123", players: [{ id: "p1", name: "أحمد" }, { id: "p2", name: "سارة" }, { id: "p3", name: "محمود" }] });
  s = next(s, { type: "judge:openPowerupSelection" }, "judge", "judge", openedAt);
  s = next(s, { type: "judge:startGame" }, "judge", "judge", openedAt);
  s = next(s, { type: "judge:selectRoundKind", kind: "buzzer" }, "judge", "judge", openedAt);
  s = next(s, { type: "judge:beginRound" }, "judge", "judge", openedAt);
  s = next(s, { type: "judge:selectQuestion", question: makeQuestion() }, "judge", "judge", openedAt);
  s = next(s, { type: "judge:startQuestion" }, "judge", "judge", openedAt);
  // override deadline per args
  s.buzzer = { isOpen: true, openedAt, deadline: openedAt + buzzerSeconds * 1000, presses: [] };
  return s;
}
export function startAnswering(): any {
  let s = startBuzzerRound();
  s = next(s, { type: "player:buzz" }, "p1", "player", 2_000);
  s = next(s, { type: "judge:closeBuzzer" }, "judge", "judge", 2_100);
  s = next(s, { type: "judge:selectAnswerer", playerId: "p1" }, "judge", "judge", 2_200);
  return s;
}
export function readyRoomWithPowerups(): any {
  seq = 0;
  let s = createInitialState({ roomCode: "ABC123", players: [{ id: "p1", name: "أحمد" }, { id: "p2", name: "سارة" }, { id: "p3", name: "محمود" }] });
  s = next(s, { type: "judge:openPowerupSelection" }, "judge", "judge", 1_000);
  s = next(s, { type: "player:choosePowerup", key: "shank" }, "p1", "player", 1_100);
  s = next(s, { type: "player:choosePowerup", key: "cobri" }, "p2", "player", 1_200);
  s = next(s, { type: "player:choosePowerup", key: "salem" }, "p3", "player", 1_300);
  s = next(s, { type: "judge:startGame" }, "judge", "judge", 1_400);
  return s;
}
export function startBusRound(): any {
  seq = 0;
  let s = createInitialState({ roomCode: "ABC123", players: [{ id: "p1", name: "أحمد" }, { id: "p2", name: "سارة" }, { id: "p3", name: "محمود" }] });
  s = next(s, { type: "judge:openPowerupSelection" }, "judge", "judge", 1_000);
  s = next(s, { type: "judge:startGame" }, "judge", "judge", 1_100);
  s = next(s, { type: "judge:selectRoundKind", kind: "bus" }, "judge", "judge", 1_200);
  s = next(s, { type: "judge:beginRound" }, "judge", "judge", 1_300);
  s = next(s, { type: "judge:setBusLetter", letter: "س" }, "judge", "judge", 1_400);
  s = next(s, { type: "judge:startQuestion" }, "judge", "judge", 1_500);
  return s;
}
export function startLetterRace(letter = "س"): any {
  seq = 0;
  let s = createInitialState({ roomCode: "ABC123", players: [{ id: "p1", name: "أحمد" }, { id: "p2", name: "سارة" }, { id: "p3", name: "محمود" }] });
  s = next(s, { type: "judge:openPowerupSelection" }, "judge", "judge", 1_000);
  s = next(s, { type: "judge:startGame" }, "judge", "judge", 1_100);
  s = next(s, { type: "judge:selectRoundKind", kind: "letter_race" }, "judge", "judge", 1_200);
  s = next(s, { type: "judge:beginRound" }, "judge", "judge", 1_300);
  s = next(s, { type: "judge:setBusLetter", letter }, "judge", "judge", 1_400);
  s = next(s, { type: "judge:startQuestion" }, "judge", "judge", 1_500);
  return s;
}
export function startRumble(over: { answer?: string; acceptedAnswers?: string[] } = {}): any {
  seq = 0;
  let s = createInitialState({ roomCode: "ABC123", players: [{ id: "p1", name: "أحمد" }, { id: "p2", name: "سارة" }, { id: "p3", name: "محمود" }] });
  s = next(s, { type: "judge:openPowerupSelection" }, "judge", "judge", 1_000);
  s = next(s, { type: "judge:startGame" }, "judge", "judge", 1_100);
  s = next(s, { type: "judge:selectRoundKind", kind: "rumble" }, "judge", "judge", 1_200);
  s = next(s, { type: "judge:beginRound" }, "judge", "judge", 1_300);
  s = next(s, { type: "judge:selectQuestion", question: makeQuestion({ answer: over.answer ?? "القاهرة", acceptedAnswers: over.acceptedAnswers ?? [] }) }, "judge", "judge", 1_400);
  s = next(s, { type: "judge:startQuestion" }, "judge", "judge", 1_500);
  return s;
}
export function submitAll(state: any, answers: Record<string, string>): any {
  let s = state;
  for (const [playerId, answer] of Object.entries(answers)) {
    seq += 1;
    const r: any = applyCommand(s, { id: `c${seq}`, actorId: playerId, role: "player", expectedState: s.state, command: { type: "player:submitRound", payload: { kind: "rumble", answer } } }, { at: 20_000, seq });
    if (!r.ok) throw new Error(`submitAll ${playerId}: ${r.code}`);
    s = r.state;
  }
  return s;
}
