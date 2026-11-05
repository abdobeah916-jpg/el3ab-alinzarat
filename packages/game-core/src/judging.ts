import type { RoomState } from "@casino/shared";
import type { CommandResult } from "./machine";

export function judgeAnswer(_state: RoomState, _verdict: "correct" | "wrong", _at: number): CommandResult {
  // Thin wrapper kept for interface; real judging lives in machine.ts markCorrect/markWrong.
  return { ok: false, code: "wrong_state", message: "use machine" };
}
export function playCard(_state: RoomState, _playerId: string, _card: "yellow" | "red", _at: number): CommandResult {
  return { ok: false, code: "wrong_state", message: "use machine" };
}
