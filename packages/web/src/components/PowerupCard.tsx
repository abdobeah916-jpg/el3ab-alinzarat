export function PowerupCard({ powerup, state, disabled, onSelect }: { powerup: string; state?: string; disabled?: boolean; onSelect?: () => void }) {
  const name = powerup === "shank" ? "شنك الحرمية" : powerup === "cobri" ? "كوبري" : "سلم وتعبان";
  const color = powerup === "shank" ? "var(--shank)" : powerup === "cobri" ? "var(--cobri)" : "var(--salem)";
  return (
    <button style={{ borderColor: color, flex: 1 }} disabled={disabled || state === "reserved"} onClick={onSelect} aria-label={name}>
      <div>{name}</div>
      <div style={{ fontSize: 12, opacity: 0.8 }}>{state === "reserved" ? "محجوز" : state === "used" ? "اتستخدم" : "متاح"}</div>
    </button>
  );
}
