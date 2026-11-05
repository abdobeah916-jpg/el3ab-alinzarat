export function RoundTimer({ deadline }: { deadline?: number | null }) {
  return <div role="timer">{deadline ? "الوقت بيخلص" : ""}</div>;
}
