import type { LocalQuestion } from "./questions";
import { pickQuestion } from "./questions";

export type LocalCard = "yellow" | "red";
export type LocalPhase = "setup" | "playing" | "results";
export type LocalAnswer = "idle" | "buzzed" | "correct" | "wrong";

export type LocalPlayer = {
  id: string;
  name: string;
  score: number;
  cards: LocalCard[];
};

export type LocalSettings = {
  pointsPerCorrect: number;
  yellowPenalty: number;
  redPenalty: number;
  allowNegative: boolean;
};

export type LocalLogEntry = { id: string; at: number; text: string };

export type LocalState = {
  version: 1;
  phase: LocalPhase;
  players: LocalPlayer[];
  settings: LocalSettings;
  roundIndex: number;
  categorySlug: string | null;
  question: LocalQuestion | null;
  usedIds: string[];
  buzzedId: string | null;
  answer: LocalAnswer;
  showAnswer: boolean;
  log: LocalLogEntry[];
};

export const MAX_LOCAL_PLAYERS = 3;
export const DEFAULT_LOCAL_SETTINGS: LocalSettings = {
  pointsPerCorrect: 1,
  yellowPenalty: -1,
  redPenalty: -3,
  allowNegative: true,
};

let logSeq = 0;

function log(state: LocalState, text: string): LocalLogEntry[] {
  const entry: LocalLogEntry = { id: `l-${Date.now()}-${++logSeq}`, at: Date.now(), text };
  return [entry, ...state.log].slice(0, 40);
}

function applyDelta(score: number, delta: number, settings: LocalSettings): number {
  const next = score + delta;
  return settings.allowNegative ? next : Math.max(0, next);
}

export function createLocalState(): LocalState {
  return {
    version: 1,
    phase: "setup",
    players: [],
    settings: { ...DEFAULT_LOCAL_SETTINGS },
    roundIndex: 1,
    categorySlug: null,
    question: null,
    usedIds: [],
    buzzedId: null,
    answer: "idle",
    showAnswer: false,
    log: [],
  };
}

export function startLocalGame(state: LocalState, names: string[], settings?: Partial<LocalSettings>): LocalState {
  const clean = names.map((n) => n.trim()).filter(Boolean).slice(0, MAX_LOCAL_PLAYERS);
  const players: LocalPlayer[] = clean.map((name, i) => ({
    id: `lp-${Date.now().toString(36)}-${i}`,
    name,
    score: 0,
    cards: [],
  }));
  const base: LocalState = {
    ...createLocalState(),
    ...state,
    settings: { ...state.settings, ...(settings ?? {}) },
    phase: "playing",
    players,
    roundIndex: 1,
    categorySlug: null,
    question: null,
    usedIds: [],
    buzzedId: null,
    answer: "idle",
    showAnswer: false,
    log: [],
  };
  return { ...base, log: log(base, "اللعبة بدأت — الطاولة جاهزة.") };
}

export function addLocalPlayer(state: LocalState, name: string): LocalState {
  const clean = name.trim();
  if (!clean || state.players.length >= MAX_LOCAL_PLAYERS) return state;
  if (state.players.some((p) => p.name === clean)) return state;
  const player: LocalPlayer = { id: `lp-${Date.now().toString(36)}-${state.players.length}`, name: clean, score: 0, cards: [] };
  const next: LocalState = { ...state, players: [...state.players, player] };
  return { ...next, log: log(next, `${clean} انضم للطاولة.`) };
}

export function setCategory(state: LocalState, categorySlug: string | null): LocalState {
  return { ...state, categorySlug };
}

export function drawQuestion(state: LocalState): LocalState {
  const question = pickQuestion(state.categorySlug, state.usedIds);
  if (!question) return state;
  const next: LocalState = {
    ...state,
    question,
    usedIds: [...state.usedIds, question.id],
    buzzedId: null,
    answer: "idle",
    showAnswer: false,
  };
  return { ...next, log: log(next, `سؤال جديد: ${question.text}`) };
}

export function buzz(state: LocalState, playerId: string): LocalState {
  if (state.answer !== "idle" || !state.question) return state;
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return state;
  const next: LocalState = { ...state, buzzedId: playerId, answer: "buzzed" };
  return { ...next, log: log(next, `${player.name} داس الجرس الأول.`) };
}

