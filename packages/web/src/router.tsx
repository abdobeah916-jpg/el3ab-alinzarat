import { useMemo } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Home } from "./pages/Home";
import { Join } from "./pages/Join";
import { Lobby } from "./pages/Lobby";
import { JudgeRoom } from "./pages/JudgeRoom";
import { PlayerRoom } from "./pages/PlayerRoom";
import { AdminQuestions } from "./pages/AdminQuestions";
import { Display } from "./pages/Display";
import { BusRound } from "./pages/BusRound";
import { RumbleRound } from "./pages/RumbleRound";
import { LocalRoom } from "./pages/LocalRoom";
import { loadSession } from "./lib/tokenStore";

export function Router() {
  // Re-read the stored session on every navigation. Reading it once at mount
  // meant "/room/:code" bounced straight back to "/join" right after joining,
  // because the guard still saw the session from before the join.
  const location = useLocation();
  const session = useMemo(() => loadSession(), [location.key, location.pathname]);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/local" element={<LocalRoom />} />
      <Route path="/join" element={<Join />} />
      <Route path="/join/:code" element={<Join />} />
      <Route path="/room/:code/display" element={!session ? <Navigate to="/join" replace /> : <Display />} />
      <Route path="/room/:code" element={!session ? <Navigate to="/join" replace /> : session.role === "judge" ? <JudgeRoom /> : <PlayerRoom />} />
      <Route path="/room/:code/bus" element={<BusRound />} />
      <Route path="/room/:code/rumble" element={<RumbleRound />} />
      <Route path="/lobby" element={<Lobby />} />
      <Route path="/admin/questions" element={<AdminQuestions api={undefined} />} />
      <Route path="*" element={<div className="screen" style={{ paddingBlock: 80 }}><h1>الصفحة مش موجودة</h1><a className="btn btn--gold" href="/">ارجع للرئيسية</a></div>} />
    </Routes>
  );
}
