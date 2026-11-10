import { io } from "socket.io-client";

const BASE = process.env.BASE ?? "http://localhost:3000";

const post = async (path, body) => {
  const r = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return { status: r.status, data: await r.json() };
};

function connect(session) {
  return new Promise((resolve, reject) => {
    const s = io(BASE, { auth: { code: session.code, token: session.token }, transports: ["websocket"] });
    const states = [];
    const timer = setTimeout(() => reject(new Error("connect timeout")), 10000);
    s.on("connect", () => { clearTimeout(timer); resolve({ socket: s, states }); });
    s.on("state:patch", (st) => states.push(st));
    s.on("error", (e) => { clearTimeout(timer); reject(new Error("socket error " + JSON.stringify(e))); });
    s.on("connect_error", (e) => { clearTimeout(timer); reject(new Error("connect_error " + e.message)); });
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const main = async () => {
  const created = await post("/api/rooms", {});
  const code = created.data.roomCode;
  console.log("1. room created:", code);

  const a = await post(`/api/rooms/${code}/join`, { name: "أحمد" });
  const b = await post(`/api/rooms/${code}/join`, { name: "سارة" });
  console.log("2. joined players:", a.data.playerId, b.data.playerId);

  const judge = await connect({ code, token: created.data.judgeToken });
  const pa = await connect({ code, token: a.data.playerToken });
  const pb = await connect({ code, token: b.data.playerToken });
  await wait(300);

  const send = async (conn, who, command, id) => {
    const env = { id, actorId: who, expectedState: conn.states.at(-1)?.state, command };
    return new Promise((res) => conn.socket.emit("command", env, res));
  };

  const step = async (label, conn, who, command, id) => {
    const r = await send(conn, who, command, id);
    await wait(250);
    console.log(label.padEnd(28), r.ok ? "ok" : "FAIL " + r.code, "->", conn.states.at(-1)?.state);
    if (!r.ok) throw new Error(label + " failed: " + r.code);
    return r;
  };

  await step("judge openPowerupSelection", judge, "judge", { type: "judge:openPowerupSelection" }, "s1");
  await step("player A choose powerup", pa, a.data.playerId, { type: "player:choosePowerup", key: "shank" }, "s2");
  await step("player B choose powerup", pb, b.data.playerId, { type: "player:choosePowerup", key: "cobri" }, "s3");
  await step("judge startGame", judge, "judge", { type: "judge:startGame" }, "s4");
  await step("judge selectRoundKind", judge, "judge", { type: "judge:selectRoundKind", kind: "buzzer" }, "s5");
  await step("judge beginRound", judge, "judge", { type: "judge:beginRound" }, "s6");
  await step("judge selectCategory", judge, "judge", { type: "judge:selectCategory", categorySlug: "general" }, "s7");
  await step("judge selectQuestion", judge, "judge", { type: "judge:selectQuestion" }, "s8");
  await step("judge startQuestion", judge, "judge", { type: "judge:startQuestion" }, "s9");
  await step("judge openBuzzer", judge, "judge", { type: "judge:openBuzzer" }, "s10");

  const q = pa.states.at(-1)?.question;
  console.log("3. player view question:", q?.text?.slice(0, 45), "| leaked answer?", q && ("answer" in q ? "YES (BUG)" : "no"));

  await step("player B buzz", pb, b.data.playerId, { type: "player:buzz" }, "s11");
  const buzzOwner = judge.states.at(-1)?.buzzedPlayerId;
  console.log("4. buzzer owner (expect B):", buzzOwner === b.data.playerId ? "B ✓" : String(buzzOwner));

  await step("judge closeBuzzer", judge, "judge", { type: "judge:closeBuzzer" }, "s11b");
  await step("judge selectAnswerer", judge, "judge", { type: "judge:selectAnswerer", playerId: b.data.playerId }, "s12");
  await step("judge markCorrect", judge, "judge", { type: "judge:markCorrect" }, "s13");

  const scores = judge.states.at(-1)?.players?.map((p) => `${p.name}:${p.score}`);
  console.log("5. scores:", scores?.join(" | "));
  console.log("6. judge sees answer:", "answer" in (judge.states.at(-1)?.question ?? {}) ? "yes ✓" : "no");

  judge.socket.close(); pa.socket.close(); pb.socket.close();
  console.log("\nONLINE FLOW OK");
  process.exit(0);
};

main().catch((e) => { console.error("\nFAIL:", e.message); process.exit(1); });
