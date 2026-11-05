import { applyCommand } from "@casino/game-core";
import type { CommandEnvelope, GameEvent } from "@casino/shared";
import type { RoomStore } from "./rooms/roomStore";
import type { MemoryQuestionRepository } from "./questions/memoryRepository";

export class CommandService {
  private seen = new Map<string, any>();
  constructor(private deps: { store: RoomStore; questions: MemoryQuestionRepository }) {}
  async execute(code: string, envelope: CommandEnvelope): Promise<{ ok: boolean; duplicate?: boolean; code?: string; state?: any; events?: GameEvent[] }> {
    const key = `${code}:${envelope.id}`;
    if (this.seen.has(key)) return { ok: true, duplicate: true, state: this.seen.get(key) };
    const rec = await this.deps.store.get(code);
    if (!rec) return { ok: false, code: "wrong_state" };
    if (envelope.expectedState !== rec.state.state) return { ok: false, code: "wrong_state" };
    let cmd = envelope.command as any;
    if (cmd.type === "judge:selectQuestion") {
      const categorySlug = rec.state.nextCategoryOverride ?? rec.state.selectedCategory ?? "general";
      const picked = await this.deps.questions.pick({ categorySlug, excludeIds: rec.state.usedQuestionIds });
      if (!picked) return { ok: false, code: "invalid_payload", state: rec.state };
      cmd = { ...cmd, question: picked };
    }
    const r: any = applyCommand(rec.state, { ...envelope, command: cmd }, { at: Date.now(), seq: rec.state.seq + 1 });
    if (!r.ok) return { ok: false, code: r.code, state: rec.state };
    await this.deps.store.save(code, r.state);
    this.seen.set(key, r.state);
    return { ok: true, state: r.state, events: r.events };
  }
}
