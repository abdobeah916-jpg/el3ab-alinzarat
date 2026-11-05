import type { RoomState } from "@casino/shared";

export function orderedPresses(state: RoomState) {
  return [...(state.buzzer?.presses ?? [])].sort((a, b) => a.at - b.at || a.seq - b.seq);
}
export function buzzRank(state: RoomState, playerId: string): number | null {
  const idx = orderedPresses(state).findIndex((p) => p.playerId === playerId);
  return idx === -1 ? null : idx + 1;
}
export function hasBuzzed(state: RoomState, playerId: string): boolean {
  return (state.buzzer?.presses ?? []).some((p) => p.playerId === playerId);
}
