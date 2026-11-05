import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRoom } from "../lib/api";
import { saveSession } from "../lib/tokenStore";

export function Home() {
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState("");

  async function makeRoom() {
    const data = await createRoom();
    saveSession({ role: "judge", code: data.roomCode, token: data.judgeToken });
    setCode(data.roomCode);
    setRecovery(data.judgeRecoveryCode);
    nav(`/room/${data.roomCode}`);
  }
  return (
    <main>
      <h1>كازينو الألعاب</h1>
      <p>حكم واحد و٣ لاعبين. دوس الجرس واجاوب صح.</p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button onClick={makeRoom}>اعمل غرفة</button>
        <button onClick={() => nav("/join")}>انضم بكود</button>
      </div>
      {code && (
        <div style={{ marginTop: 16 }}>
          <div data-testid="room-code">{code}</div>
          <div>كود الاسترجاع: {recovery}</div>
        </div>
      )}
    </main>
  );
}
