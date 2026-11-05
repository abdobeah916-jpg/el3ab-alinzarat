import type { RoomState } from "@casino/shared";
import type { CommandResult } from "./machine";
const stub = (): CommandResult => ({ ok: false, code: "wrong_state", message: "use machine" });
export function submitWords(_s: RoomState, _p: string, _w: string[], _at: number): CommandResult { return stub(); }
export function judgeWord(_s: RoomState, _p: string, _i: number, _a: boolean, _at: number): CommandResult { return stub(); }
export function computeLetterRaceWinner(state: RoomState): string | null {
  let best: string | null = null; let bestCount = -1; let bestScore = -Infinity;
  for (const sub of state.submissions) {
    const count = (sub.acceptedWords ?? []).filter(Boolean).length;
    const player = state.players.find((p) => p.id === sub.playerId);
    const score = player?.score ?? 0;
    if (count > bestCount || (count === bestCount && score > bestScore)) { best = sub.playerId; bestCount = count; bestScore = score; }
  }
  return best;
}
