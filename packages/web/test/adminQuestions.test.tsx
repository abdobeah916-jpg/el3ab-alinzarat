import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminQuestions } from "../src/pages/AdminQuestions";
const api = {
  list: vi.fn(async () => ({ items: [{ id: "q1", text: "عاصمة مصر؟", answer: "القاهرة", categorySlug: "geography", type: "capital", isActive: true }], total: 1 })),
  importJson: vi.fn(async () => ({ inserted: 2, skipped: 0, errors: [] })),
  setActive: vi.fn(async () => ({})),
};
describe("إدارة الأسئلة", () => {
  it("تطلب مفتاح الأدمن أولًا", () => {
    render(<AdminQuestions api={api as any} />);
    expect(screen.getByLabelText("مفتاح الأدمن")).toBeTruthy();
  });
  it("تعرض الأسئلة بعد إدخال المفتاح", async () => {
    render(<AdminQuestions api={api as any} />);
    await userEvent.type(screen.getByLabelText("مفتاح الأدمن"), "test-key");
    await userEvent.click(screen.getByRole("button", { name: "دخول" }));
    expect(await screen.findByText("عاصمة مصر؟")).toBeTruthy();
  });
  it("تستورد JSON وتعرض تقريرًا", async () => {
    render(<AdminQuestions api={api as any} initialKey="test-key" />);
    await userEvent.click(await screen.findByRole("button", { name: "استيراد" }));
    await userEvent.type(screen.getByLabelText("أسئلة JSON"), '[{"text":"س"}]');
    await userEvent.click(screen.getByRole("button", { name: "نفّذ الاستيراد" }));
    expect(await screen.findByText("تمت إضافة 2")).toBeTruthy();
  });
});
