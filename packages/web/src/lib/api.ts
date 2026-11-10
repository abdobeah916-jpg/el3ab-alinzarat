/**
 * Resolves where the game server lives.
 *
 * Priority:
 *  1. `window.__CASINO_API_BASE__` — runtime override written into the static
 *     build (public/config.js), so the host can change without a rebuild.
 *  2. `VITE_API_BASE` — baked in at build time.
 *  3. Same origin — when the Express server serves the built web app itself.
 */
declare global {
  interface Window {
    __CASINO_API_BASE__?: string;
  }
}

export function apiBase(): string {
  const runtime = typeof window !== "undefined" ? window.__CASINO_API_BASE__ : undefined;
  const raw = (runtime ?? (import.meta as any).env?.VITE_API_BASE ?? "") as string;
  return raw.trim().replace(/\/+$/, "");
}

/**
 * Online rooms need the Express/Socket.IO server. When the app is served by
 * that server (same origin) or a base URL is configured, rooms are available.
 */
export function onlineEnabled(): boolean {
  if (apiBase()) return true;
  const env = (import.meta as any).env ?? {};
  if (env.DEV) return true;
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

export function roomUrl(code: string): string {
  const base = apiBase();
  return base ? `${base}/api/rooms/${code}` : `/api/rooms/${code}`;
}

async function post(path: string, body: unknown) {
  const r = await fetch(`${apiBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return r;
}

export async function createRoom() {
  const r = await post("/api/rooms", {});
  if (!r.ok) throw new Error("فشل إنشاء الغرفة");
  return r.json();
}

export async function joinRoom(code: string, name: string) {
  const r = await post(`/api/rooms/${code}/join`, { name });
  const data = await r.json();
  if (!r.ok) throw Object.assign(new Error(data.message ?? "فشل الانضمام"), { code: data.code });
  return data;
}

export async function reconnect(code: string, token: string) {
  const r = await post(`/api/rooms/${code}/reconnect`, { token });
  if (!r.ok) throw new Error("فشل الاسترجاع");
  return r.json();
}

export async function recoverJudge(code: string, recoveryCode: string) {
  const r = await post(`/api/rooms/${code}/judge/recover`, { recoveryCode });
  if (!r.ok) throw new Error("كود الاسترجاع غلط");
  return r.json();
}

/** Warms up a sleeping free host so the first room creation is not slow. */
export function warmUpServer(): void {
  const base = apiBase();
  if (!base) return;
  fetch(`${base}/api/health`, { cache: "no-store" } as any).catch(() => {});
}
