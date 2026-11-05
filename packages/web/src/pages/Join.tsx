import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { joinRoom } from "../lib/api";
import { saveSession } from "../lib/tokenStore";

export function Join() {
  const params = useParams();
  const nav = useNavigate();
  const [code, setCode] = useState(params.code ?? "");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    try {
      const data = await joinRoom(code.trim().toUpperCase(), name.trim());
      saveSession({ role: "player", code: code.trim().toUpperCase(), token: data.playerToken, playerId: data.playerId });
      nav(`/room/${code.trim().toUpperCase()}`);
    } catch (e: any) {
      setError(e.code === "room_full" ? "الغرفة مليانة" : "الكود غلط أو الاسم مستخدم");
    }
  }
  return (
    <main>
      <h2>انضم للغرفة</h2>
      <label>كود الغرفة<input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} /></label>
      <label>اسمك<input value={name} onChange={(e) => setName(e.target.value)} /></label>
      <button onClick={submit}>دخول</button>
      {error && <p role="alert">{error}</p>}
    </main>
  );
}
