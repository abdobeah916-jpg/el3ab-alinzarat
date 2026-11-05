import { formatNumber } from "../lib/format";
export function Scoreboard({ players }: { players: any[] }) {
  return (
    <ol>
      {players.map((p) => (
        <li key={p.id} data-testid={`score-${p.id}`}>
          {p.name}: {formatNumber(p.score)} {p.isEliminated ? "خرج" : ""}
        </li>
      ))}
    </ol>
  );
}
