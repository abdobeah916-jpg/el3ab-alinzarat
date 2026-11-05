import type { RoomState, GameEvent } from "@casino/shared";

export function toJudgeView(state: RoomState): any {
  return {
    code: state.roomCode, state: state.state, seq: state.seq, roundKind: state.roundKind,
    players: state.players, question: state.currentQuestion, settings: state.settings,
    buzzer: state.buzzer, submissions: state.submissions, busLetter: state.busLetter,
    rumble: state.rumble, round: state.round, pendingPowerup: state.pendingPowerup,
    serverNow: Date.now(),
  };
}
export function toPlayerView(state: RoomState, playerId: string): any {
  const showQuestion = state.settings.showQuestionToPlayers;
  let question: any = null;
  if (state.currentQuestion && showQuestion) {
    const q = state.currentQuestion;
    question = { id: q.id, text: q.text, type: q.type, mediaUrl: q.mediaUrl, mediaCredit: q.mediaCredit, letter: q.letter, options: q.options };
  }
  const submissions = state.state === "reveal" ? state.submissions : state.submissions.filter((s) => s.playerId === playerId);
  const presses = state.buzzer?.presses ?? [];
  const buzzer = state.buzzer ? {
    isOpen: state.buzzer.isOpen,
    deadline: state.buzzer.deadline,
    myRank: (() => { const idx = [...presses].sort((a,b)=>a.at-b.at||a.seq-b.seq).findIndex(p=>p.playerId===playerId); return idx===-1?null:idx+1; })(),
    pressCount: presses.length,
    presses: state.settings.showBuzzerNames && !state.buzzer.isOpen ? [...presses].sort((a,b)=>a.at-b.at||a.seq-b.seq).map(p=>({ playerId: p.playerId, at: p.at })) : [],
  } : null;
  return {
    code: state.roomCode, state: state.state, seq: state.seq, roundKind: state.roundKind,
    players: state.players.map((p) => ({ id: p.id, name: p.name, score: p.score, isEliminated: p.isEliminated, isConnected: p.isConnected, powerupKey: p.powerupKey, powerupState: p.powerupState })),
    me: state.players.find((p) => p.id === playerId) ?? null,
    question, buzzer, submissions, busLetter: state.busLetter, rumble: state.rumble, round: state.round,
    settings: { buzzerSeconds: state.settings.buzzerSeconds, busSeconds: state.settings.busSeconds, showQuestionToPlayers: state.settings.showQuestionToPlayers, showBuzzerNames: state.settings.showBuzzerNames, allowNegative: state.settings.allowNegative, busCategories: state.settings.busCategories },
    pendingPowerup: state.pendingPowerup, serverNow: Date.now(),
  };
}
export function toPlayerEvent(event: GameEvent): any {
  if (event.type === "question_selected") {
    const q: any = (event.payload as any).question ?? {};
    return { ...event, payload: { questionId: q.id ?? (event.payload as any).questionId ?? null, categorySlug: q.categorySlug ?? (event.payload as any).categorySlug ?? null } };
  }
  const clean = (v: any): any => {
    if (v === null || typeof v !== "object") return v;
    if (Array.isArray(v)) return v.map(clean);
    const out: any = {};
    for (const [k, val] of Object.entries(v)) if (!["answer", "acceptedAnswers", "correctIndex"].includes(k)) out[k] = clean(val);
    return out;
  };
  return { ...event, payload: clean(event.payload) };
}
