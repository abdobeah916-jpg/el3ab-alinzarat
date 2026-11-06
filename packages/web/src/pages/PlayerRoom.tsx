import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { createGameSocket, sendCommand } from "../lib/socket";
import { loadSession } from "../lib/tokenStore";
import { useGameStore } from "../store/gameStore";
import { BellButton } from "../components/BellButton";
import { QuestionCard } from "../components/QuestionCard";
import { Scoreboard } from "../components/Scoreboard";
import { ConnectionBanner } from "../components/ConnectionBanner";
import { Lobby } from "./Lobby";
import { BusRound } from "./BusRound";
import { RumbleRound } from "./RumbleRound";
import { formatNumber } from "../lib/format";
import { BellIcon, ChipIcon } from "../components/icons";

const KIND_LABEL: Record<string, string> = {
  buzzer: "جرس",
  bus: "أتوبيس",
  letter_race: "أكتر كلمات",
  rumble: "رويال رامبل",
};

export function PlayerRoom({ view: propView, send: propSend, connection }: { view?: any; send?: any; connection?: string } = {}) {
  const [view, setView] = useState<any>(propView ?? null);
  const params = useParams();
  const session = loadSession();
  const [locked, setLocked] = useState(false);
  const setViewStore = useGameStore((s) => s.setView);
  const socketRef = useRef<any>(null);
  const viewRef = useRef<any>(view);
  viewRef.current = view;

  useEffect(() => {
    if (propView) return;
    const code = params.code ?? session?.code ?? "";
    if (!code || !session) return;
    const socket = createGameSocket(session);
    socketRef.current = socket;
    socket.on("state:patch", (v: any) => { setView(v); setViewStore(v); });
    return () => { socket.close(); socketRef.current = null; };
  }, []);

  useEffect(() => { setLocked(false); }, [view?.buzzer?.deadline]);

  const send = (command: any) => {
    if (propSend) return propSend(command);
    if (!socketRef.current) return;
    return sendCommand(socketRef.current, {
      id: crypto.randomUUID(),
      actorId: session?.playerId ?? "",
      role: "player",
      expectedState: viewRef.current?.state,
      command,
    });
  };

  const buzz = () => {
    if (locked) return;
    setLocked(true);
    send({ type: "player:buzz" });
  };

  if (!view) {
    return (
      <div className="loading">
        <span className="spinner" aria-hidden="true" />
        <span>بندخل الغرفة…</span>
      </div>
    );
  }

  if (view.state === "lobby" || view.state === "powerup_selection") {
    return <Lobby view={view} onChoose={(k) => send({ type: "player:choosePowerup", key: k })} />;
  }

  const me = view.me;
  const cards = view.round?.cards ?? [];

  return (
    <div className="player-screen page-enter">
      <ConnectionBanner connection={connection ?? "connected"} />

      <header className="row row--between">
        <span className="brand brand--sm">
          <span className="brand__mark"><BellIcon /></span>
          كازينو الألعاب
        </span>
        <span className="pill pill--code">الغرفة <b>{view.code}</b></span>
      </header>

      <div className="player-hero">
        <span className="player-hero__label">نقاطك</span>
        <span className="player-hero__score">{formatNumber(me?.score ?? 0)}</span>
        <span className="player-hero__name">{me?.name}</span>
        <span className="row" style={{ justifyContent: "center", marginTop: 6 }}>
          {view.roundKind && <span className="tag tag--gold">{KIND_LABEL[view.roundKind] ?? view.roundKind}</span>}
          {me?.powerupKey && (
            <span className="tag">
              <ChipIcon style={{ width: 13, height: 13 }} />
              {me.powerupKey === "shank" ? "شنك الحرمية" : me.powerupKey === "cobri" ? "كوبري" : "سلم وتعبان"}
            </span>
          )}
        </span>
      </div>

      <section className="stage">
        <div className="stage__head">
          <span className="stage__label">{KIND_LABEL[view.roundKind] ?? "السؤال"}</span>
          {view.state === "question_active" && <span className="pill pill--live">الجرس مفتوح</span>}
        </div>
        {view.question ? (
          <QuestionCard question={view.question} />
        ) : (
          <p className="question question--waiting">القاضي بيقرأ السؤال… ركّز في إيدك على الجرس.</p>
        )}
      </section>

      {view.roundKind === "buzzer" && (
        <div className="bell-zone">
          <BellButton enabled={Boolean(view.buzzer?.isOpen) && !locked} onPress={buzz} myRank={view.buzzer?.myRank ?? null} />
        </div>
      )}

      {view.roundKind === "bus" && <BusRound view={view} send={send} />}
      {(view.roundKind === "rumble" || view.roundKind === "letter_race") && <RumbleRound view={view} send={send} />}

      <section className="panel">
        <div className="panel__head">
          <span className="panel__title">الترتيب</span>
          <span className="tag">{view.players.length} / 3</span>
        </div>
        <Scoreboard players={view.players} cards={cards} meId={me?.id} />
      </section>
    </div>
  );
}
