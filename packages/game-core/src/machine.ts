import type { CommandEnvelope, GameEvent, PlayerState, RejectCode, RoomState } from "@casino/shared";
import { MAX_PLAYERS, POWERUP_KEYS, normalizeAnswer } from "@casino/shared";

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
    if (state.salem?.state === "active" && state.roundKind === "buzzer") {
      if (!state.currentQuestion) return reject("wrong_phase", "no question");
      const next = structuredClone(state);
      next.state = "answering";
      next.answererId = next.settings.salem.answerer === "owner" ? next.salem.ownerId : next.salem.targetId;
      next.buzzer = { isOpen: false, openedAt: ctx.at, deadline: null, presses: [] };
      return ok(next, ctx, [ev(state, ctx, "question_started", envelope.actorId, { salem: true })]);
    }
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

  // Buzzer
  if (type === "player:buzz") {
    if (state.state !== "question_active" || !state.buzzer?.isOpen) return reject("wrong_state");
    if (state.buzzer.deadline !== null && ctx.at > state.buzzer.deadline) return reject("wrong_phase", "expired");
    if (state.buzzer.presses.some((p) => p.playerId === envelope.actorId)) return reject("already_used");
    const next = structuredClone(state);
    next.buzzer!.presses.push({ playerId: envelope.actorId, at: ctx.at, seq: ctx.seq });
    return ok(next, ctx, [ev(state, ctx, "buzzer_pressed", envelope.actorId, { playerId: envelope.actorId })]);
  }
  if (type === "judge:closeBuzzer") {
    if (state.state !== "question_active") return reject("wrong_state");
    const next = structuredClone(state);
    next.state = "buzzer_locked";
    next.buzzer!.isOpen = false;
    return ok(next, ctx, [ev(state, ctx, "buzzer_closed", envelope.actorId, {})]);
  }
  if (type === "judge:openBuzzer") {
    if (state.state !== "buzzer_locked" && state.state !== "card_action" && state.state !== "question_active") return reject("wrong_state");
    const next = structuredClone(state);
    next.state = "question_active";
    next.buzzer = { isOpen: true, openedAt: ctx.at, deadline: ctx.at + next.settings.buzzerSeconds * 1000, presses: state.buzzer?.presses ?? [] };
    next.answererId = null;
    return ok(next, ctx, [ev(state, ctx, "buzzer_opened", envelope.actorId, {})]);
  }
  if (type === "judge:selectAnswerer") {
    if (state.state !== "buzzer_locked") return reject("wrong_state");
    const player = state.players.find((p) => p.id === cmd.playerId);
    if (!player || player.isEliminated) return reject("invalid_payload");
    const next = structuredClone(state);
    next.state = "answering";
    next.answererId = cmd.playerId;
    return ok(next, ctx, [ev(state, ctx, "answerer_selected", envelope.actorId, { playerId: cmd.playerId })]);
  }

  // Judging + cards
  if (type === "judge:markCorrect" || type === "judge:markWrong") {
    if (state.state !== "answering" || !state.answererId) return reject("wrong_state");
    const next = structuredClone(state);
    const player = next.players.find((p) => p.id === next.answererId);
    if (!player) return reject("invalid_payload");
    const correct = type === "judge:markCorrect";
    const salemActive = next.salem?.state === "active";
    if (correct && !salemActive) player.score = applyScore(player.score, next.settings.pointsPerCorrect, next.settings);
    if (correct && salemActive) {
      next.state = "card_action";
    } else if (correct) {
      next.state = "result";
    } else {
      if (next.salem?.state === "active") {
        const owner = next.players.find((p) => p.id === next.salem!.ownerId);
        if (owner) owner.score = applyScore(owner.score, next.settings.salem.ownerPenaltyOnWrong, next.settings);
        next.salem = null;
        next.state = "result";
      } else {
        next.state = "card_action";
      }
    }
    return ok(next, ctx, [ev(state, ctx, "answer_judged", envelope.actorId, { playerId: player.id, correct, delta: correct ? next.settings.pointsPerCorrect : 0 })]);
  }
  if (type === "judge:playCard") {
    if (state.state !== "card_action") return reject("wrong_state");
    const next = structuredClone(state);
    const player = next.players.find((p) => p.id === cmd.playerId);
    if (!player) return reject("invalid_payload");
    const delta = cmd.card === "yellow" ? next.settings.yellowPenalty : next.settings.redPenalty;
    player.score = applyScore(player.score, delta, next.settings);
    next.round.cards = [...next.round.cards, { playerId: cmd.playerId, card: cmd.card }];
    next.usedCards = [...next.usedCards, { playerId: cmd.playerId, card: cmd.card }];
    next.state = "result";
    return ok(next, ctx, [ev(state, ctx, "card_played", envelope.actorId, { playerId: cmd.playerId, card: cmd.card, delta })]);
  }
  if (type === "judge:adjustScore") {
    if (!["result", "next_question"].includes(state.state)) return reject("wrong_state");
    if (!cmd.reason.trim() || cmd.delta === 0) return reject("invalid_payload");
    const next = structuredClone(state);
    const player = next.players.find((p) => p.id === cmd.playerId);
    if (!player) return reject("invalid_payload");
    player.score = applyScore(player.score, cmd.delta, next.settings);
    return ok(next, ctx, [ev(state, ctx, "score_adjusted", envelope.actorId, { playerId: cmd.playerId, delta: cmd.delta, reason: cmd.reason })]);
  }
  if (type === "judge:endQuestion") {
    if (state.state !== "card_action") return reject("wrong_state");
    const next = structuredClone(state);
    next.state = "result";
    return ok(next, ctx, [ev(state, ctx, "answer_judged", envelope.actorId, { ended: true })]);
  }

  // Lifecycle + tiebreak
  if (type === "judge:endGame") {
    if (!["result", "next_question", "reveal"].includes(state.state)) return reject("wrong_state");
    const next = structuredClone(state);
    const max = Math.max(...next.players.map((p) => p.score));
    const winners = next.players.filter((p) => p.score === max).map((p) => p.id);
    next.state = "finished";
    next.round.winnerId = winners.length === 1 ? winners[0]! : null;
    return ok(next, ctx, [ev(state, ctx, "game_finished", envelope.actorId, { winnerId: next.round.winnerId, tied: winners.length > 1 ? winners : [] })]);
  }
  if (type === "judge:startTieBreaker") {
    if (state.state !== "finished") return reject("wrong_state");
    const next = structuredClone(state);
    next.state = "tie_breaker";
    next.round.tieBreaker = true;
    next.currentQuestion = null;
    next.buzzer = null;
    return ok(next, ctx, [ev(state, ctx, "tie_breaker_started", envelope.actorId, {})]);
  }
  if (type === "judge:declareTie") {
    if (state.state !== "tie_breaker") return reject("wrong_state");
    const next = structuredClone(state);
    next.state = "finished";
    next.round.winnerId = null;
    return ok(next, ctx, [ev(state, ctx, "game_finished", envelope.actorId, { tied: true })]);
  }
  if (type === "judge:rematch") {
    if (state.state !== "finished") return reject("wrong_state");
    const next = structuredClone(state);
    next.state = "lobby";
    next.players = next.players.map((p) => ({ ...p, score: 0, isEliminated: false, powerupKey: null, powerupState: "none" as const }));
    next.usedQuestionIds = [];
    next.currentQuestion = null;
    next.buzzer = null;
    next.answererId = null;
    next.pendingPowerup = null;
    next.salem = null;
    next.nextCategoryOverride = null;
    next.submissions = [];
    next.rumble = null;
    next.round = { index: 1, tieBreaker: false, winnerId: null, cards: [] };
    next.usedCards = [];
    return ok(next, ctx, [ev(state, ctx, "game_started", envelope.actorId, { rematch: true })]);
  }
  if (type === "judge:nextQuestion") {
    if (state.state === "reveal") {
      const next = structuredClone(state);
      next.state = "result";
      return ok(next, ctx, [ev(state, ctx, "round_started", envelope.actorId, {})]);
    }
    if (state.state !== "result") return reject("wrong_state");
    const next = structuredClone(state);
    next.state = "next_question";
    next.answererId = null;
    next.buzzer = null;
    next.submissions = [];
    next.round.cards = [];
    next.currentQuestion = null;
    return ok(next, ctx, [ev(state, ctx, "round_started", envelope.actorId, { roundIndex: next.round.index })]);
  }
  if (type === "judge:pause" || type === "judge:resume") {
    const next = structuredClone(state);
    if (type === "judge:pause") {
      if (next.paused) return reject("wrong_state");
      next.paused = true;
      next.resumeState = next.state;
    } else {
      if (!next.paused) return reject("wrong_state");
      next.paused = false;
      next.state = next.resumeState ?? next.state;
      next.resumeState = null;
    }
    return ok(next, ctx, [ev(state, ctx, "game_started", envelope.actorId, { [type]: true })]);
  }

  // Salem target choice
  if (type === "player:chooseSalemTarget") {
    if (state.state !== "card_action") return reject("wrong_state");
    const next = structuredClone(state);
    // owner answering state is card_action after markCorrect with salem consumed marker in round? Use answerer as owner proxy
    if (next.answererId === null) return reject("wrong_state");
    const target = next.players.find((p) => p.id === cmd.targetId);
    if (!target) return reject("invalid_payload");
    target.score = applyScore(target.score, next.settings.salem.targetPenalty, next.settings);
    next.state = "result";
    return ok(next, ctx, [ev(state, ctx, "powerup_resolved", envelope.actorId, { salemTarget: cmd.targetId })]);
  }

  // Bus / letter / rumble
  if (type === "judge:setBusLetter") {
    if (state.state !== "question_setup") return reject("wrong_state");
    if (!["bus", "letter_race"].includes(state.roundKind)) return reject("wrong_state");
    const letter = cmd.letter.trim().slice(0, 2);
    if (!letter) return reject("invalid_payload");
    const next = structuredClone(state);
    next.busLetter = letter;
    return ok(next, ctx, [ev(state, ctx, "question_selected", envelope.actorId, { letter })]);
  }
  if (type === "player:submitRound") {
    if (state.state !== "simultaneous_active") return reject("wrong_phase");
    if (state.submissions.some((s) => s.playerId === envelope.actorId)) return reject("already_used");
    const player = state.players.find((p) => p.id === envelope.actorId);
    if (!player || player.isEliminated) return reject("not_allowed");
    const payload = cmd.payload;
    if (payload.kind === "bus") {
      if (state.roundKind !== "bus") return reject("wrong_state");
      const cats = state.settings.busCategories;
      for (const [k, v] of Object.entries(payload.answers)) {
        if (!cats.includes(k) || !v.trim() || v.length > 60) return reject("invalid_payload");
      }
      const next = structuredClone(state);
      next.submissions.push({ playerId: envelope.actorId, payload: { kind: "bus", answers: { ...payload.answers } } });
      return ok(next, ctx, [ev(state, ctx, "submission_judged", envelope.actorId, { playerId: envelope.actorId })]);
    }
    if (payload.kind === "letter_race") {
      if (state.roundKind !== "letter_race") return reject("wrong_state");
      const seen = new Set<string>();
      const words: string[] = [];
      for (const w of payload.words) {
        const t = w.trim();
        if (!t || t.length > 30) continue;
        const key = t.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        words.push(t);
      }
      if (words.length === 0) return reject("invalid_payload");
      const next = structuredClone(state);
      const trimmed = words.slice(0, 50);
      next.submissions.push({ playerId: envelope.actorId, payload: { kind: "letter_race", words: trimmed }, acceptedWords: trimmed.map(() => false) });
      return ok(next, ctx, [ev(state, ctx, "submission_judged", envelope.actorId, { playerId: envelope.actorId })]);
    }
    if (payload.kind === "rumble") {
      if (state.roundKind !== "rumble") return reject("wrong_state");
      if (!payload.answer.trim() || payload.answer.length > 60) return reject("invalid_payload");
      const next = structuredClone(state);
      next.submissions.push({ playerId: envelope.actorId, payload: { kind: "rumble", answer: payload.answer.trim() } });
      return ok(next, ctx, [ev(state, ctx, "submission_judged", envelope.actorId, { playerId: envelope.actorId })]);
    }
    return reject("invalid_payload");
  }
  if (type === "player:callBus") {
    if (state.state !== "simultaneous_active" || state.roundKind !== "bus") return reject("wrong_phase");
    const next = structuredClone(state);
    next.state = "submissions_closed";
    next.submissionsClosedAt = ctx.at;
    return ok(next, ctx, [ev(state, ctx, "submissions_closed", envelope.actorId, { by: envelope.actorId })]);
  }
  if (type === "judge:closeSubmissions") {
    if (state.state !== "simultaneous_active") return reject("wrong_state");
    const next = structuredClone(state);
    next.state = "submissions_closed";
    next.submissionsClosedAt = ctx.at;
    return ok(next, ctx, [ev(state, ctx, "submissions_closed", envelope.actorId, {})]);
  }
  if (type === "judge:openReveal") {
    if (state.state !== "submissions_closed") return reject("wrong_state");
    const next = structuredClone(state);
    next.state = "reveal";
    return ok(next, ctx, [ev(state, ctx, "submission_judged", envelope.actorId, {})]);
  }
  if (type === "judge:judgeBusCell") {
    if (state.state !== "reveal") return reject("wrong_state");
    const next = structuredClone(state);
    const sub = next.submissions.find((s) => s.playerId === cmd.playerId);
    if (!sub || sub.payload.kind !== "bus") return reject("invalid_payload");
    if (!sub.acceptedCells) sub.acceptedCells = {};
    const was = sub.acceptedCells[cmd.category] === true;
    const player = next.players.find((p) => p.id === cmd.playerId);
    if (!player) return reject("invalid_payload");
    if (cmd.accepted && !was) player.score = applyScore(player.score, next.settings.pointsPerCorrect, next.settings);
    if (!cmd.accepted && was) player.score = applyScore(player.score, -next.settings.pointsPerCorrect, next.settings);
    sub.acceptedCells[cmd.category] = cmd.accepted;
    return ok(next, ctx, [ev(state, ctx, "submission_judged", envelope.actorId, { playerId: cmd.playerId, category: cmd.category, accepted: cmd.accepted })]);
  }
  if (type === "judge:judgeWord") {
    if (state.state !== "reveal") return reject("wrong_state");
    const next = structuredClone(state);
    const sub = next.submissions.find((s) => s.playerId === cmd.playerId);
    if (!sub || sub.payload.kind !== "letter_race") return reject("invalid_payload");
    if (!sub.acceptedWords) sub.acceptedWords = sub.payload.words.map(() => false);
    const idx = cmd.wordIndex;
    if (idx < 0 || idx >= sub.payload.words.length) return reject("invalid_payload");
    const was = sub.acceptedWords[idx] === true;
    const player = next.players.find((p) => p.id === cmd.playerId);
    if (!player) return reject("invalid_payload");
    if (cmd.accepted && !was) {
      const acceptedCount = sub.acceptedWords.filter(Boolean).length + 1;
      const capped = Math.min(acceptedCount, next.settings.letterRaceMaxPoints);
      const prevCapped = Math.min(sub.acceptedWords.filter(Boolean).length, next.settings.letterRaceMaxPoints);
      player.score = applyScore(player.score, capped - prevCapped, next.settings);
    } else if (!cmd.accepted && was) {
      const prevCapped = Math.min(sub.acceptedWords.filter(Boolean).length, next.settings.letterRaceMaxPoints);
      const nextCount = sub.acceptedWords.filter(Boolean).length - 1;
      const capped = Math.min(nextCount, next.settings.letterRaceMaxPoints);
      player.score = applyScore(player.score, capped - prevCapped, next.settings);
    }
    sub.acceptedWords[idx] = cmd.accepted;
    return ok(next, ctx, [ev(state, ctx, "submission_judged", envelope.actorId, { playerId: cmd.playerId, wordIndex: idx, accepted: cmd.accepted })]);
  }
  if (type === "judge:approveAllSubmissions") {
    if (state.state !== "reveal") return reject("wrong_state");
    const next = structuredClone(state);
    for (const sub of next.submissions) {
      const player = next.players.find((p) => p.id === sub.playerId);
      if (!player) continue;
      if (sub.payload.kind === "bus") {
        sub.acceptedCells = { ...(sub.acceptedCells ?? {}) };
        for (const [cat, val] of Object.entries(sub.payload.answers)) {
          if (val.trim() && sub.acceptedCells[cat] !== true) {
            sub.acceptedCells[cat] = true;
            player.score = applyScore(player.score, next.settings.pointsPerCorrect, next.settings);
          }
        }
      } else if (sub.payload.kind === "letter_race") {
        if (!sub.acceptedWords) sub.acceptedWords = sub.payload.words.map(() => false);
        let count = sub.acceptedWords.filter(Boolean).length;
        for (let i = 0; i < sub.payload.words.length; i++) {
          if (!sub.acceptedWords[i]) {
            sub.acceptedWords[i] = true;
            const prev = Math.min(count, next.settings.letterRaceMaxPoints);
            count += 1;
            const now = Math.min(count, next.settings.letterRaceMaxPoints);
            player.score = applyScore(player.score, now - prev, next.settings);
          }
        }
      }
    }
    return ok(next, ctx, [ev(state, ctx, "submission_judged", envelope.actorId, { approveAll: true })]);
  }
  if (type === "judge:setRumbleVerdict") {
    if (state.state !== "submissions_closed" && state.state !== "reveal") return reject("wrong_state");
    const next = structuredClone(state);
    if (!next.rumble) next.rumble = { verdicts: {}, confirmed: false, replayed: false, eliminatedBefore: next.players.filter((p) => p.isEliminated).map((p) => p.id) };
    next.rumble.verdicts[cmd.playerId] = cmd.verdict;
    return ok(next, ctx, [ev(state, ctx, "submission_judged", envelope.actorId, { playerId: cmd.playerId, verdict: cmd.verdict })]);
  }
  if (type === "judge:confirmRumbleResult") {
    if (state.state !== "submissions_closed") return reject("wrong_state");
    const next = structuredClone(state);
    if (!next.rumble) next.rumble = { verdicts: {}, confirmed: false, replayed: false, eliminatedBefore: next.players.filter((p) => p.isEliminated).map((p) => p.id) };
    const active = next.players.filter((p) => !p.isEliminated);
    const subs = next.submissions.filter((s) => s.payload.kind === "rumble");
    const byPlayer = new Map(subs.map((s) => [s.playerId, (s.payload as { answer: string }).answer]));
    const answer = next.currentQuestion?.answer ?? "";
    const accepted = next.currentQuestion?.acceptedAnswers ?? [];
    const norm = (t: string) => normalizeAnswer(t);
    const groups = new Map<string, string[]>();
    for (const [pid, ans] of byPlayer) {
      const key = norm(ans);
      groups.set(key, [...(groups.get(key) ?? []), pid]);
    }
    const out = new Set<string>();
    for (const p of active) if (!byPlayer.has(p.id)) out.add(p.id);
    for (const ids of groups.values()) if (ids.length >= 2) for (const id of ids) out.add(id);
    const isMatch = (ans: string) => norm(ans) === norm(answer) || accepted.some((a) => norm(a) === norm(ans));
    for (const p of active) {
      if (out.has(p.id)) continue;
      const verdict = next.rumble.verdicts[p.id];
      const correct = verdict ? verdict === "correct" : isMatch(byPlayer.get(p.id) ?? "");
      if (!correct) out.add(p.id);
    }
    // verify verdicts override
    for (const [pid, v] of Object.entries(next.rumble.verdicts)) {
      if (v === "wrong") out.add(pid);
      if (v === "correct" && groups.get(norm(byPlayer.get(pid) ?? ""))?.length === 1) out.delete(pid);
    }
    const before = next.rumble.eliminatedBefore;
    const eliminatedNow = [...out];
    if (eliminatedNow.length === active.length && active.length > 0) {
      // all out -> replay
      for (const p of next.players) p.isEliminated = before.includes(p.id);
      next.submissions = [];
      next.currentQuestion = null;
      next.rumble = { verdicts: {}, confirmed: false, replayed: true, eliminatedBefore: before };
      next.state = "question_setup";
      next.busLetter = null;
      return ok(next, ctx, [ev(state, ctx, "round_replayed", envelope.actorId, { reason: "all_out" })]);
    }
    for (const p of next.players) if (out.has(p.id)) p.isEliminated = true;
    const remaining = next.players.filter((p) => !p.isEliminated);
    if (remaining.length === 1) {
      remaining[0]!.score = applyScore(remaining[0]!.score, 2, next.settings);
      next.round.winnerId = remaining[0]!.id;
    } else if (remaining.length >= 2 && out.size > 0) {
      for (const p of remaining) p.score = applyScore(p.score, 1, next.settings);
    }
    next.rumble.confirmed = true;
    next.state = "reveal";
    return ok(next, ctx, [ev(state, ctx, "rumble_resolved", envelope.actorId, { eliminated: [...out], remaining: remaining.map((p) => p.id) })]);
  }
  if (type === "judge:skipQuestion") {
    if (!["question_setup", "question_active", "buzzer_locked"].includes(state.state)) return reject("wrong_state");
    const next = structuredClone(state);
    next.currentQuestion = null;
    next.buzzer = null;
    next.state = "question_setup";
    return ok(next, ctx, [ev(state, ctx, "question_started", envelope.actorId, { skipped: true })]);
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
