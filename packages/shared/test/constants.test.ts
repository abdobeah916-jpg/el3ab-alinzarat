import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, MAX_PLAYERS, POWERUP_KEYS } from "../src/constants";

describe("constants", () => {
  it("يحمل القيم الافتراضية المعتمدة", () => {
    expect(DEFAULT_SETTINGS).toMatchObject({
      questionCount: 10, pointsPerCorrect: 1, allowNegative: true,
      buzzerSeconds: 15, showQuestionToPlayers: false, showBuzzerNames: true,
      yellowPenalty: -1, redPenalty: -3, shankPenalty: -3,
      busSeconds: 90, letterRaceMaxPoints: 5,
    });
    expect(DEFAULT_SETTINGS.busCategories).toEqual(["اسم", "بلد", "حيوان", "نبات", "جماد", "أكلة"]);
  });
  it("ثلاثة لاعبين وثلاثة كروت فقط", () => {
    expect(MAX_PLAYERS).toBe(3);
    expect(POWERUP_KEYS).toEqual(["shank", "cobri", "salem"]);
  });
});
