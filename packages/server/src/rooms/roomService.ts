import { createInitialState, applyCommand } from "@casino/game-core";
import { createRecoveryCode, createToken, hashToken, verifyToken } from "../tokens";
import { generateRoomCode } from "../ids";
import type { RoomStore, RoomRecord } from "./roomStore";
type JoinResult = { playerToken: string; playerId: string };
export class RoomService {
  constructor(private store: RoomStore) {}
  private locks = new Map<string, Promise<unknown>>();
  private async withLock(code: string, fn: () => Promise<any>) {
    const prev = this.locks.get(code) ?? Promise.resolve();
    let release: () => void;
    const next = new Promise<void>((r) => (release = r));
    this.locks.set(code, prev.then(() => next));
    await prev;
    try { return await fn(); } finally { release!(); }
  }
  async createRoom(settings?: any): Promise<{ code: string; judgeToken: string; judgeRecoveryCode: string }> {
    for (let i = 0; i < 10; i++) {
      const code = generateRoomCode();
      if (await this.store.get(code)) continue;
      const judgeToken = createToken();
      const judgeRecoveryCode = createRecoveryCode();
      const state: any = createInitialState({ roomCode: code, settings });
      const record: RoomRecord = { code, judgeTokenHash: hashToken(judgeToken), judgeRecoveryHash: hashToken(judgeRecoveryCode), state, tokens: {}, createdAt: Date.now() };
      await this.store.create(record);
      return { code, judgeToken, judgeRecoveryCode };
    }
    throw new Error("cannot create room");
  }
  async joinRoom(code: string, name: string): Promise<JoinResult> {
    return this.withLock(code, async () => {
      const rec = await this.store.get(code);
      if (!rec) throw Object.assign(new Error("room not found"), { code: "wrong_state" });
      if (rec.state.state !== "lobby") throw Object.assign(new Error("not lobby"), { code: "wrong_state" });
      if (rec.state.players.length >= 3) throw Object.assign(new Error("room full"), { code: "room_full" });
      if (rec.state.players.some((p) => p.name === name)) throw Object.assign(new Error("duplicate name"), { code: "invalid_payload" });
      const playerId = `p${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
      const playerToken = createToken();
      const r: any = applyCommand(rec.state, { id: Date.now().toString(), actorId: "system", role: "system", expectedState: "lobby", command: { type: "system:addPlayer", player: { id: playerId, name } } }, { at: Date.now(), seq: rec.state.seq + 1 });
      if (!r.ok) throw Object.assign(new Error(r.message), { code: r.code });
      rec.state = r.state;
      rec.tokens = rec.tokens ?? {};
      rec.tokens[playerId] = hashToken(playerToken);
      await this.store.create(rec);
      return { playerToken, playerId };
    });
  }
  async authenticate(code: string, token: string): Promise<{ role: "judge" | "player"; playerId?: string }> {
    const rec = await this.store.get(code);
    if (!rec) throw Object.assign(new Error("not found"), { code: "wrong_state" });
    if (verifyToken(token, rec.judgeTokenHash)) return { role: "judge" };
    for (const [pid, h] of Object.entries(rec.tokens ?? {})) if (verifyToken(token, h)) return { role: "player", playerId: pid };
    throw Object.assign(new Error("unauthorized"), { code: "not_allowed" });
  }
  async reconnect(code: string, token: string) {
    const auth = await this.authenticate(code, token);
    return auth;
  }
  async reissueJudgeToken(code: string, recoveryCode: string): Promise<{ judgeToken: string }> {
    const rec = await this.store.get(code);
    if (!rec || !verifyToken(recoveryCode, rec.judgeRecoveryHash)) throw Object.assign(new Error("bad recovery"), { code: "not_allowed" });
    const judgeToken = createToken();
    (rec as any).judgeTokenHash = hashToken(judgeToken);
    await this.store.create(rec);
    return { judgeToken };
  }
}
