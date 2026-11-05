const base = (import.meta as any).env?.VITE_API_BASE ?? "";
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
