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

  // Begin round + question selection
  if (type === "judge:beginRound") {
    if (state.state !== "round_intro") return reject("wrong_state");
    const next = structuredClone(state);
    next.state = "question_setup";
    return ok(next, ctx, [ev(state, ctx, "round_started", envelope.actorId, { roundIndex: next.round.index })]);
  }
  if (type === "judge:selectCategory") {
    if (!["question_setup", "result", "next_question"].includes(state.state)) return reject("wrong_state");
    const next = structuredClone(state);
    next.selectedCategory = cmd.categorySlug;
    return ok(next, ctx, [ev(state, ctx, "question_selected", envelope.actorId, { categorySlug: cmd.categorySlug })]);
  }
  if (type === "judge:selectQuestion") {
    if (state.state !== "question_setup") return reject("wrong_state");
    if (!cmd.question || !cmd.question.id) return reject("invalid_payload");
    const next = structuredClone(state);
    next.currentQuestion = cmd.question;
    next.usedQuestionIds = [...next.usedQuestionIds, cmd.question.id];
    next.selectedCategory = cmd.question.categorySlug;
    next.nextCategoryOverride = null;
    return ok(next, ctx, [ev(state, ctx, "question_selected", envelope.actorId, { questionId: cmd.question.id })]);
  }
  if (type === "judge:startQuestion") {
    if (state.state !== "question_setup") return reject("wrong_state");
    if (state.roundKind === "bus" || state.roundKind === "letter_race") {
      if (!state.busLetter) return reject("wrong_phase", "letter required");
      const next = structuredClone(state);
      next.state = "simultaneous_active";
      next.submissionsClosedAt = ctx.at + next.settings.busSeconds * 1000;
      next.submissions = [];
      return ok(next, ctx, [ev(state, ctx, "question_started", envelope.actorId, { roundKind: next.roundKind })]);
    }
    if (!state.currentQuestion) return reject("wrong_phase", "no question");
    const next = structuredClone(state);
    if (next.roundKind === "buzzer") {
      next.state = "question_active";
      next.buzzer = { isOpen: true, openedAt: ctx.at, deadline: ctx.at + next.settings.buzzerSeconds * 1000, presses: [] };
    } else {
      next.state = "simultaneous_active";
      next.submissionsClosedAt = ctx.at + next.settings.busSeconds * 1000;
      next.submissions = [];
    }
    return ok(next, ctx, [ev(state, ctx, "question_started", envelope.actorId, { questionId: next.currentQuestion?.id })]);
  }
  // Powerup activation (full rules in Task 8)
  if (type === "player:activatePowerup") {
    if (!["ready", "result", "question_setup", "next_question"].includes(state.state)) return reject("wrong_state");
    const next = structuredClone(state);
    const player = next.players.find((p) => p.id === envelope.actorId);
    if (!player || !player.powerupKey || player.powerupState !== "reserved") return reject("invalid_payload");
    if (next.pendingPowerup) return reject("invalid_payload", "pending");
    player.powerupState = "used";
    next.pendingPowerup = { ownerId: player.id, key: player.powerupKey, targetId: cmd.targetId, categorySlug: cmd.categorySlug, returnState: state.state };
    return ok(next, ctx, [ev(state, ctx, "powerup_reserved", envelope.actorId, { key: player.powerupKey })]);
  }
  if (type === "judge:resolvePowerup") {
    if (!state.pendingPowerup) return reject("wrong_state");
    const next = structuredClone(state);
    const pending = next.pendingPowerup!;
    if (cmd.approve) {
      if (pending.key === "cobri" && pending.categorySlug) next.nextCategoryOverride = pending.categorySlug;
      if (pending.key === "shank" && pending.targetId) {
        const target = next.players.find((p) => p.id === pending.targetId);
        if (target) target.score = applyScore(target.score, next.settings.shankPenalty, next.settings);
      }
      if (pending.key === "salem" && pending.targetId) next.salem = { ownerId: pending.ownerId, targetId: pending.targetId, state: "active" };
    }
    const returnState = pending.returnState;
    next.pendingPowerup = null;
    next.state = returnState;
    return ok(next, ctx, [ev(state, ctx, "powerup_resolved", envelope.actorId, { key: pending.key, approve: cmd.approve })]);
  }

  // Placeholder handlers for later tasks
  return reject("wrong_state", "not implemented yet");
}

function applyScore(current: number, delta: number, settings: RoomState["settings"]): number {
  const next = current + delta;
  return settings.allowNegative ? next : Math.max(0, next);
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
