import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/http";
import { MemoryRoomStore } from "../src/rooms/memoryStore";
import { RoomService } from "../src/rooms/roomService";
import { MemoryQuestionRepository } from "../src/questions/memoryRepository";
const app = (repo = new MemoryQuestionRepository()) => createApp({ rooms: new RoomService(new MemoryRoomStore()), questions: repo, adminKey: "test-key" });
describe("Admin API", () => {
  it("يرفض بدون مفتاح الأدمن", async () => {
    expect((await request(app()).get("/api/admin/questions")).status).toBe(401);
  });
  it("يستورد JSON ويقص الأسئلة غير الصالحة", async () => {
    const res = await request(app()).post("/api/admin/questions/import").set("x-admin-key", "test-key").send({ questions: [
      { categorySlug: "geography", text: "عاصمة مصر؟", answer: "القاهرة", type: "capital", difficulty: "easy" },
      { categorySlug: "geography", text: "", answer: "", type: "open", difficulty: "easy" },
    ] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ inserted: 1, skipped: 1, errors: [expect.objectContaining({ index: 1 })] });
  });
  it("يرفض التكرار بالـhash", async () => {
    const a = app();
    const q = { categorySlug: "geography", text: "عاصمة مصر؟", answer: "القاهرة", type: "capital", difficulty: "easy" };
    await request(a).post("/api/admin/questions/import").set("x-admin-key", "test-key").send({ questions: [q] });
    const res = await request(a).post("/api/admin/questions/import").set("x-admin-key", "test-key").send({ questions: [q] });
    expect(res.body.skipped).toBeGreaterThanOrEqual(1);
  });
});
