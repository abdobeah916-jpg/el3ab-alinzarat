import seed from "../../../questions/data/questions.seed.json";
import { CATEGORIES } from "../lib/categories";

export type LocalQuestion = {
  id: string;
  categorySlug: string;
  text: string;
  answer: string;
  acceptedAnswers?: string[];
  type?: string;
  difficulty?: string;
  options?: string[];
  mediaUrl?: string;
  mediaCredit?: string;
};

export const LOCAL_QUESTIONS = seed as unknown as LocalQuestion[];

export function questionsFor(categorySlug: string | null): LocalQuestion[] {
  if (!categorySlug) return LOCAL_QUESTIONS;
  return LOCAL_QUESTIONS.filter((q) => q.categorySlug === categorySlug);
}

/**
 * Pick a question for the current category, preferring ones that were not
 * played yet. When the category is exhausted we recycle it so the table never
 * gets stuck without a question.
 */
export function pickQuestion(
  categorySlug: string | null,
  usedIds: string[],
  rng: () => number = Math.random
): LocalQuestion | null {
  const all = questionsFor(categorySlug);
  if (!all.length) return null;
  const used = new Set(usedIds);
  const fresh = all.filter((q) => !used.has(q.id));
  const pool = fresh.length ? fresh : all;
  const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
  return pool[index] ?? null;
}

export function categoryLabel(slug: string | null): string {
  if (!slug) return "كل التصنيفات";
  return CATEGORIES.find((c) => c.slug === slug)?.name ?? "معلومات عامة";
}
