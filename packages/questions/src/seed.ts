import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Category, Question } from "@casino/shared";

const dir = dirname(fileURLToPath(import.meta.url));
export function loadSeed(): { categories: Category[]; questions: Question[] } {
  const categories = JSON.parse(readFileSync(join(dir, "../data/categories.json"), "utf8"));
  const questions = JSON.parse(readFileSync(join(dir, "../data/questions.seed.json"), "utf8"));
  return { categories, questions };
}
