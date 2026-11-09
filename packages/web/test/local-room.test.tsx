import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LocalRoom } from "../src/pages/LocalRoom";
import { formatNumber } from "../src/lib/format";

function scoreOf(name: string): string | null {
  return document.querySelector(`[data-testid="local-score"][data-name="${name}"]`)?.textContent ?? null;
}

describe("شاشة الجهاز الواحد", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("يضيف اللاعبين ويحسب نقطة للإجابة الصح", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><LocalRoom /></MemoryRouter>);

    const input = screen.getByLabelText("اسم اللاعب");
    await user.type(input, "أحمد");
    await user.click(screen.getByRole("button", { name: /ضيف/ }));

    await user.type(input, "سارة");
    await user.click(screen.getByRole("button", { name: /ضيف/ }));

    await user.click(screen.getByRole("button", { name: /ابدأ اللعب/ }));

    await user.click(screen.getByRole("button", { name: /اسحب سؤال/ }));
    expect(screen.getByText("مين داس الجرس الأول؟")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "أحمد" }));
    expect(screen.getByRole("button", { name: /غلط/ })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /صح/ }));
    expect(scoreOf("أحمد")).toBe(formatNumber(1));
    expect(scoreOf("سارة")).toBe(formatNumber(0));
  });

  it("يخصم كارت أحمر من النقط", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><LocalRoom /></MemoryRouter>);

    const input = screen.getByLabelText("اسم اللاعب");
    await user.type(input, "أحمد");
    await user.click(screen.getByRole("button", { name: /ضيف/ }));
    await user.type(input, "سارة");
    await user.click(screen.getByRole("button", { name: /ضيف/ }));
    await user.click(screen.getByRole("button", { name: /ابدأ اللعب/ }));

    await user.click(screen.getByRole("button", { name: "كارت أحمر أحمد" }));
    expect(scoreOf("أحمد")).toBe(formatNumber(-3));
  });

  it("يضيف لاعب تالت من داخل الطاولة", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><LocalRoom /></MemoryRouter>);

    const input = screen.getByLabelText("اسم اللاعب");
    await user.type(input, "أحمد");
    await user.click(screen.getByRole("button", { name: /ضيف/ }));
    await user.type(input, "سارة");
    await user.click(screen.getByRole("button", { name: /ضيف/ }));
    await user.click(screen.getByRole("button", { name: /ابدأ اللعب/ }));

    const inline = screen.getByLabelText("اسم لاعب جديد");
    await user.type(inline, "محمود");
    await user.click(screen.getAllByRole("button", { name: /ضيف/ }).at(-1)!);

    expect(scoreOf("محمود")).toBe(formatNumber(0));
    expect(screen.queryByLabelText("اسم لاعب جديد")).toBeNull();
  });
});
