import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PlayerRoom } from "../src/pages/PlayerRoom";

const view = (over: any = {}) => ({
  code: "ABC123", state: "question_active", roundKind: "buzzer",
  me: { id: "p1", name: "أحمد", score: 3, powerupKey: "shank", powerupState: "reserved", isConnected: true, isEliminated: false },
  players: [
    { id: "p1", name: "أحمد", score: 3, isConnected: true },
    { id: "p2", name: "سارة", score: 1, isConnected: true },
  ],
  question: { id: "q1", text: "ما هي عاصمة مصر؟", type: "capital" },
  buzzer: { isOpen: true, deadline: Date.now() + 10_000, myRank: null, pressCount: 1 },
  settings: { showQuestionToPlayers: true, showBuzzerNames: true, allowNegative: true },
  ...over,
});

describe("شاشة اللاعب", () => {
  it("ترسل ضغطة واحدة فقط وتقفل الجرس بعدها", async () => {
    const send = vi.fn();
    render(<MemoryRouter><PlayerRoom view={view()} send={send} connection="connected" /></MemoryRouter>);
    const bell = screen.getByRole("button", { name: /دوس الجرس/ });
    await userEvent.click(bell);
    await userEvent.click(bell);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("تعرض ترتيب الضغط بعد رد السيرفر", () => {
    render(<MemoryRouter><PlayerRoom view={view({ buzzer: { ...view().buzzer, myRank: 1 } })} send={vi.fn()} connection="connected" /></MemoryRouter>);
    expect(screen.getByText(/أنت الأول/)).toBeTruthy();
  });

  it("تعرض بانر إعادة الاتصال", () => {
    render(<MemoryRouter><PlayerRoom view={view()} send={vi.fn()} connection="reconnecting" /></MemoryRouter>);
    expect(screen.getByText("بنجرب نرجع الاتصال…")).toBeTruthy();
  });

  it("تقفل الجرس بعد قفله من الخادم", () => {
    render(<MemoryRouter><PlayerRoom view={view({ buzzer: { ...view().buzzer, isOpen: false } })} send={vi.fn()} connection="connected" /></MemoryRouter>);
    expect(screen.getByRole("button", { name: /الجرس مقفول/ })).toBeDisabled();
  });
});
