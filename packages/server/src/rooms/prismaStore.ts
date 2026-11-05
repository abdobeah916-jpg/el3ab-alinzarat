import type { RoomStore, RoomRecord } from "./roomStore";
// Minimal Prisma store (uses same interface; Prisma client wired at deploy)
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
export class PrismaRoomStore implements RoomStore {
  async create(r: RoomRecord) {
    await prisma.room.create({ data: { code: r.code, judgeTokenHash: r.judgeTokenHash, judgeRecoveryHash: r.judgeRecoveryHash, status: r.state.state, state: r.state as any, settings: r.state.settings as any, tokens: (r.tokens ?? {}) as any } });
  }
  async get(code: string): Promise<RoomRecord | null> {
    const rec = await prisma.room.findUnique({ where: { code } });
    if (!rec) return null;
    return { code: rec.code, judgeTokenHash: rec.judgeTokenHash, judgeRecoveryHash: rec.judgeRecoveryHash, state: rec.state as any, tokens: (rec.tokens as any) ?? {}, createdAt: rec.createdAt.getTime() };
  }
  async save(code: string, state: any) {
    await prisma.room.update({ where: { code }, data: { state, status: state.state } });
  }
  async appendEvents() {}
  async upsertSubmissions() {}
}
