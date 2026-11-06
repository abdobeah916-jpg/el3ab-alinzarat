export function ConnectionBanner({ connection }: { connection: string }) {
  if (connection === "connected") return null;
  if (connection === "reconnecting") return <div className="banner banner--warn" role="status">بنجرب نرجع الاتصال…</div>;
  return (
    <div className="banner" role="alert">
      انقطع الاتصال <button type="button" className="btn btn--ghost" style={{ minHeight: 32, padding: "2px 10px", borderColor: "rgba(255,255,255,.4)" }} onClick={() => location.reload()}>جرّب تاني</button>
    </div>
  );
}
