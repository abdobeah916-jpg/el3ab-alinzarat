import type { RoomStore, RoomRecord } from "./roomStore";
export class MemoryRoomStore implements RoomStore {
  private rooms = new Map<string, RoomRecord>();
  async create(r: RoomRecord) { this.rooms.set(r.code, structuredClone(r)); }
  async get(code: string) { const r = this.rooms.get(code); return r ? structuredClone(r) : null; }
  async save(code: string, state: any) { const r = this.rooms.get(code); if (r) r.state = structuredClone(state); }
  async appendEvents(_code: string, _events: any[]) {}
  async upsertSubmissions(_code: string, _s: any[]) {}
}
