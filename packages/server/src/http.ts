import express from "express";
import cors from "cors";
import { z } from "zod";
import type { RoomService } from "./rooms/roomService";
import type { MemoryQuestionRepository } from "./questions/memoryRepository";
import { createAdminRouter } from "./admin";

export function createApp(deps: { rooms: RoomService; questions?: MemoryQuestionRepository; adminKey?: string }): express.Express {
  const app = express();
  app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") ?? true }));
  app.use(express.json({ limit: "64kb" }));
  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  const RoomBody = z.object({ settings: z.record(z.unknown()).optional() });
  app.post("/api/rooms", async (req, res) => {
    const body = RoomBody.safeParse(req.body ?? {});
    if (!body.success) return res.status(400).json({ code: "invalid_payload", message: "bad body" });
    const { code, judgeToken, judgeRecoveryCode } = await deps.rooms.createRoom(body.data.settings);
    res.status(201).json({ roomCode: code, judgeToken, judgeRecoveryCode });
  });
  app.post("/api/rooms/:code/join", async (req, res) => {
    const schema = z.object({ name: z.string().min(2).max(16).trim() });
    const body = schema.safeParse(req.body ?? {});
    if (!body.success) return res.status(400).json({ code: "invalid_payload", message: "bad name" });
    try {
      const result = await deps.rooms.joinRoom(req.params.code!, body.data.name);
      res.status(201).json(result);
    } catch (e: any) {
      res.status(409).json({ code: e.code ?? "wrong_state", message: e.message });
    }
  });
  app.post("/api/rooms/:code/reconnect", async (req, res) => {
    const schema = z.object({ token: z.string().min(10) });
    const body = schema.safeParse(req.body ?? {});
    if (!body.success) return res.status(400).json({ code: "invalid_payload", message: "bad token" });
    try {
      const auth = await deps.rooms.reconnect(req.params.code!, body.data.token);
      res.json(auth);
    } catch (e: any) {
      res.status(401).json({ code: e.code ?? "not_allowed", message: e.message });
    }
  });
  app.post("/api/rooms/:code/judge/recover", async (req, res) => {
    const schema = z.object({ recoveryCode: z.string().min(8).max(8) });
    const body = schema.safeParse(req.body ?? {});
    if (!body.success) return res.status(400).json({ code: "invalid_payload", message: "bad code" });
    try {
      const result = await deps.rooms.reissueJudgeToken(req.params.code!, body.data.recoveryCode);
      res.json(result);
    } catch (e: any) {
      res.status(401).json({ code: e.code ?? "not_allowed", message: e.message });
    }
  });
  if (deps.questions) app.use("/api/admin", createAdminRouter(deps.questions as any, deps.adminKey));
  return app;
}
