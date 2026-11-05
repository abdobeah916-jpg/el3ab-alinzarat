export type State = "lobby" | "setup" | "powerup_selection" | "ready" | "round_intro" | "question_setup" | "question_active" | "buzzer_locked" | "answering" | "judging" | "card_action" | "result" | "next_question" | "finished" | "tie_breaker" | "simultaneous_active" | "submissions_closed" | "reveal";
export type RoundKind = "buzzer" | "bus" | "letter_race" | "rumble";
export type PowerupKey = "shank" | "cobri" | "salem";
export type PowerupState = "none" | "reserved" | "used";
export type QuestionType = "open" | "mcq" | "true_false" | "capital" | "quote" | "proverb" | "actor" | "reversed" | "reversed_song" | "description" | "song" | "singer_song" | "movie_line" | "movie_scene" | "number_guess" | "flag" | "city_image";
export type SalemSettings = { answerer: "owner" | "target"; applyOn: "correct" | "wrong"; targetPenalty: number; ownerPenaltyOnWrong: number };
export type GameSettings = {
  questionCount: number; pointsPerCorrect: number; allowNegative: boolean;
  buzzerSeconds: number; showQuestionToPlayers: boolean; showBuzzerNames: boolean;
  yellowPenalty: number; redPenalty: number; shankPenalty: number;
  busSeconds: number; busCategories: string[]; letterRaceMaxPoints: number; salem: SalemSettings;
};
export type PlayerState = {
  id: string; name: string; score: number; isEliminated: boolean; isConnected: boolean;
  powerupKey: PowerupKey | null; powerupState: PowerupState; joinedAt: number;
};
export type Question = {
  id: string; categorySlug: string; text: string; answer: string; acceptedAnswers: string[];
  type: QuestionType; difficulty: "easy" | "medium" | "hard"; options?: string[];
  correctIndex?: number; mediaUrl?: string; mediaType?: "image" | "none";
  mediaCredit?: string; letter?: string; answerMode?: "single" | "grid" | "choice";
};
export type Category = { slug: string; name: string; isCustom?: boolean };
export type SubmissionPayload = { kind: "bus"; answers: Record<string, string> } | { kind: "letter_race"; words: string[] } | { kind: "rumble"; answer: string };
export type RoomState = {
  roomCode: string; state: State; paused: boolean; resumeState: State | null; seq: number;
  roundKind: RoundKind; settings: GameSettings; players: PlayerState[];
  currentQuestion: Question | null; selectedCategory: string | null; usedQuestionIds: string[];
  buzzer: { isOpen: boolean; openedAt: number | null; deadline: number | null; presses: { playerId: string; at: number; seq: number }[] } | null;
  answererId: string | null;
  pendingPowerup: { ownerId: string; key: PowerupKey; targetId?: string; categorySlug?: string; returnState: State } | null;
  salem: { ownerId: string; targetId: string; state: "active" } | null;
  nextCategoryOverride: string | null;
  submissions: { playerId: string; payload: SubmissionPayload; acceptedCells?: Record<string, boolean>; acceptedWords?: boolean[] }[];
  busLetter: string | null; submissionsClosedAt: number | null;
  rumble: { verdicts: Record<string, "correct" | "wrong">; confirmed: boolean; replayed: boolean; eliminatedBefore: string[] } | null;
  round: { index: number; tieBreaker: boolean; winnerId: string | null; cards: { playerId: string; card: "yellow" | "red" }[] };
  usedCards: { playerId: string; card: "yellow" | "red" }[];
  events: number;
};
