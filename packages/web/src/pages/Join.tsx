import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { joinRoom } from "../lib/api";
import { saveSession, loadSession } from "../lib/tokenStore";
import { ArrowIcon, BellIcon } from "../components/icons";

export function Join() {
  const params = useParams();
  const nav = useNavigate();
  const session = loadSession();
  const [code, setCode] = useState((params.code ?? session?.code ?? "").toUpperCase());
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const clean = code.trim().toUpperCase();
      const data = await joinRoom(clean, name.trim());
      saveSession({ role: "player", code: clean, token: data.playerToken, playerId: data.playerId });
      nav(`/room/${clean}`);
    } catch (e: any) {
      setError(e.code === "room_full" ? "الغرفة مليانة — ٣ لاعبين بالكتير." : "الكود غلط أو الاسم مستخدم.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen screen--narrow screen--center page-enter">
      <a className="brand brand--sm" href="/">
        <span className="brand__mark"><BellIcon /></span>
        كازينو الألعاب
      </a>

      <div className="panel panel--gold" style={{ marginTop: 24 }}>
        <div className="stack stack--lg">
          <div className="stack" style={{ gap: 4 }}>
            <span className="eyebrow">دخول اللاعبين</span>
            <h1 style={{ fontSize: 28 }}>ادخل الغرفة</h1>
            <p className="muted" style={{ fontSize: 14 }}>هات الكود من الحكم واكتب اسمك.</p>
          </div>

          <div className="field">
            <label htmlFor="room-code">كود الغرفة</label>
            <input
              id="room-code"
              className="input input--code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              maxLength={6}
              inputMode="text"
              autoComplete="off"
              placeholder="ABC123"
            />
          </div>

          <div className="field">
            <label htmlFor="player-name">اسمك</label>
            <input
              id="player-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={16}
              placeholder="مثال: أحمد"
            />
          </div>

          {error && <p className="form-error" role="alert">{error}</p>}

          <button type="button" className="btn btn--gold btn--lg btn--block" onClick={submit} disabled={busy || code.length < 4 || name.trim().length < 2}>
            {busy ? "بيدخل…" : "دخول"}
            {!busy && <ArrowIcon />}
          </button>
        </div>
      </div>

      <p className="muted" style={{ textAlign: "center", marginTop: 18, fontSize: 13 }}>
        مفيش تسجيل ولا تحميل — الصفحة دي بتشتغل على الموبايل واللاب.
      </p>
    </div>
  );
}
