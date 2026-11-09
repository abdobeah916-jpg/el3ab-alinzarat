const base = (import.meta as any).env?.VITE_API_BASE ?? "";

/**
 * Online rooms need the Express/Socket.IO server. The static deployment on
 * Vercel has no backend, so the UI must say that instead of failing with a
 * generic network error.
 */
export function onlineEnabled(): boolean {
  if (base) return true;
  const env = (import.meta as any).env ?? {};
  if (env.DEV) return true;
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

export async function createRoom() {
  const r = await fetch(`${base}/api/rooms`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
  if (!r.ok) throw new Error("فشل إنشاء الغرفة");
  return r.json();
}
export async function joinRoom(code: string, name: string) {
  const r = await fetch(`${base}/api/rooms/${code}/join`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
  const data = await r.json();
  if (!r.ok) throw Object.assign(new Error(data.message ?? "فشل الانضمام"), { code: data.code });
  return data;
}
export async function reconnect(code: string, token: string) {
  const r = await fetch(`${base}/api/rooms/${code}/reconnect`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
  if (!r.ok) throw new Error("فشل الاسترجاع");
  return r.json();
}
export async function recoverJudge(code: string, recoveryCode: string) {
  const r = await fetch(`${base}/api/rooms/${code}/judge/recover`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recoveryCode }) });
  if (!r.ok) throw new Error("كود الاسترجاع غلط");
  return r.json();
}
