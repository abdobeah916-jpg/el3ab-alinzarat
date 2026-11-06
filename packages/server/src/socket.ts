import type { Server, Socket } from "socket.io";
import { toJudgeView, toPlayerView } from "./projection";
import type { CommandService } from "./commands";
import type { RoomService } from "./rooms/roomService";

type Role = "judge" | "player";

/** Emit each socket the view it is allowed to see (judge keeps answers, players never get them). */
function broadcastState(io: Server, code: string, state: any): void {
  const room = io.sockets.adapter.rooms.get(`room:${code}`);
  if (!room) return;
  for (const socketId of room) {
    const socket = io.sockets.sockets.get(socketId);
    if (!socket) continue;
    const role = (socket.data as any).role as Role | undefined;
    const playerId = (socket.data as any).playerId as string | undefined;
    socket.emit("state:patch", role === "judge" ? toJudgeView(state) : toPlayerView(state, playerId ?? ""));
  }
}

export function attachSocket(io: Server, deps: { commands: CommandService; rooms: RoomService; store: any }): void {
  io.on("connection", (socket: Socket) => {
    const auth = socket.handshake.auth as any;
    const code = auth?.code as string;
    const token = auth?.token as string;
    if (!code || !token) { socket.emit("error", { message: "مطلوب كود وتوكن" }); return; }
    deps.rooms.authenticate(code, token).then(async (a) => {
      socket.data.role = a.role;
      socket.data.playerId = a.playerId;
      socket.data.code = code;
      if (a.role === "judge") socket.join(`room:${code}:judge`);
      else socket.join(`room:${code}:player:${a.playerId}`);
      socket.join(`room:${code}`);
      const rec = await deps.store.get(code);
      if (rec) {
        socket.emit("state:patch", a.role === "judge" ? toJudgeView(rec.state) : toPlayerView(rec.state, a.playerId!));
        broadcastState(io, code, rec.state);
      }
      socket.on("command", async (envelope: any, ack?: any) => {
        if (envelope.actorId !== a.playerId && a.role !== "judge") return ack?.({ ok: false, code: "not_allowed" });
        const res = await deps.commands.execute(code, { ...envelope, role: a.role });
        if (res.ok && res.state) {
          broadcastState(io, code, res.state);
        }
        ack?.({
          ok: res.ok,
          code: res.code,
          duplicate: res.duplicate,
          state: res.state
            ? (a.role === "judge" ? toJudgeView(res.state) : toPlayerView(res.state, a.playerId ?? ""))
            : undefined,
        });
      });
    }).catch(() => socket.emit("error", { message: "فشل الاتصال" }));
  });
}
