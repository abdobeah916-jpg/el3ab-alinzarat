import { DEFAULT_SETTINGS, MAX_PLAYERS } from "@casino/shared";
import type { GameSettings, RoomState } from "@casino/shared";

export function createInitialState(input: { roomCode: string; settings?: Partial<GameSettings>; players?: { id: string; name: string }[] }): RoomState {
  const players = input.players ?? [];
  if (players.length > MAX_PLAYERS) throw new Error("room_full");
  const settings = { ...structuredClone(DEFAULT_SETTINGS), ...(input.settings ?? {}) };
  settings.salem = { ...DEFAULT_SETTINGS.salem, ...(input.settings?.salem ?? {}) };
  return {
    roomCode: input.roomCode,
    state: "lobby",
    paused: false,
    resumeState: null,
    seq: 0,
    roundKind: "buzzer",
    settings,
    players: players.map((p) => ({ id: p.id, name: p.name, score: 0, isEliminated: false, isConnected: false, powerupKey: null, powerupState: "none" as const, joinedAt: Date.now() })),
    currentQuestion: null,
    selectedCategory: null,
    usedQuestionIds: [],
    buzzer: null,
    answererId: null,
    pendingPowerup: null,
    salem: null,
    nextCategoryOverride: null,
    submissions: [],
    busLetter: null,
    submissionsClosedAt: null,
    rumble: null,
    round: { index: 1, tieBreaker: false, winnerId: null, cards: [] },
    usedCards: [],
    events: 0,
  };
}
