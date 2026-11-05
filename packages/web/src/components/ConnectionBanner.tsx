export function ConnectionBanner({ connection }: { connection: string }) {
  if (connection === "connected") return null;
  if (connection === "reconnecting") return <div role="status">بنجرب نرجع الاتصال…</div>;
  return <div role="alert">انقطع الاتصال <button>إعادة المحاولة</button></div>;
}
