import type { CommandEnvelope, GameEvent, PlayerState, RejectCode, RoomState } from "@casino/shared";
import { MAX_PLAYERS, POWERUP_KEYS } from "@casino/shared";

export type CommandResult = { ok: true; state: RoomState; events: GameEvent[] } | { ok: false; code: RejectCode; message: string };
export type Ctx = { at: number; seq: number };

export function getConnectedPlayers(state: RoomState): PlayerState[] {
  return state.players.filter((p) => p.isConnected);
}

function ev(state: RoomState, ctx: Ctx, type: GameEvent["type"], actorId: string | undefined, payload: Record<string, unknown> = {}): GameEvent {
  return { id: `ev-${state.seq}-${ctx.seq}-${type}`, roomCode: state.roomCode, seq: ctx.seq, at: ctx.at, type, actorId, payload };
}

function ok(next: RoomState, ctx: Ctx, events: GameEvent[]): CommandResult {
  next.seq = ctx.seq;
  return { ok: true, state: next, events };
}

function reject(code: RejectCode, message = code): CommandResult {
  return { ok: false, code, message };
}

export function applyCommand(state: RoomState, envelope: CommandEnvelope, ctx: Ctx): CommandResult {
  if (envelope.expectedState !== state.state) return reject("wrong_state");
  if (state.paused && envelope.command.type !== "judge:resume") return reject("wrong_state", "paused");

  const cmd = envelope.command;
  const type = cmd.type;

  // Role checks
  if (type.startsWith("judge:")) {
    if (envelope.role !== "judge") return reject("not_allowed");
  } else if (type.startsWith("player:")) {
    if (envelope.role !== "player") return reject("not_allowed");
    const player = state.players.find((p) => p.id === envelope.actorId);
    if (!player) return reject("not_allowed");
    if (player.isEliminated) return reject("not_allowed", "eliminated");
  } else if (type.startsWith("system:")) {
    if (envelope.role !== "system") return reject("not_allowed");
  }

  // System handlers
  if (type === "system:addPlayer") {
    if (state.state !== "lobby") return reject("wrong_state");
    if (state.players.length >= MAX_PLAYERS) return reject("room_full");
    if (state.players.some((p) => p.name === cmd.player.name) || state.players.some((p) => p.id === cmd.player.id)) return reject("invalid_payload", "duplicate player");
    const next = structuredClone(state);
    next.players.push({ id: cmd.player.id, name: cmd.player.name, score: 0, isEliminated: false, isConnected: true, powerupKey: null, powerupState: "none", joinedAt: ctx.at });
    return ok(next, ctx, [ev(state, ctx, "player_joined", envelope.actorId, { playerId: cmd.player.id, name: cmd.player.name })]);
  }
  if (type === "system:setConnection") {
    const next = structuredClone(state);
    const player = next.players.find((p) => p.id === cmd.playerId);
    if (!player) return reject("invalid_payload");
    player.isConnected = cmd.connected;
    return ok(next, ctx, [ev(state, ctx, cmd.connected ? "player_joined" : "player_left", envelope.actorId, { playerId: cmd.playerId, connected: cmd.connected })]);
  }
  if (type === "system:removePlayer") {
    const next = structuredClone(state);
    const idx = next.players.findIndex((p) => p.id === cmd.playerId);
    if (idx === -1) return reject("invalid_payload");
    const [removed] = next.players.splice(idx, 1);
    if (["lobby", "setup", "powerup_selection"].includes(state.state) && removed?.powerupState === "reserved") {
      // free the slot (player row gone)
    } else if (removed) {
      // after ready, keep implicit ownership was already removed from list; game keeps score via player id elsewhere
    }
    return ok(next, ctx, [ev(state, ctx, "player_left", envelope.actorId, { playerId: cmd.playerId })]);
  }
  if (type === "system:deadline") {
    return handleDeadline(state, ctx);
  }

  // Lobby / powerup selection
  if (type === "judge:openPowerupSelection") {
    if (state.state !== "lobby") return reject("wrong_state");
    if (state.players.length < 1 || state.players.length > MAX_PLAYERS) return reject("invalid_payload");
    const next = structuredClone(state);
    next.state = "powerup_selection";
    return ok(next, ctx, [ev(state, ctx, "game_started", envelope.actorId, {})]);
  }
  if (type === "judge:startGame") {
    if (state.state !== "powerup_selection") return reject("wrong_state");
    if (state.players.length < 1) return reject("invalid_payload");
    const next = structuredClone(state);
    next.state = "ready";
    return ok(next, ctx, [ev(state, ctx, "game_started", envelope.actorId, {})]);
  }
  if (type === "player:choosePowerup") {
    if (state.state !== "powerup_selection") return reject("wrong_state");
    if (!POWERUP_KEYS.includes(cmd.key)) return reject("invalid_payload");
    if (state.players.some((p) => p.powerupKey === cmd.key)) return reject("duplicate_powerup");
    const next = structuredClone(state);
    const player = next.players.find((p) => p.id === envelope.actorId);
    if (!player) return reject("not_allowed");
    if (player.powerupKey) return reject("duplicate_powerup");
    player.powerupKey = cmd.key;
    player.powerupState = "reserved";
    return ok(next, ctx, [ev(state, ctx, "powerup_reserved", envelope.actorId, { playerId: player.id, key: cmd.key })]);
  }
  if (type === "judge:selectRoundKind") {
    if (state.state !== "ready" && state.state !== "next_question") return reject("wrong_state");
    const next = structuredClone(state);
    next.roundKind = cmd.kind;
    next.state = "round_intro";
    return ok(next, ctx, [ev(state, ctx, "round_started", envelope.actorId, { kind: cmd.kind })]);
  }

  // Placeholder handlers for later tasks
  return reject("wrong_state", "not implemented yet");
}

function handleDeadline(state: RoomState, ctx: Ctx): CommandResult {
  if (state.state === "question_active" && state.buzzer?.isOpen) {
    const next = structuredClone(state);
    next.state = "buzzer_locked";
    next.buzzer!.isOpen = false;
    return ok(next, ctx, [ev(state, ctx, "buzzer_closed", "system", { reason: "deadline" })]);
  }
  if (state.state === "simultaneous_active") {
    const next = structuredClone(state);
    next.state = "submissions_closed";
    next.submissionsClosedAt = ctx.at;
    return ok(next, ctx, [ev(state, ctx, "submissions_closed", "system", { reason: "deadline" })]);
  }
  return reject("wrong_state");
}
