import { useEffect, useState } from "react";
import { createGameSocket } from "../lib/socket";
import { loadSession } from "../lib/tokenStore";
import { useGameStore } from "../store/gameStore";
import { BellButton } from "../components/BellButton";
import { QuestionCard } from "../components/QuestionCard";
import { Scoreboard } from "../components/Scoreboard";
import { ConnectionBanner } from "../components/ConnectionBanner";
import { Lobby } from "./Lobby";
import { formatNumber } from "../lib/format";

export function PlayerRoom({ view: propView, send, connection }: { view?: any; send?: any; connection?: string } = {}) {
  const [view, setView] = useState<any>(propView ?? null);
  const session = loadSession();
  const [locked, setLocked] = useState(false);
  const setViewStore = useGameStore((s) => s.setView);

  useEffect(() => { if (propView) return; const code = session?.code ?? ""; if (!code) return; const socket = createGameSocket(session!); socket.on("state:patch", (v: any) => { setView(v); setViewStore(v); }); return () => socket.close(); }, []);

  const buzz = () => {
    if (locked) return;
    setLocked(true);
    send?.({ type: "player:buzz" });
  };

  if (!view) return <div>بيحمل…</div>;
  if (view.state === "lobby" || view.state === "powerup_selection") return <Lobby view={view} onChoose={(k) => send?.({ type: "player:choosePowerup", key: k })} />;
  return (
    <main>
      <ConnectionBanner connection={connection ?? "connected"} />
      <div>{formatNumber(view.me?.score ?? 0)}</div>
      <QuestionCard question={view.question} />
      <Scoreboard players={view.players} />
      {view.roundKind === "buzzer" && <BellButton enabled={view.buzzer?.isOpen && !locked} onPress={buzz} myRank={view.buzzer?.myRank ?? null} />}
      {(view.state === "simultaneous_active" || view.state === "submissions_closed" || view.state === "reveal") && (
        <div style={{ marginTop: 8 }}>
          <div>الحرف: {view.busLetter ?? ""}</div>
        </div>
      )}
    </main>
  );
}
