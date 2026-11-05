import { useGameStore } from "../store/gameStore";
export function Toast() {
  const toast = useGameStore((s) => s.toast);
  if (!toast) return null;
  return <div role="status" aria-live="polite" style={{ position: "fixed", bottom: 16, right: 16, background: "var(--surface)", border: "1px solid var(--gold)", padding: 12, borderRadius: 12 }}>{toast}</div>;
}