export function judgeAnswer(state: LocalState, correct: boolean): LocalState {
  if (state.answer !== "buzzed" || !state.buzzedId) return state;
  const player = state.players.find((p) => p.id === state.buzzedId);
  if (!player) return state;
  const next = structuredClone(state) as LocalState;
  const target = next.players.find((p) => p.id === state.buzzedId)!;
  if (correct) target.score = applyDelta(target.score, next.settings.pointsPerCorrect, next.settings);
  next.answer = correct ? "correct" : "wrong";
  next.log = log(next, correct ? `${player.name} جاوب صح (+${next.settings.pointsPerCorrect}).` : `${player.name} جاوب غلط.`);
  return next;
}

export function playCard(state: LocalState, playerId: string, card: LocalCard): LocalState {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return state;
  const next = structuredClone(state) as LocalState;
  const target = next.players.find((p) => p.id === playerId)!;
  const delta = card === "yellow" ? next.settings.yellowPenalty : next.settings.redPenalty;
  target.score = applyDelta(target.score, delta, next.settings);
  target.cards = [...target.cards, card];
  next.log = log(next, `${player.name} خد كارت ${card === "yellow" ? "أصفر" : "أحمر"} (${delta}).`);
  return next;
}

export function adjustScore(state: LocalState, playerId: string, delta: number): LocalState {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || !delta) return state;
  const next = structuredClone(state) as LocalState;
  const target = next.players.find((p) => p.id === playerId)!;
  target.score = applyDelta(target.score, delta, next.settings);
  next.log = log(next, `تعديل يدوي: ${player.name} ${delta > 0 ? "+" : ""}${delta}.`);
  return next;
}

export function resetBuzz(state: LocalState): LocalState {
  return { ...state, buzzedId: null, answer: "idle" };
}

export function skipQuestion(state: LocalState): LocalState {
  if (!state.question && state.answer === "idle") return state;
  const next: LocalState = { ...state, question: null, buzzedId: null, answer: "idle", showAnswer: false };
  return { ...next, log: log(next, "اتخطّى السؤال.") };
}

export function toggleAnswer(state: LocalState): LocalState {
  return { ...state, showAnswer: !state.showAnswer };
}

export function nextQuestion(state: LocalState): LocalState {
  const next: LocalState = {
    ...state,
    roundIndex: state.roundIndex + 1,
    question: null,
    buzzedId: null,
    answer: "idle",
    showAnswer: false,
  };
  return { ...next, log: log(next, `الجولة ${next.roundIndex} جاهزة.`) };
}

export function finishGame(state: LocalState): LocalState {
  const next = { ...state, phase: "results" as const };
  return { ...next, log: log(next, "انتهت اللعبة.") };
}

export function rematch(state: LocalState): LocalState {
  const players = state.players.map((p) => ({ ...p, score: 0, cards: [] }));
  const next: LocalState = {
    ...state,
    phase: "playing",
    players,
    roundIndex: 1,
    categorySlug: null,
    question: null,
    usedIds: [],
    buzzedId: null,
    answer: "idle",
    showAnswer: false,
    log: [],
  };
  return { ...next, log: log(next, "إعادة جولة — النقط اتصفّرت.") };
}

export function backToSetup(state: LocalState): LocalState {
  const players = state.players.map((p) => ({ ...p, score: 0, cards: [] }));
  return { ...createLocalState(), settings: state.settings, phase: "setup", players };
}

export function leaderboard(players: LocalPlayer[]): LocalPlayer[] {
  return [...players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "ar"));
}

export function winnerOf(players: LocalPlayer[]): { winnerId: string | null; tied: string[] } {
  if (!players.length) return { winnerId: null, tied: [] };
  const top = Math.max(...players.map((p) => p.score));
  const leaders = players.filter((p) => p.score === top);
  return { winnerId: leaders.length === 1 ? leaders[0]!.id : null, tied: leaders.map((p) => p.id) };
}

const STORAGE_KEY = "casino.local.v1";

export function loadLocalState(): LocalState | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.players)) return null;
    return parsed as LocalState;
  } catch {
    return null;
  }
}

export function saveLocalState(state: LocalState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function clearLocalState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
