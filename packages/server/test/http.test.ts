import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/http";
import { MemoryRoomStore } from "../src/rooms/memoryStore";
import { RoomService } from "../src/rooms/roomService";
import { MemoryQuestionRepository } from "../src/questions/memoryRepository";
const app = (repo = new MemoryQuestionRepository()) => createApp({ rooms: new RoomService(new MemoryRoomStore()), questions: repo, adminKey: "test-key" });
describe("HTTP API", () => {
  it("ينشئ غرفة ويعيد كود وتوكن واسترجاع", async () => {
    const res = await request(app()).post("/api/rooms").send({});
    expect(res.status).toBe(201);
    expect(res.body.roomCode).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(res.body.judgeToken).toHaveLength(43);
    expect(res.body.judgeRecoveryCode).toHaveLength(8);
  });
  it("يرفض اللاعب الرابع", async () => {
    const a = app();
    const { body } = await request(a).post("/api/rooms").send({});
    for (const name of ["أحمد", "سارة", "محمود"]) {
      expect((await request(a).post(`/api/rooms/${body.roomCode}/join`).send({ name })).status).toBe(201);
    }
    const res = await request(a).post(`/api/rooms/${body.roomCode}/join`).send({ name: "رابع" });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("room_full");
  });
  it("يرفض اسمًا مكررًا", async () => {
    const a = app();
    const { body } = await request(a).post("/api/rooms").send({});
    await request(a).post(`/api/rooms/${body.roomCode}/join`).send({ name: "أحمد" });
    const res = await request(a).post(`/api/rooms/${body.roomCode}/join`).send({ name: "أحمد" });
    expect(res.status).toBe(409);
  });
  it("يسترجع الحكم بكود الاسترجاع", async () => {
    const a = app();
    const { body } = await request(a).post("/api/rooms").send({});
    const res = await request(a).post(`/api/rooms/${body.roomCode}/judge/recover`).send({ recoveryCode: body.judgeRecoveryCode });
    expect(res.status).toBe(200);
    expect(res.body.judgeToken).not.toBe(body.judgeToken);
  });
  it("يسترجع اللاعب بالتوكن بعد الانقطاع", async () => {
    const a = app();
    const { body } = await request(a).post("/api/rooms").send({});
    const join = await request(a).post(`/api/rooms/${body.roomCode}/join`).send({ name: "أحمد" });
    const res = await request(a).post(`/api/rooms/${body.roomCode}/reconnect`).send({ token: join.body.playerToken });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ role: "player", playerId: join.body.playerId });
  });
});
