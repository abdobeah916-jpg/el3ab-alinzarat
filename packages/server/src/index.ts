import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { Server } from "socket.io";
import { loadSeed } from "@casino/questions";
import { createApp } from "./http";
import { MemoryRoomStore } from "./rooms/memoryStore";
import { MemoryQuestionRepository } from "./questions/memoryRepository";
import { RoomService } from "./rooms/roomService";
import { CommandService } from "./commands";
import { attachSocket } from "./socket";

async function main() {
  const store = new MemoryRoomStore();
  const rooms = new RoomService(store);

  const questions = new MemoryQuestionRepository();
  const seed = loadSeed();
  questions.categories = seed.categories;
  const inserted = await questions.insertMany(seed.questions);
  console.log(`loaded ${inserted.inserted} questions in ${seed.categories.length} categories`);

  const commands = new CommandService({ store, questions });
  const app = createApp({ rooms, questions, adminKey: process.env.ADMIN_KEY });

  // Serve the built web app (single service in production: API + Socket.IO + SPA).
  const here = dirname(fileURLToPath(import.meta.url));
  const webDist = process.env.WEB_DIST ?? resolve(here, "../../web/dist");
  if (existsSync(join(webDist, "index.html"))) {
    app.use(express.static(webDist, { index: false, maxAge: "1h" }));
    app.use((req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") return next();
      if (req.path.startsWith("/api/") || req.path.startsWith("/socket.io/")) return next();
      res.sendFile(join(webDist, "index.html"));
    });
    console.log(`serving web from ${webDist}`);
  } else {
    console.warn(`web build not found at ${webDist}; API only`);
  }

  const server = createServer(app);
  const origins = (process.env.CORS_ORIGIN ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  // Socket.IO needs its own CORS config (it does not reuse the express one).
  // Without it a cross-origin client (e.g. the Vercel static build talking to
  // this server) gets no Access-Control-Allow-Origin and polling never connects.
  const io = new Server(server, {
    cors: { origin: origins.length && !origins.includes("*") ? origins : true },
  });
  attachSocket(io, { commands, rooms, store });

  const port = Number(process.env.PORT ?? "3000");
  server.listen(port, () => console.log(`casino server listening on ${port}`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
