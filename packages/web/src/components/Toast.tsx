import { useGameStore } from "../store/gameStore";
import { SparkIcon } from "./icons";

export function Toast() {
  const toast = useGameStore((s) => s.toast);
  if (!toast) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      <SparkIcon style={{ width: 16, height: 16, color: "var(--gold)" }} />
      {toast}
    </div>
  );
}
