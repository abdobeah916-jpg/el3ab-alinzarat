import { Routes, Route, Navigate } from "react-router-dom";
import { Home } from "./pages/Home";
import { Join } from "./pages/Join";
import { Lobby } from "./pages/Lobby";
import { JudgeRoom } from "./pages/JudgeRoom";
import { PlayerRoom } from "./pages/PlayerRoom";
import { AdminQuestions } from "./pages/AdminQuestions";
import { BusRound } from "./pages/BusRound";
import { RumbleRound } from "./pages/RumbleRound";
import { loadSession } from "./lib/tokenStore";

export function Router() {
  const session = loadSession();
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/join" element={<Join />} />
      <Route path="/join/:code" element={<Join />} />
      <Route path="/room/:code" element={!session ? <Navigate to="/join" replace /> : session.role === "judge" ? <JudgeRoom /> : <PlayerRoom />} />
      <Route path="/room/:code/bus" element={<BusRound />} />
      <Route path="/room/:code/rumble" element={<RumbleRound />} />
      <Route path="/lobby" element={<Lobby />} />
      <Route path="/admin/questions" element={<AdminQuestions />} />
      <Route path="*" element={<div style={{ padding: 24 }}>الصفحة مش موجودة</div>} />
    </Routes>
  );
}
