import type { GameSettings, PlayerState, RoomState } from "@casino/shared";
import type { CommandResult } from "./machine";

export function applyScoreChange(player: PlayerState, delta: number, settings: GameSettings): number {
  const next = player.score + delta;
  return settings.allowNegative ? next : Math.max(0, next);
}
export function playCard(_state: RoomState, _playerId: string, _card: "yellow" | "red", _at: number): CommandResult {
  return { ok: false, code: "wrong_state", message: "use machine" };
}
