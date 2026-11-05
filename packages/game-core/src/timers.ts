import type { RoomState } from "@casino/shared";

export function getBuzzerDeadline(state: RoomState): number | null {
  return state.buzzer?.deadline ?? null;
}
export function computeBuzzerDeadline(openedAt: number, seconds: number): number {
  return openedAt + seconds * 1000;
}
export function isRoundKindCompatible(state: RoomState): boolean {
  return state.roundKind === "buzzer" || state.roundKind === "bus" || state.roundKind === "letter_race" || state.roundKind === "rumble";
}
