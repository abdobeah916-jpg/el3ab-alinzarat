import type { Server, Socket } from "socket.io";
import { toJudgeView, toPlayerView, toPlayerEvent } from "./projection";
import type { CommandService } from "./commands";
import type { RoomService } from "./rooms/roomService";

export function attachSocket(io: Server, deps: { commands: CommandService; rooms: RoomService; store: any }): void {
  io.on("connection", (socket: Socket) => {
    const auth = socket.handshake.auth as any;
    const code = auth?.code as string;
    const token = auth?.token as string;
    if (!code || !token) { socket.emit("error", { message: "مطلوب كود وتوكن" }); return; }
    deps.rooms.authenticate(code, token).then(async (a) => {
      if (a.role === "judge") socket.join(`room:${code}:judge`);
      else socket.join(`room:${code}:player:${a.playerId}`);
      socket.join(`room:${code}`);
      const rec = await deps.store.get(code);
      if (rec) socket.emit("state:patch", a.role === "judge" ? toJudgeView(rec.state) : toPlayerView(rec.state, a.playerId!));
      socket.on("command", async (envelope: any, ack?: any) => {
        if (envelope.actorId !== a.playerId && a.role !== "judge") return ack?.({ ok: false, code: "not_allowed" });
        const res = await deps.commands.execute(code, { ...envelope, role: a.role });
        if (res.ok && res.state) {
          io.to(`room:${code}:judge`).emit("state:patch", toJudgeView(res.state));
          io.to(`room:${code}`).emit("state:patch", toPlayerView(res.state, a.playerId ?? ""));
        }
        ack?.(res);
      });
    }).catch(() => socket.emit("error", { message: "فشل الاتصال" }));
  });
}
