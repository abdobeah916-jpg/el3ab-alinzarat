import { useEffect, useState } from "react";
import { formatDuration } from "../lib/format";
import { TimerIcon } from "./icons";

export function RoundTimer({ deadline, label }: { deadline?: number | null; label?: string }) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!deadline) return;
    const t = setInterval(() => tick((n) => n + 1), 250);
    return () => clearInterval(t);
  }, [deadline]);

  if (!deadline) return null;
  const left = Math.max(0, deadline - Date.now());
  return (
    <span className="timer" role="timer" data-hot={left <= 5000 ? "true" : "false"} aria-label={label ?? "الوقت المتبقي"}>
      <TimerIcon />
      {formatDuration(left)}
    </span>
  );
}
