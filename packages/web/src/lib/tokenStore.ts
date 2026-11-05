export type Session = { role: "judge" | "player"; code: string; token: string; playerId?: string };
const KEY = "casino.session";
export function saveSession(s: Session): void { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} }
export function loadSession(): Session | null {
  try { const raw = localStorage.getItem(KEY); if (!raw) return null; return JSON.parse(raw); } catch { return null; }
}
export function clearSession(): void { try { localStorage.removeItem(KEY); } catch {} }
