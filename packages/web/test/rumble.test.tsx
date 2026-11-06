import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RumbleRound } from "../src/pages/RumbleRound";
import { Results } from "../src/pages/Results";
const view = (over: any = {}) => ({
  code: "ABC123", state: "simultaneous_active", roundKind: "rumble",
  me: { id: "p1", name: "أحمد" },
  players: [
    { id: "p1", name: "أحمد", score: 0, isEliminated: false },
    { id: "p2", name: "سارة", score: 0, isEliminated: false },
    { id: "p3", name: "محمود", score: 0, isEliminated: true },
  ],
  question: { id: "q1", text: "ما هي عاصمة مصر؟", type: "capital" },
  submissions: [],
  settings: {},
  ...over,
});
describe("رويال رامبل", () => {
  it("يعرض الفايز والترتيب", () => {
    render(<Results players={view().players} winnerId="p2" tied={[]} onTieBreak={vi.fn()} onRematch={vi.fn()} />);
    expect(screen.getByText(/سارة/)).toBeTruthy();
    expect(screen.getByText("الفايز")).toBeTruthy();
  });
  it("يعرض زر السؤال الفاصل عند التعادل", async () => {
    const onTieBreak = vi.fn();
    render(<Results players={view().players} winnerId={null} tied={["p1", "p2"]} onTieBreak={onTieBreak} onRematch={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "سؤال فاصل" }));
    expect(onTieBreak).toHaveBeenCalled();
  });
});
