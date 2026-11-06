import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BusRound } from "../src/pages/BusRound";
const view = (over: any = {}) => ({
  code: "ABC123", state: "simultaneous_active", roundKind: "bus", busLetter: "س",
  me: { id: "p1", name: "أحمد" },
  players: [{ id: "p1", name: "أحمد" }, { id: "p2", name: "سارة" }],
  settings: { busCategories: ["اسم", "بلد", "حيوان"], busSeconds: 90 },
  submissions: [],
  ...over,
});
describe("أتوبيس", () => {
  it("يعرض الحرف والفئات", () => {
    render(<BusRound view={view()} send={vi.fn()} />);
    expect(screen.getByText("س")).toBeTruthy();
    expect(screen.getByLabelText("اسم")).toBeTruthy();
  });
  it("يرسل الإجابات مرة واحدة", async () => {
    const send = vi.fn();
    render(<BusRound view={view()} send={send} />);
    await userEvent.type(screen.getByLabelText("اسم"), "سمك");
    await userEvent.click(screen.getByRole("button", { name: "إرسال" }));
    expect(send).toHaveBeenCalledWith({ type: "player:submitRound", payload: { kind: "bus", answers: { "اسم": "سمك" } } });
  });
  it("لا يسمح بالإضافة بعد الإرسال", async () => {
    const send = vi.fn();
    render(<BusRound view={view({ submissions: [{ playerId: "p1", submitted: true }] })} send={send} />);
    expect(screen.getByText("وصلت إجاباتك")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "إرسال" })).toBeNull();
  });
  it("زر أتوبيس يطلب تأكيدًا", async () => {
    const send = vi.fn();
    render(<BusRound view={view()} send={send} />);
    await userEvent.click(screen.getByRole("button", { name: "أتوبيس!" }));
    await userEvent.click(screen.getByRole("button", { name: "أيوه، أتوبيس" }));
    expect(send).toHaveBeenCalledWith({ type: "player:callBus" });
  });
});
