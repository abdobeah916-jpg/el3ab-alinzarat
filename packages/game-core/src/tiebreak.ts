import type { RoomState } from "@casino/shared";

export function computeWinner(state: RoomState): { winnerId: string | null; tied: string[] } {
  if (state.players.length === 0) return { winnerId: null, tied: [] };
  const max = Math.max(...state.players.map((p) => p.score));
  const winners = state.players.filter((p) => p.score === max).map((p) => p.id);
  if (winners.length === 1) return { winnerId: winners[0]!, tied: [] };
  return { winnerId: null, tied: winners };
}
export function nextRound(_state: RoomState, _at: number): never { throw new Error("use machine"); }
export function startTieBreaker(_state: RoomState, _at: number): never { throw new Error("use machine"); }
