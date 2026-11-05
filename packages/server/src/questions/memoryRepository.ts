import type { Question, Category } from "@casino/shared";
import { hashQuestion } from "@casino/shared";
export class MemoryQuestionRepository {
  questions: Question[] = [];
  hashes = new Set<string>();
  categories: Category[] = [];
  async listCategories(): Promise<Category[]> { return this.categories; }
  async insertMany(items: Question[]): Promise<{ inserted: number; skipped: number }> {
    let inserted = 0, skipped = 0;
    for (const q of items) {
      const h = hashQuestion(q);
      if (this.hashes.has(h)) { skipped++; continue; }
      this.hashes.add(h);
      this.questions.push({ ...q });
      inserted++;
    }
    return { inserted, skipped };
  }
  async pick(input: { categorySlug: string; excludeIds: string[] }): Promise<Question | null> {
    const candidates = this.questions.filter((q) => q.categorySlug === input.categorySlug && !input.excludeIds.includes(q.id));
    return candidates[0] ?? null;
  }
}
