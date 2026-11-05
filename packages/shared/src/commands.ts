import type { PowerupKey, Question, RoundKind, State, SubmissionPayload } from "./types";

export type { SubmissionPayload } from "./types";
export type { PowerupKey, Question, RoundKind, State } from "./types";

export type Command =
  | { type: "system:addPlayer"; player: { id: string; name: string } }
  | { type: "system:removePlayer"; playerId: string }
  | { type: "system:setConnection"; playerId: string; connected: boolean }
  | { type: "judge:openPowerupSelection" } | { type: "judge:startGame" }
  | { type: "judge:selectRoundKind"; kind: RoundKind } | { type: "judge:beginRound" }
  | { type: "judge:selectCategory"; categorySlug: string }
  | { type: "judge:selectQuestion"; question: Question }
  | { type: "judge:startQuestion" } | { type: "judge:openBuzzer" } | { type: "judge:closeBuzzer" }
  | { type: "judge:selectAnswerer"; playerId: string }
  | { type: "judge:markCorrect" } | { type: "judge:markWrong" }
  | { type: "judge:playCard"; playerId: string; card: "yellow" | "red" }
  | { type: "judge:adjustScore"; playerId: string; delta: number; reason: string }
  | { type: "judge:resolvePowerup"; approve: boolean }
  | { type: "judge:closeSubmissions" } | { type: "judge:openReveal" }
  | { type: "judge:endQuestion" } | { type: "judge:setBusLetter"; letter: string }
  | { type: "judge:judgeBusCell"; playerId: string; category: string; accepted: boolean }
  | { type: "judge:judgeWord"; playerId: string; wordIndex: number; accepted: boolean }
  | { type: "judge:approveAllSubmissions" }
  | { type: "judge:setRumbleVerdict"; playerId: string; verdict: "correct" | "wrong" }
  | { type: "judge:confirmRumbleResult" }
  | { type: "judge:skipQuestion" } | { type: "judge:nextQuestion" } | { type: "judge:endGame" }
  | { type: "judge:startTieBreaker" } | { type: "judge:declareTie" } | { type: "judge:rematch" }
  | { type: "judge:pause" } | { type: "judge:resume" }
  | { type: "system:deadline" }
  | { type: "player:choosePowerup"; key: PowerupKey }
  | { type: "player:activatePowerup"; targetId?: string; categorySlug?: string }
  | { type: "player:chooseSalemTarget"; targetId: string }
  | { type: "player:buzz" } | { type: "player:submitRound"; payload: SubmissionPayload }
  | { type: "player:callBus" };

export type CommandEnvelope = { id: string; actorId: string; role: "judge" | "player" | "system"; expectedState: State; command: Command };
export type RejectCode = "wrong_state" | "not_allowed" | "room_full" | "duplicate_powerup" | "invalid_payload" | "already_used" | "wrong_phase" | "tie_needed";
