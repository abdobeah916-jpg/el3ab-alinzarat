import { io, type Socket } from "socket.io-client";
import type { Session } from "./tokenStore";
import { apiBase } from "./api";

export function createGameSocket(session: Session): Socket {
  return io(apiBase() || undefined, {
    auth: { code: session.code, token: session.token },
    // Polling first then upgrade: survives a free-host cold start and
    // networks that block a direct WebSocket handshake.
    transports: ["polling", "websocket"],
    reconnection: true,
    reconnectionDelay: 800,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });
}

export function sendCommand(socket: Socket, envelope: any) {
  return new Promise<any>((resolve) => {
    socket.emit("command", envelope, (res: any) => resolve(res));
  });
}
