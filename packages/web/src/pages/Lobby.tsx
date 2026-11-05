import { PowerupCard } from "../components/PowerupCard";
import { formatNumber } from "../lib/format";

export function Lobby({ view, onChoose }: { view: any; onChoose?: (key: string) => void }) {
  const players = view?.players ?? [];
  const myTaken = view?.me?.powerupKey ?? null;
  return (
    <main>
      <h2>اللوبي</h2>
      <div data-testid="room-code">{view?.code ?? ""}</div>
      <div>{formatNumber(players.length)} / {formatNumber(3)}</div>
      <div style={{ display: "flex", gap: 8 }}>
        {(["shank", "cobri", "salem"] as const).map((key) => {
          const taken = players.some((p: any) => p.powerupKey === key);
          const mine = myTaken === key;
          return (
            <PowerupCard
              key={key}
              powerup={key}
              state={mine ? "reserved" : taken ? "reserved" : "none"}
              disabled={taken && !mine}
              onSelect={() => onChoose?.(key)}
            />
          );
        })}
      </div>
      <p>انتظر باقي اللاعبين</p>
    </main>
  );
}
