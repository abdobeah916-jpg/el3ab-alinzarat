import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Lobby } from "../src/pages/Lobby";

const view = (over: any = {}) => ({
  code: "ABC123", state: "powerup_selection", roundKind: "buzzer",
  players: [
    { id: "p1", name: "أحمد", score: 0, powerupKey: null, powerupState: "none", isConnected: true, isEliminated: false },
    { id: "p2", name: "سارة", score: 0, powerupKey: "shank", powerupState: "reserved", isConnected: true, isEliminated: false },
  ],
  me: { id: "p1", name: "أحمد", score: 0, powerupKey: null, powerupState: "none", isConnected: true, isEliminated: false },
  settings: { showQuestionToPlayers: false },
  ...over,
});

describe("لوبي اللاعب", () => {
  it("يعرض الكروت الثلاثة ويقفل المحجوز", () => {
    render(<MemoryRouter><Lobby view={view()} onChoose={vi.fn()} /></MemoryRouter>);
    expect(screen.getByText("شنك الحرمية")).toBeTruthy();
    expect(screen.getByRole("button", { name: /شنك الحرمية/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /كوبري/ })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /سلم وتعبان/ })).not.toBeDisabled();
  });

  it("يرسل اختيار الكارت مرة واحدة", async () => {
    const onChoose = vi.fn();
    render(<MemoryRouter><Lobby view={view()} onChoose={onChoose} /></MemoryRouter>);
    await userEvent.click(screen.getByRole("button", { name: /كوبري/ }));
    expect(onChoose).toHaveBeenCalledWith("cobri");
  });

  it("يعرض كود الغرفة وعدد اللاعبين ٢ من ٣", () => {
    render(<MemoryRouter><Lobby view={view()} onChoose={vi.fn()} /></MemoryRouter>);
    expect(screen.getByText("ABC123")).toBeTruthy();
    expect(screen.getByText("٢ / ٣")).toBeTruthy();
  });
});
