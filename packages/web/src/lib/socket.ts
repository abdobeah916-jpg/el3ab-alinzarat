import { io, type Socket } from "socket.io-client";
import type { Session } from "./tokenStore";

export function createGameSocket(session: Session): Socket {
  const base = (import.meta as any).env?.VITE_API_BASE ?? "";
  return io(base || undefined, {
    auth: { code: session.code, token: session.token },
    transports: ["websocket"],
    reconnection: true,
  });
}
export function sendCommand(socket: Socket, envelope: any) {
  return new Promise<any>((resolve) => {
    socket.emit("command", envelope, (res: any) => resolve(res));
  });
}
