import type { RoomState } from "@casino/shared";
export type RoomRecord = { code: string; judgeTokenHash: string; judgeRecoveryHash: string; state: RoomState; tokens?: Record<string, string>; createdAt: number };
export interface RoomStore {
  create(r: RoomRecord): Promise<void>;
  get(code: string): Promise<RoomRecord | null>;
  save(code: string, state: RoomState): Promise<void>;
  appendEvents(code: string, events: any[]): Promise<void>;
  upsertSubmissions(code: string, submissions: any[]): Promise<void>;
}
