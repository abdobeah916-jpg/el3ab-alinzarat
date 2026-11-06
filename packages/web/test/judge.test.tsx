import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { JudgeRoom } from "../src/pages/JudgeRoom";
const base = (over: any = {}) => ({
  code: "ABC123", state: "question_active", roundKind: "buzzer",
  players: [
    { id: "p1", name: "أحمد", score: 2, powerupKey: "shank", powerupState: "reserved", isConnected: true, isEliminated: false },
    { id: "p2", name: "سارة", score: -1, powerupKey: null, powerupState: "none", isConnected: true, isEliminated: false },
  ],
  me: { id: "judge", name: "الحكم" },
  question: { id: "q1", text: "ما هي عاصمة مصر؟", answer: "القاهرة", categorySlug: "geography", type: "capital" },
  buzzer: { isOpen: true, deadline: Date.now() + 10_000, presses: [{ playerId: "p1", playerName: "أحمد" }] },
  settings: { buzzerSeconds: 15, showQuestionToPlayers: false, showBuzzerNames: true, allowNegative: true, yellowPenalty: -1, redPenalty: -3 },
  ...over,
});
describe("لوحة الحكم", () => {
  it("تعرض السؤال والإجابة للحكم فقط", () => {
    render(<MemoryRouter><JudgeRoom view={base()} send={vi.fn()} /></MemoryRouter>);
    expect(screen.getByText("ما هي عاصمة مصر؟")).toBeTruthy();
    expect(screen.getByText("القاهرة")).toBeTruthy();
  });
  it("ترسل الكارت الأصفر للاعب المحدد", async () => {
    const send = vi.fn();
    render(<MemoryRouter><JudgeRoom view={base({ state: "card_action" })} send={send} /></MemoryRouter>);
    await userEvent.click(screen.getByRole("button", { name: "إنذار أصفر لأحمد" }));
    expect(send).toHaveBeenCalledWith({ type: "judge:playCard", playerId: "p1", card: "yellow" });
  });
});
