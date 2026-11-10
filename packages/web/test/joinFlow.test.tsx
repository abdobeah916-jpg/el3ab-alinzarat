import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { App } from "../src/App";

const joinRoom = vi.fn(async (code: string) => {
  void code;
  return { playerId: "p1", playerToken: "tok-1" };
});

vi.mock("../src/lib/api", () => ({
  onlineEnabled: () => true,
  warmUpServer: () => {},
  joinRoom: (code: string) => joinRoom(code),
}));

vi.mock("../src/lib/socket", () => ({
  createGameSocket: () => ({ on: vi.fn(), emit: vi.fn(), close: vi.fn() }),
  sendCommand: vi.fn(),
}));

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="path">{location.pathname}</span>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <LocationProbe />
    </MemoryRouter>
  );
}

describe("دخول اللاعب من /join", () => {
  beforeEach(() => {
    localStorage.clear();
    joinRoom.mockClear();
  });
  afterEach(() => localStorage.clear());

  it("بعد الانضمام يروح على /room/:code مش يفضل في /join", async () => {
    renderAt("/join");

    await userEvent.type(screen.getByLabelText("كود الغرفة"), "ABC123");
    await userEvent.type(screen.getByLabelText("اسمك"), "أحمد");
    await userEvent.click(screen.getByRole("button", { name: /دخول/ }));

    await waitFor(() => expect(screen.getByTestId("path").textContent).toBe("/room/ABC123"));
    expect(joinRoom).toHaveBeenCalledWith("ABC123");
    const session = JSON.parse(localStorage.getItem("casino.session") ?? "null");
    expect(session).toMatchObject({ role: "player", code: "ABC123", playerId: "p1" });
  });
});
