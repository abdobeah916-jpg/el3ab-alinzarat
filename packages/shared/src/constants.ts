import type { GameSettings, PowerupKey } from "./types";

export const MAX_PLAYERS = 3 as const;
export const POWERUP_KEYS = ["shank", "cobri", "salem"] as const satisfies readonly PowerupKey[];

export const CATEGORY_SLUGS = [
  "general",
  "sport",
  "history",
  "geography",
  "cinema",
  "music",
  "science",
  "culture",
  "egyptian-food",
  "ramadan-series",
  "national-songs",
] as const;

export const DEFAULT_SETTINGS: GameSettings = {
  questionCount: 10,
  pointsPerCorrect: 1,
  allowNegative: true,
  buzzerSeconds: 15,
  showQuestionToPlayers: false,
  showBuzzerNames: true,
  yellowPenalty: -1,
  redPenalty: -3,
  shankPenalty: -3,
  busSeconds: 90,
  busCategories: ["اسم", "بلد", "حيوان", "نبات", "جماد", "أكلة"],
  letterRaceMaxPoints: 5,
  salem: { answerer: "owner", applyOn: "correct", targetPenalty: -3, ownerPenaltyOnWrong: -1 },
};
