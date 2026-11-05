import { Router, timingSafeEqual } from "express";
import { validateQuestion } from "@casino/shared";
import type { MemoryQuestionRepository } from "./questions/memoryRepository";

export function createAdminRouter(repo: MemoryQuestionRepository, adminKey?: string) {
  const router = Router();
  router.use((req: any, res: any, next: any) => {
    const key = req.header("x-admin-key") ?? "";
    const expected = adminKey ?? process.env.ADMIN_KEY ?? "";
    if (!expected || key.length !== expected.length || !timingSafeEqual(Buffer.from(key), Buffer.from(expected))) return res.status(401).json({ code: "not_allowed", message: "admin key required" });
    next();
  });
  router.post("/questions/import", async (req, res) => {
    const list = (req.body as any)?.questions ?? [];
    const errors: any[] = [];
    const valid: any[] = [];
    list.forEach((q: any, i: number) => {
      // fill defaults for minimal input
      const full = { id: q.id ?? `q-${Date.now()}-${i}`, categorySlug: q.categorySlug ?? "general", text: q.text ?? "", answer: q.answer ?? "", acceptedAnswers: q.acceptedAnswers ?? [], type: q.type ?? "open", difficulty: q.difficulty ?? "easy", options: q.options, correctIndex: q.correctIndex, mediaUrl: q.mediaUrl, mediaType: q.mediaType, mediaCredit: q.mediaCredit };
      const errs = validateQuestion(full);
      if (errs.length) errors.push({ index: i, messages: errs });
      else valid.push(full);
    });
    const { inserted, skipped } = await repo.insertMany(valid as any);
    res.json({ inserted, skipped: skipped + errors.length, errors });
  });
  router.get("/questions", async (req: any, res: any) => {
    const limit = 50;
    const offset = Number(req.query.offset ?? 0);
    const items = repo.questions.slice(offset, offset + limit);
    res.json({ items, total: repo.questions.length });
  });
  return router;
}
