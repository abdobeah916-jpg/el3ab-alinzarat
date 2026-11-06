# كازينو الألعاب — خطة التنفيذ

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** بناء لعبة ويب عربية RTL لحظية: حكم + ٣ لاعبين، جرس وكروت و٣ Power-Ups و٣ أوضاع لعب، منشورة كـ PWA.

**Architecture:** Monorepo بثلاث حزم منطقية: `game-core` (State Machine نقية بدون I/O)، `shared` (العقود والأنواع وZod)، `questions` (بنك الأسئلة). سيرفر Node/Socket.IO رفيع يتحقق من الصلاحيات ويطبّق الأوامر ويحفظ snapshot، وواجهة React تعرض فقط.

**Tech Stack:** TypeScript (strict) • pnpm workspaces • React 19 + Vite 6 + Tailwind 4 • Node 22 + Express 5 + Socket.IO 4 • PostgreSQL + Prisma 6 • Zod 3 • Vitest 3 • Playwright 1.50 • Docker.

**Spec:** `docs/superpowers/specs/2026-11-05-el3ab-alinzarat-design.md`

## Global Constraints

- Node **22+** و pnpm **9+**، و`strict: true` في كل الحزم.
- كل الواجهة عربية، `dir="rtl"` و`lang="ar"`، بدون نص إنجليزي ظاهر للمستخدم.
- **٣ لاعبين كحد أقصى**، وكل كارت Power-Up حصري للاعب واحد.
- **كل منطق اللعبة في `game-core`**؛ لا حساب نقاط ولا ترتيب جرس في الواجهة أو السيرفر.
- **الإجابة الصحيحة لا تظهر أبدًا في DTO اللاعب**، حتى لو `showQuestionToPlayers=true`.
- التوقيت والترتيب من **ساعة السيرفر** فقط؛ ممنوع أي وقت من المتصفح.
- القيم الافتراضية: `questionCount=10`، `pointsPerCorrect=1`، `allowNegative=true`، `buzzerSeconds=15`، `showQuestionToPlayers=false`، `showBuzzerNames=true`، `yellowPenalty=-1`، `redPenalty=-3`، `shankPenalty=-3`، `busSeconds=90`، `letterRaceMaxPoints=5`، `busCategories=["اسم","بلد","حيوان","نبات","جماد","أكلة"]`.
- «سلم وتعبان»: صاحب الكارت يجاوب السؤال التالي؛ صح → يختار هدفًا ويخصم `-3`؛ غلط → `-1` لصاحب الكارت؛ الكارت يُستهلك في الحالتين.
- رويال رامبل: التكرار أو الغلط = إقصاء؛ الصحيح الفريد بدون نقاط؛ فضل اتنين → `+1` لكل واحد؛ فضل واحد → `+2`؛ خروج الكل → إلغاء السؤال وإعادة الجولة بسؤال جديد.
- أتوبيس: أول «أتوبيس» يقفل الإرسال للجميع؛ كل إجابة صحيحة `+1` (فريدة أو مشتركة)؛ مفيش بونص نقطتين.
- **ممنوع أي صوت أو لقطات أفلام/أغاني محمية**؛ الصور الحرة فقط مع `mediaCredit` ظاهر.
- كل أمر Socket يحمل `id` (idempotency) و`expectedState`، ويُرَدّ إن كانت الحالة مختلفة.
- لا تُخزَّن كلمات مرور؛ التوكنات عشوائية ٢٥٦-بت وتُخزَّن hash.

## Review Focus

هذه الحالات لا يغطيها نص التصميم صراحةً، وكل واحدة لها اختبار داخل المهمة المالكة:

1. **ضغطتان في نفس المللي ثانية** — الترتيب لازم يبقى ثابتًا ومتكررًا، ويُحسم بـ `(at, seq)` لا بترتيب وصول الشبكة.
2. **تسريب الإجابة في DTO اللاعب** — في كل حالة (سؤال نشط، تصحيح، نتيجة، كشف أتوبيس/رويال) اللاعب لا يستقبل `answer` ولا `acceptedAnswers` ولا `correctIndex` ولا `options` الصحيحة.
3. **اختلافات كتابة الإجابة العربية** — «أحمد/احمد»، «مدرسة/مدرسه»، التشكيل، «ال» التعريف، والمسافات لازم تتطابق في رويال رامبل وأتوبيس.
4. **إعادة إرسال نفس الأمر بعد انقطاع** — نفس `id` لا يطبّق نقاطًا أو كروتًا مرتين، ويعيد نفس النتيجة.
5. **الغرفة الرابعة وحجز نفس الكارت** — لو وصل طلبان في نفس اللحظة، السيرفر يرفض الرابع والكارت المكرر، وقيد قاعدة البيانات هو الخط الأخير.

---

## هيكل الملفات

```
el3ab-alinzarat/
  package.json  pnpm-workspace.yaml  tsconfig.base.json  .gitignore  .env.example
  Dockerfile  railway.json
  packages/
    shared/
      src/{index,constants,types,commands,events,dto,protocol,answers,questions}.ts
      test/{answers,questions,protocol}.test.ts
    game-core/
      src/{index,state,machine,lobby,timers,buzzer,judging,powerups,bus,letterRace,rumble,tiebreak,projection}.ts
      test/{lobby,buzzer,judging,powerups,bus,letterRace,rumble,tiebreak,timers}.test.ts
    questions/
      data/{categories.json,questions.seed.json}
      src/{seed,validateBank,importCsv}.ts
      test/{seed,validateBank}.test.ts
    server/
      src/{index,http,socket,projection,ids,tokens,timers}.ts
      src/rooms/{roomService,roomStore,memoryStore,prismaStore}.ts
      src/questions/questionService.ts
      prisma/{schema.prisma,seed.ts}
      test/{rooms,auth,socket,idempotency,projection}.test.ts
    web/
      index.html  vite.config.ts  public/{manifest.webmanifest,icons/*}
      src/{main,App,router}.tsx
      src/styles/{theme.css,animations.css}
      src/lib/{api,socket,tokenStore,format}.ts
      src/store/gameStore.ts
      src/pages/{Home,Join,Lobby,JudgeRoom,PlayerRoom,AdminQuestions}.tsx
      src/components/{BellButton,Scoreboard,QuestionCard,MediaCard,PowerupCard,CardBadge,BusGrid,RumblePanel,RevealList,ResultsTable,Toast}.tsx
      test/e2e/*.spec.ts
```

---

### Task 1: Scaffold المونوريبو + الثوابت المشتركة

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `.env.example`
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`
- Create: `packages/shared/src/constants.ts`, `packages/shared/src/types.ts`, `packages/shared/src/index.ts`
- Test: `packages/shared/test/constants.test.ts`

**Interfaces:**
- Produces: `DEFAULT_SETTINGS: GameSettings`، `POWERUP_KEYS: readonly ["shank","cobri","salem"]`، `MAX_PLAYERS = 3`، `type PowerupKey`, `type State`, `type RoundKind`, `type GameSettings`, `type PlayerState`, `type RoomState`.

- [ ] **Step 1: اكتب الاختبار الفاشل**

```ts
// packages/shared/test/constants.test.ts
import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, MAX_PLAYERS, POWERUP_KEYS } from "../src/constants";

describe("constants", () => {
  it("يحمل القيم الافتراضية المعتمدة", () => {
    expect(DEFAULT_SETTINGS).toMatchObject({
      questionCount: 10, pointsPerCorrect: 1, allowNegative: true,
      buzzerSeconds: 15, showQuestionToPlayers: false, showBuzzerNames: true,
      yellowPenalty: -1, redPenalty: -3, shankPenalty: -3,
      busSeconds: 90, letterRaceMaxPoints: 5,
    });
    expect(DEFAULT_SETTINGS.busCategories).toEqual(["اسم", "بلد", "حيوان", "نبات", "جماد", "أكلة"]);
  });
  it("ثلاثة لاعبين وثلاثة كروت فقط", () => {
    expect(MAX_PLAYERS).toBe(3);
    expect(POWERUP_KEYS).toEqual(["shank", "cobri", "salem"]);
  });
});
```

- [ ] **Step 2: شغّل الاختبار وتأكد أنه يفشل**

Run: `pnpm --filter @casino/shared test` — Expected: FAIL، الموديول غير موجود.

- [ ] **Step 3: أنشئ الإعدادات والأنواع**

`tsconfig.base.json` يفعّل `strict`, `noUncheckedIndexedAccess`, `moduleResolution: "Bundler"`, `target: "ES2022"`. الجذر يحتوي سكربتات `dev/build/test/lint`، و`pnpm-workspace.yaml` يعرّف `packages/*`.

```ts
// packages/shared/src/types.ts (كامل — يمتد في المهام التالية)
export type State = "lobby" | "setup" | "powerup_selection" | "ready" | "round_intro"
  | "question_setup" | "question_active" | "buzzer_locked" | "answering" | "judging"
  | "card_action" | "result" | "next_question" | "finished" | "tie_breaker"
  | "simultaneous_active" | "submissions_closed" | "reveal";
export type RoundKind = "buzzer" | "bus" | "letter_race" | "rumble";
export type PowerupKey = "shank" | "cobri" | "salem";
export type PowerupState = "none" | "reserved" | "used";
export type QuestionType = "open" | "mcq" | "true_false" | "capital" | "quote" | "proverb"
  | "actor" | "reversed" | "reversed_song" | "description" | "song" | "singer_song"
  | "movie_line" | "movie_scene" | "number_guess" | "flag" | "city_image";
export type SalemSettings = { answerer: "owner" | "target"; applyOn: "correct" | "wrong"; targetPenalty: number; ownerPenaltyOnWrong: number };
export type GameSettings = {
  questionCount: number; pointsPerCorrect: number; allowNegative: boolean;
  buzzerSeconds: number; showQuestionToPlayers: boolean; showBuzzerNames: boolean;
  yellowPenalty: number; redPenalty: number; shankPenalty: number;
  busSeconds: number; busCategories: string[]; letterRaceMaxPoints: number; salem: SalemSettings;
};
export type PlayerState = {
  id: string; name: string; score: number; isEliminated: boolean; isConnected: boolean;
  powerupKey: PowerupKey | null; powerupState: PowerupState; joinedAt: number;
};
export type Question = {
  id: string; categorySlug: string; text: string; answer: string; acceptedAnswers: string[];
  type: QuestionType; difficulty: "easy" | "medium" | "hard"; options?: string[];
  correctIndex?: number; mediaUrl?: string; mediaType?: "image" | "none";
  mediaCredit?: string; letter?: string; answerMode?: "single" | "grid" | "choice";
};
export type Category = { slug: string; name: string; isCustom?: boolean };
export type RoomState = {
  roomCode: string; state: State; paused: boolean; resumeState: State | null; seq: number;
  roundKind: RoundKind; settings: GameSettings; players: PlayerState[];
  currentQuestion: Question | null; selectedCategory: string | null; usedQuestionIds: string[];
  buzzer: { isOpen: boolean; openedAt: number | null; deadline: number | null; presses: { playerId: string; at: number; seq: number }[] } | null;
  answererId: string | null;
  pendingPowerup: { ownerId: string; key: PowerupKey; targetId?: string; categorySlug?: string; returnState: State } | null;
  salem: { ownerId: string; targetId: string; state: "active" } | null;
  nextCategoryOverride: string | null;
  submissions: { playerId: string; payload: SubmissionPayload; acceptedCells?: Record<string, boolean>; acceptedWords?: boolean[] }[];
  busLetter: string | null; submissionsClosedAt: number | null;
  rumble: { verdicts: Record<string, "correct" | "wrong">; confirmed: boolean; replayed: boolean; eliminatedBefore: string[] } | null;
  round: { index: number; tieBreaker: boolean; winnerId: string | null; cards: { playerId: string; card: "yellow" | "red" }[] };
  usedCards: { playerId: string; card: "yellow" | "red" }[];
  events: number;
};
```

`constants.ts` يحتوي `DEFAULT_SETTINGS` و`POWERUP_KEYS` و`MAX_PLAYERS` و`CATEGORY_SLUGS` (١١ تصنيفًا).

> `setup` و`judging` محجوزتان في اتحاد الحالات للتوافق مع التصميم: `setup` لإعدادات ما قبل الجولة، و`judging` تُمرَّر داخليًا داخل أمر الحكم ولا تستقر فيها الواجهة. كل الانتقالات الأخرى تستخدم الحالات الـ١٦ الفعلية.

- [ ] **Step 4: شغّل الاختبارات**

Run: `pnpm --filter @casino/shared test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json .gitignore .env.example packages/shared
git commit -m "chore: scaffold monorepo and shared constants"
```

---

### Task 2: تطبيع الإجابات + تحقق بنك الأسئلة + عقد الأوامر

**Files:**
- Create: `packages/shared/src/answers.ts`, `packages/shared/src/questions.ts`, `packages/shared/src/commands.ts`, `packages/shared/src/events.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/test/answers.test.ts`, `packages/shared/test/questions.test.ts`

**Interfaces:**
- Produces:
  - `normalizeAnswer(raw: string): string`
  - `answersMatch(given: string, canonical: string, accepted?: string[]): boolean`
  - `groupDuplicates(entries: { playerId: string; answer: string }[]): Map<string, string[]>`
  - `validateQuestion(q: Question): string[]` (قائمة أخطاء فارغة = صالح)
  - `hashQuestion(q: Pick<Question,"text"|"categorySlug">): string`
  - `type Command` و`type CommandEnvelope` و`type RejectCode = "wrong_state" | "not_allowed" | "room_full" | "duplicate_powerup" | "invalid_payload" | "already_used" | "wrong_phase" | "tie_needed"`
  - `type GameEvent` (اتحاد مغلق بأسماء الأحداث في التصميم)

- [ ] **Step 1: اكتب اختبارات التطبيع**

```ts
// packages/shared/test/answers.test.ts
import { describe, expect, it } from "vitest";
import { answersMatch, groupDuplicates, normalizeAnswer } from "../src/answers";

describe("normalizeAnswer", () => {
  it("يوحّد الهمزات والتاء المربوطة والياء والتشكيل", () => {
    expect(normalizeAnswer("أَحْمَد")).toBe(normalizeAnswer("احمد"));
    expect(normalizeAnswer("مدرسة")).toBe(normalizeAnswer("مدرسه"));
    expect(normalizeAnswer("مصطفى")).toBe(normalizeAnswer("مصطفي"));
  });
  it("يشيل ال التعريف والمسافات الزائدة", () => {
    expect(normalizeAnswer("  القاهرة ")).toBe(normalizeAnswer("قاهره"));
    expect(normalizeAnswer("أبو ظبي")).toBe(normalizeAnswer("ابوظبي"));
  });
  it("يطابق الإجابات البديلة", () => {
    expect(answersMatch("الاردن", "الأردن")).toBe(true);
    expect(answersMatch("عمّان", "عمان", ["عمان"])).toBe(true);
    expect(answersMatch("بيروت", "عمان")).toBe(false);
  });
});

describe("groupDuplicates", () => {
  it("يجمع الإجابات المتطابقة بعد التطبيع", () => {
    const groups = groupDuplicates([
      { playerId: "p1", answer: "القاهرة" },
      { playerId: "p2", answer: "قاهره" },
      { playerId: "p3", answer: "اسكندرية" },
    ]);
    expect(groups.get(normalizeAnswer("القاهرة"))).toEqual(["p1", "p2"]);
    expect(groups.size).toBe(2);
  });
});
```

- [ ] **Step 2: شغّل الاختبار وتأكد أنه يفشل**

Run: `pnpm --filter @casino/shared test answers` — Expected: FAIL.

- [ ] **Step 3: نفّذ التطبيع والتحقق**

`normalizeAnswer`: trim → إزالة التشكيل والتطويل → توحيد `أإآٱ→ا`, `ة→ه`, `ى→ي`, `ؤ→و`, `ئ→ي` → lowercase لاتيني → إزالة `ال` من بداية كل كلمة → إزالة كل المسافات والترقيم.

`validateQuestion` يرفض: نص/إجابة فارغة، `mcq` بدون ٤ اختيارات و`correctIndex` خارج المدى، `flag`/`city_image` بدون `mediaUrl`، `city_image`/`flag` بدون `mediaCredit`، `number_guess` بدون رقم في الإجابة، تكرار خيارات. `hashQuestion` = SHA-256 على `normalizeAnswer(text)|categorySlug`.

`commands.ts` يعرّف الاتحاد الكامل (يستخدمه كل ما بعده):

```ts
export type SubmissionPayload =
  | { kind: "bus"; answers: Record<string, string> }
  | { kind: "letter_race"; words: string[] }
  | { kind: "rumble"; answer: string };

export type Command =
  | { type: "system:addPlayer"; player: { id: string; name: string } }
  | { type: "system:removePlayer"; playerId: string }
  | { type: "system:setConnection"; playerId: string; connected: boolean }
  | { type: "judge:openPowerupSelection" } | { type: "judge:startGame" }
  | { type: "judge:selectRoundKind"; kind: RoundKind } | { type: "judge:beginRound" }
  | { type: "judge:selectCategory"; categorySlug: string }
  | { type: "judge:selectQuestion"; question: Question }
  | { type: "judge:startQuestion" } | { type: "judge:openBuzzer" } | { type: "judge:closeBuzzer" }
  | { type: "judge:selectAnswerer"; playerId: string }
  | { type: "judge:markCorrect" } | { type: "judge:markWrong" }
  | { type: "judge:playCard"; playerId: string; card: "yellow" | "red" }
  | { type: "judge:adjustScore"; playerId: string; delta: number; reason: string }
  | { type: "judge:resolvePowerup"; approve: boolean }
  | { type: "judge:closeSubmissions" } | { type: "judge:openReveal" }
  | { type: "judge:endQuestion" } | { type: "judge:setBusLetter"; letter: string }
  | { type: "judge:judgeBusCell"; playerId: string; category: string; accepted: boolean }
  | { type: "judge:judgeWord"; playerId: string; wordIndex: number; accepted: boolean }
  | { type: "judge:approveAllSubmissions" }
  | { type: "judge:setRumbleVerdict"; playerId: string; verdict: "correct" | "wrong" }
  | { type: "judge:confirmRumbleResult" }
  | { type: "judge:skipQuestion" } | { type: "judge:nextQuestion" } | { type: "judge:endGame" }
  | { type: "judge:startTieBreaker" } | { type: "judge:declareTie" } | { type: "judge:rematch" }
  | { type: "judge:pause" } | { type: "judge:resume" }
  | { type: "system:deadline" }
  | { type: "player:choosePowerup"; key: PowerupKey }
  | { type: "player:activatePowerup"; targetId?: string; categorySlug?: string }
  | { type: "player:chooseSalemTarget"; targetId: string }
  | { type: "player:buzz" } | { type: "player:submitRound"; payload: SubmissionPayload }
  | { type: "player:callBus" };

export type CommandEnvelope = { id: string; actorId: string; role: "judge" | "player" | "system"; expectedState: State; command: Command };
```

`events.ts`: اتحاد `GameEvent` بأسماء مثل `room_created`, `player_joined`, `player_left`, `powerup_reserved`, `powerup_rejected`, `game_started`, `round_started`, `question_selected`, `question_started`, `buzzer_opened`, `buzzer_pressed`, `buzzer_closed`, `answerer_selected`, `answer_judged`, `card_played`, `powerup_resolved`, `submissions_closed`, `submission_judged`, `rumble_resolved`, `round_replayed`, `score_adjusted`, `tie_breaker_started`, `game_finished`, `command_rejected`؛ كل حدث `{ id, roomCode, seq, at, type, actorId?, payload }`.

- [ ] **Step 4: شغّل الاختبارات**

Run: `pnpm --filter @casino/shared test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src packages/shared/test
git commit -m "feat(shared): arabic answer normalization, question validation, command contracts"
```

---

### Task 3: game-core — الحالة الابتدائية، الانضمام/الخروج، واختيار الكروت

**Files:**
- Create: `packages/game-core/package.json`, `packages/game-core/tsconfig.json`
- Create: `packages/game-core/src/{state,machine,lobby,index}.ts`
- Test: `packages/game-core/test/lobby.test.ts`

**Interfaces:**
- Consumes: `RoomState`, `Command`, `CommandEnvelope`, `RejectCode`, `DEFAULT_SETTINGS`, `POWERUP_KEYS`.
- Produces:
  - `createInitialState(input: { roomCode: string; settings?: Partial<GameSettings>; players?: { id: string; name: string }[] }): RoomState`
  - `applyCommand(state: RoomState, envelope: CommandEnvelope, ctx: { at: number; seq: number }): CommandResult`
  - `type CommandResult = { ok: true; state: RoomState; events: GameEvent[] } | { ok: false; code: RejectCode; message: string }`
  - `getConnectedPlayers(state): PlayerState[]`

- [ ] **Step 1: اكتب اختبارات اللوبي والكروت**

```ts
// packages/game-core/test/lobby.test.ts
import { describe, expect, it } from "vitest";
import { applyCommand, createInitialState } from "../src";

const ctx = { at: 1_000, seq: 1 };
const env = (command: any, over: Partial<any> = {}) => ({ id: `c${ctx.seq}`, actorId: "judge", role: "judge", expectedState: "lobby", command, ...over });

describe("lobby", () => {
  it("يرفض اللاعب الرابع", () => {
    let s = createInitialState({ roomCode: "ABC123" });
    for (const p of ["p1", "p2", "p3"]) {
      const r = applyCommand(s, env({ type: "system:addPlayer", player: { id: p, name: p } }, { role: "system" }), ctx);
      expect(r.ok).toBe(true); if (r.ok) s = r.state;
    }
    const r = applyCommand(s, env({ type: "system:addPlayer", player: { id: "p4", name: "p4" } }, { role: "system" }), ctx);
    expect(r).toEqual(expect.objectContaining({ ok: false, code: "room_full" }));
  });

  it("يرفض أمرًا في حالة غير متوقعة", () => {
    const s = createInitialState({ roomCode: "ABC123" });
    const r = applyCommand(s, { ...env({ type: "judge:startGame" }), expectedState: "finished" }, ctx);
    expect(r.ok ? null : r.code).toBe("wrong_state");
  });

  it("يحجز الكارت مرة واحدة فقط", () => {
    let s = createInitialState({ roomCode: "ABC123", players: [{ id: "p1", name: "أ" }, { id: "p2", name: "ب" }] });
    let r = applyCommand(s, env({ type: "judge:openPowerupSelection" }), ctx);
    expect(r.ok).toBe(true); if (r.ok) s = r.state;
    r = applyCommand(s, env({ type: "player:choosePowerup", key: "shank" }, { actorId: "p1", role: "player" }), ctx);
    expect(r.ok).toBe(true); if (r.ok) s = r.state;
    r = applyCommand(s, env({ type: "player:choosePowerup", key: "shank" }, { actorId: "p2", role: "player" }), ctx);
    expect(r.ok ? null : r.code).toBe("duplicate_powerup");
  });

  it("يمنع اللاعب من التصرف بدور الحكم", () => {
    const s = createInitialState({ roomCode: "ABC123", players: [{ id: "p1", name: "أ" }] });
    const r = applyCommand(s, env({ type: "judge:startGame" }, { actorId: "p1", role: "player" }), ctx);
    expect(r.ok ? null : r.code).toBe("not_allowed");
  });
});
```

- [ ] **Step 2: شغّل الاختبار وتأكد أنه يفشل**

Run: `pnpm --filter @casino/game-core test lobby` — Expected: FAIL.

- [ ] **Step 3: نفّذ الحالة والآلة**

- `createInitialState` ينسخ `DEFAULT_SETTINGS` بعمق، ويضيف اللاعبين بحالة كارت `none`، والنتيجة صفر، ويرفض أكثر من ٣ لاعبين في المدخلات.
- `applyCommand` يتحقق بالترتيب: الحالة المتوقعة → الدور (أي أمر يبدأ بـ`judge:` دوره `judge` فقط، و`player:` للاعب موجود وغير مقصي) → الإيقاف (أي أمر غير `judge:resume` مرفوض أثناء `paused`) → التطبيق.
- `system:addPlayer` يضيف فقط في `lobby`، ويرفض الرابع بـ`room_full`، ويرفض الاسم المكرر بـ`invalid_payload`.
- `system:removePlayer` قبل بدء الأسئلة يحرّر الكارت المحجوز ويعيده `none`؛ بعد `ready` يبقى الكارت ملك اللاعب ويصبح `isConnected=false`.
- `judge:openPowerupSelection`: `lobby → powerup_selection`، ويتطلب ١–٣ لاعبين.
- `player:choosePowerup`: يرفض لو الكارت محجوز (`duplicate_powerup`)، ويضبط `powerupState="reserved"`، ويبث `powerup_reserved`.
- `judge:startGame`: `powerup_selection → ready`، ويقبل لاعبًا بلا كارت (يفقد الكارت) بشرط وجود لاعب واحد على الأقل.
- `judge:selectRoundKind`: `ready → round_intro` ويضبط `roundKind`.
- كل نجاح يزيد `seq` (نسخة الحالة) ويولّد حدثًا واحدًا على الأقل.

- [ ] **Step 4: شغّل الاختبارات**

Run: `pnpm --filter @casino/game-core test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/game-core
git commit -m "feat(game-core): lobby, roles, player cap and exclusive powerup reservation"
```

---

### Task 4: game-core — بدء الجولة واختيار السؤال

**Files:**
- Modify: `packages/game-core/src/machine.ts`, `packages/game-core/src/lobby.ts`
- Create: `packages/game-core/src/timers.ts`
- Test: `packages/game-core/test/timers.test.ts`

**Interfaces:**
- Consumes: `applyCommand`, `CommandEnvelope`, `Question`, `RoundKind`.
- Produces: `isRoundKindCompatible(state: RoomState): boolean`؛ الانتقالات: `round_intro → question_setup → (question_active | simultaneous_active)`.

- [ ] **Step 1: اكتب الاختبار**

```ts
// packages/game-core/test/timers.test.ts
import { describe, expect, it } from "vitest";
import { applyCommand, createInitialState } from "../src";
import { makeQuestion } from "./fixtures";

const judge = (state: any, command: any, expectedState: any, seq = 1) =>
  applyCommand(state, { id: `c${seq}`, actorId: "judge", role: "judge", expectedState, command }, { at: 5_000, seq });

describe("دورة السؤال", () => {
  it("لا يبدأ السؤال قبل اختياره", () => {
    let s = createInitialState({ roomCode: "ABC123", players: [{ id: "p1", name: "أ" }] });
    let r: any = judge(s, { type: "judge:openPowerupSelection" }, "lobby");
    s = r.state; r = judge(s, { type: "judge:startGame" }, "powerup_selection", 2); s = r.state;
    r = judge(s, { type: "judge:selectRoundKind", kind: "buzzer" }, "ready", 3); s = r.state;
    r = judge(s, { type: "judge:beginRound" }, "round_intro", 4); s = r.state;
    r = judge(s, { type: "judge:startQuestion" }, "question_setup", 5);
    expect(r.ok ? null : r.code).toBe("wrong_phase");
  });

  it("يخزّن السؤال ويبدأه ويفتح الجرس", () => {
    let s = createInitialState({ roomCode: "ABC123", players: [{ id: "p1", name: "أ" }] });
    let r: any = judge(s, { type: "judge:openPowerupSelection" }, "lobby"); s = r.state;
    r = judge(s, { type: "judge:startGame" }, "powerup_selection", 2); s = r.state;
    r = judge(s, { type: "judge:selectRoundKind", kind: "buzzer" }, "ready", 3); s = r.state;
    r = judge(s, { type: "judge:beginRound" }, "round_intro", 4); s = r.state;
    r = judge(s, { type: "judge:selectQuestion", question: makeQuestion() }, "question_setup", 5); s = r.state;
    expect(s.currentQuestion?.id).toBe("q1");
    expect(s.state).toBe("question_setup");
    r = judge(s, { type: "judge:startQuestion" }, "question_setup", 6); s = r.state;
    expect(s.state).toBe("question_active");
    expect(s.currentQuestion).not.toBeNull();
  });

  it("كوبري يفرض تصنيف السؤال التالي مرة واحدة", () => {
    let s = createInitialState({ roomCode: "ABC123", players: [{ id: "p1", name: "أ" }, { id: "p2", name: "ب" }] });
    let r: any = judge(s, { type: "judge:openPowerupSelection" }, "lobby"); s = r.state;
    r = applyCommand(s, { id: "c2", actorId: "p2", role: "player", expectedState: "powerup_selection", command: { type: "player:choosePowerup", key: "cobri" } }, { at: 5_000, seq: 2 }); s = r.state;
    r = judge(s, { type: "judge:startGame" }, "powerup_selection", 3); s = r.state;
    r = applyCommand(s, { id: "c4", actorId: "p2", role: "player", expectedState: "ready", command: { type: "player:activatePowerup", categorySlug: "history" } }, { at: 5_000, seq: 4 }); s = r.state;
    r = judge(s, { type: "judge:resolvePowerup", approve: true }, "ready", 5); s = r.state;
    expect(s.nextCategoryOverride).toBe("history");
    r = judge(s, { type: "judge:selectRoundKind", kind: "buzzer" }, "ready", 6); s = r.state;
    r = judge(s, { type: "judge:beginRound" }, "round_intro", 7); s = r.state;
    r = judge(s, { type: "judge:selectCategory", categorySlug: "geography" }, "question_setup", 8); s = r.state;
    r = judge(s, { type: "judge:selectQuestion", question: makeQuestion({ categorySlug: "geography" }) }, "question_setup", 9); s = r.state;
    expect(r.ok).toBe(true);
    expect(s.currentQuestion?.categorySlug).toBe("geography");
    expect(s.nextCategoryOverride).toBeNull();
  });
});
```

> ملاحظة للمنفّذ: أي سؤال يُمرَّر إلى `judge:selectQuestion` لازم يكون كائن `Question` كاملًا. الواجهة لا ترسله؛ الخادم يختاره من البنك ويحقنه قبل `applyCommand` (Task 15/21).

- [ ] **Step 2: شغّل الاختبار وتأكد أنه يفشل**

Run: `pnpm --filter @casino/game-core test timers` — Expected: FAIL (`wrong_phase` غير مطبق).

- [ ] **Step 3: نفّذ الانتقالات**

- `judge:beginRound`: `round_intro → question_setup`، يضبط `round.index`، ويبث `round_started`.
- `judge:selectCategory`: مسموح في `question_setup`/`result`/`next_question`، يضبط `selectedCategory`.
- `judge:selectQuestion`: في `question_setup` فقط، يرفض سؤالًا مصنّفه لا يطابق `selectedCategory` إلا لو `nextCategoryOverride` مضبوطًا؛ يضبط `currentQuestion`، يضيف `question.id` إلى `usedQuestionIds`، ويصفّر `nextCategoryOverride` بعد الاستخدام ويبث `question_selected`.
- `judge:startQuestion`: في وضع الجرس/رويال رامبل يتطلب `currentQuestion != null`؛ في أتوبيس/أكتر كلمات يتطلب `busLetter != null` (لا سؤال). لو `roundKind === "buzzer"` → `question_active` مع `buzzer = { isOpen: true, openedAt: ctx.at, deadline: ctx.at + settings.buzzerSeconds*1000, presses: [] }`؛ وإلا → `simultaneous_active` مع `submissionsClosedAt = ctx.at + busSeconds*1000` (أو 90s في السباق). لا تقفل تلقائيًا داخل الآلة.
- `getBuzzerDeadline(state)` helper.

- [ ] **Step 4: شغّل الاختبارات**

Run: `pnpm --filter @casino/game-core test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/game-core
git commit -m "feat(game-core): round start, question selection and buzzer setup"
```

---

### Task 5: game-core — الجرس وترتيب الضغطات والتوقيت

**Files:**
- Create: `packages/game-core/src/buzzer.ts`
- Modify: `packages/game-core/src/machine.ts`, `packages/game-core/src/timers.ts`
- Test: `packages/game-core/test/buzzer.test.ts`, `packages/game-core/test/fixtures.ts`

**Interfaces:**
- Consumes: `applyCommand`, `RoomState.buzzer`.
- Produces:
  - `orderedPresses(state: RoomState): { playerId: string; at: number; seq: number }[]` (ترتيب `at` ثم `seq`)
  - `buzzRank(state: RoomState, playerId: string): number | null`
  - `hasBuzzed(state: RoomState, playerId: string): boolean`
  - `computeBuzzerDeadline(openedAt: number, seconds: number): number`

- [ ] **Step 1: اكتب الاختبارات الفاشلة**

```ts
// packages/game-core/test/fixtures.ts
import type { Question } from "@casino/shared";
export const makeQuestion = (over: Partial<Question> = {}): Question => ({
  id: "q1", categorySlug: "general", text: "ما هي عاصمة مصر؟", answer: "القاهرة",
  acceptedAnswers: ["القاهره"], type: "capital", difficulty: "easy", ...over,
});

// packages/game-core/test/buzzer.test.ts
import { describe, expect, it } from "vitest";
import { applyCommand, createInitialState } from "../src";
import { orderedPresses } from "../src/buzzer";
import { startBuzzerRound } from "./helpers";

const at = (state: any, ms: number, seq: number, command: any, actorId = "judge", role: "judge" | "player" = "judge") =>
  applyCommand(state, { id: `c${seq}`, actorId, role, expectedState: state.state, command }, { at: ms, seq });

describe("الجرس", () => {
  it("يرتب ضغطتين في نفس المللي ثانية بـ seq", () => {
    let s = startBuzzerRound();
    let r: any = at(s, 10_000, 10, { type: "player:buzz" }, "p2", "player"); s = r.state;
    r = at(s, 10_000, 11, { type: "player:buzz" }, "p1", "player"); s = r.state;
    expect(orderedPresses(s).map((p) => p.playerId)).toEqual(["p2", "p1"]);
  });

  it("يرفض الضغط بعد انتهاء المهلة", () => {
    const s = startBuzzerRound(5_000, 10); // فتح 1000، مهلة 11000
    const r = at(s, 11_001, 10, { type: "player:buzz" }, "p1", "player");
    expect(r.ok ? null : r.code).toBe("wrong_phase");
  });

  it("يرفض ضغط نفس اللاعب مرتين", () => {
    let s = startBuzzerRound();
    let r: any = at(s, 2_000, 10, { type: "player:buzz" }, "p1", "player"); s = r.state;
    r = at(s, 2_100, 11, { type: "player:buzz" }, "p1", "player");
    expect(r.ok ? null : r.code).toBe("already_used");
  });

  it("يقفل الجرس ويختار المجيب", () => {
    let s = startBuzzerRound();
    let r: any = at(s, 2_000, 10, { type: "judge:closeBuzzer" }); s = r.state;
    expect(s.state).toBe("buzzer_locked");
    r = at(s, 2_100, 11, { type: "judge:selectAnswerer", playerId: "p1" }); s = r.state;
    expect(s.state).toBe("answering");
    expect(s.answererId).toBe("p1");
  });

  it("إعادة الفتح تستبعد من ضغط بالفعل", () => {
    let s = startBuzzerRound();
    let r: any = at(s, 2_000, 10, { type: "player:buzz" }, "p1", "player"); s = r.state;
    r = at(s, 2_100, 11, { type: "judge:openBuzzer" }); s = r.state;
    r = at(s, 2_200, 12, { type: "player:buzz" }, "p1", "player");
    expect(r.ok ? null : r.code).toBe("already_used");
  });
});
```

`helpers.ts` يبني غرفة ٣ لاعبين ويوصلها إلى `question_active` عبر الأوامر الحقيقية (lobby → powerup → startGame → round_intro → question_setup → selectQuestion → startQuestion). أضف أيضًا `startAnswering()` التي تكمل: p1 يضغط، الحكم يقفل الجرس ويختار p1، فتصبح الحالة `answering` والمجيب p1.

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `pnpm --filter @casino/game-core test buzzer` — Expected: FAIL.

- [ ] **Step 3: نفّذ منطق الجرس**

- `player:buzz`: مسموح في `question_active` فقط، والجرس مفتوح، ولم ينتهِ `deadline`، واللاعب غير مقصي ومتصل ولم يضغط قبلًا. يسجّل `{ playerId, at: ctx.at, seq: ctx.seq }` ويبث `buzzer_pressed`.
- `judge:closeBuzzer`: `question_active → buzzer_locked`، يضبط `isOpen=false`، ويبث `buzzer_closed`.
- `judge:openBuzzer`: `buzzer_locked → question_active`، يضبط مهلة جديدة `ctx.at + buzzerSeconds*1000`، ويحتفظ بالضغطات السابقة (لا يُصفّرها) حتى يستبعدهم الشرط أعلاه.
- `judge:selectAnswerer`: `buzzer_locked → answering`، ويقبل فقط لاعبًا موجودًا وغير مقصي، ويضبط `answererId`.
- `orderedPresses` يعيد نسخة مرتبة بـ `(a.at - b.at) || (a.seq - b.seq)`.

- [ ] **Step 4: شغّل الاختبارات**

Run: `pnpm --filter @casino/game-core test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/game-core
git commit -m "feat(game-core): server-time buzzer ordering, deadline and reopen rules"
```

---

### Task 6: game-core — التصحيح والنقاط والكروت

**Files:**
- Create: `packages/game-core/src/judging.ts`, `packages/game-core/src/scoring.ts`
- Modify: `packages/game-core/src/machine.ts`
- Test: `packages/game-core/test/judging.test.ts`

**Interfaces:**
- Consumes: `orderedPresses`, `GameSettings`, `RoomState`.
- Produces:
  - `applyScoreChange(player: PlayerState, delta: number, settings: GameSettings): number` (يرجع النتيجة بعد التطبيق؛ يمنع السالب لو `allowNegative=false`)
  - `judgeAnswer(state, verdict: "correct" | "wrong", at: number): CommandResult`
  - `playCard(state, playerId, card: "yellow" | "red", at: number): CommandResult`

- [ ] **Step 1: اكتب الاختبارات**

```ts
// packages/game-core/test/judging.test.ts
import { describe, expect, it } from "vitest";
import { applyScoreChange, playCard } from "../src/scoring";
import { applyCommand, createInitialState } from "../src";
import { startAnswering } from "./helpers";

describe("النقاط والكروت", () => {
  it("الإجابة الصحيحة +1", () => {
    let s = startAnswering();
    const r: any = applyCommand(s, { id: "c1", actorId: "judge", role: "judge", expectedState: "answering", command: { type: "judge:markCorrect" } }, { at: 9_000, seq: 1 });
    expect(r.state.players.find((p: any) => p.id === "p1").score).toBe(1);
    expect(r.state.state).toBe("result");
  });

  it("الكارت الأصفر -1 والأحمر -3 مع السماح بالسالب", () => {
    const s = createInitialState({ roomCode: "A", players: [{ id: "p1", name: "أ" }] });
    expect(applyScoreChange(s.players[0], -1, s.settings)).toBe(-1);
    expect(applyScoreChange(s.players[0], -3, s.settings)).toBe(-3);
    const clamped = { ...s.settings, allowNegative: false };
    expect(applyScoreChange(s.players[0], -3, clamped)).toBe(0);
  });

  it("لا يطبّق الكارت خارج card_action", () => {
    const s = startAnswering();
    const r: any = playCard(s, "p2", "yellow", 9_000);
    expect(r.ok ? null : r.code).toBe("wrong_state");
  });
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `pnpm --filter @casino/game-core test judging` — Expected: FAIL.

- [ ] **Step 3: نفّذ التصحيح والكروت**

- `judge:markCorrect`: `answering → result` (أو `card_action` لو «سلم وتعبان» نشط)، يضيف `pointsPerCorrect` للمجيب، ويبث `answer_judged` مع `delta`.
- `judge:markWrong`: `answering → card_action`، بدون نقاط، ويبث `answer_judged` بـ`delta: 0`.
- `judge:playCard`: مسموح في `card_action`، يطبّق `yellowPenalty`/`redPenalty`، ويسجّل الكارت في `round.cards` و`usedCards` للعرض فقط (بدون منع تكرار)، ويبث `card_played` ثم ينتقل إلى `result`.
- `judge:adjustScore`: مسموح في `result`/`next_question`، `reason` إلزامي غير فارغ، ويُسجّل `score_adjusted`.
- `judge:endQuestion`: `card_action → result` بدون خصم.
- `judge:openBuzzer` من `card_action` يعيد `question_active` ويستبعد كل من ضغط سابقًا.

- [ ] **Step 4: شغّل الاختبارات**

Run: `pnpm --filter @casino/game-core test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/game-core
git commit -m "feat(game-core): judging, score clamping and yellow/red card penalties"
```

---

### Task 7: game-core — دورة السؤال، النهاية، والتعادل

**Files:**
- Create: `packages/game-core/src/tiebreak.ts`
- Modify: `packages/game-core/src/machine.ts`
- Test: `packages/game-core/test/tiebreak.test.ts`

**Interfaces:**
- Consumes: `applyCommand`, `RoomState.round`.
- Produces:
  - `computeWinner(state: RoomState): { winnerId: string | null; tied: string[] }`
  - `nextRound(state, at): CommandResult`
  - `startTieBreaker(state, at): CommandResult`

- [ ] **Step 1: اكتب الاختبارات**

```ts
// packages/game-core/test/tiebreak.test.ts
import { describe, expect, it } from "vitest";
import { applyCommand, createInitialState } from "../src";
import { computeWinner } from "../src/tiebreak";

const judge = (state: any, command: any) =>
  applyCommand(state, { id: crypto.randomUUID(), actorId: "judge", role: "judge", expectedState: state.state, command }, { at: 1, seq: state.seq + 1 });

describe("نهاية اللعبة والتعادل", () => {
  it("يكتشف التعادل بين الأعلى نقاطًا", () => {
    const s = createInitialState({ roomCode: "A", players: [{ id: "p1", name: "أ" }, { id: "p2", name: "ب" }] });
    s.players[0].score = 5; s.players[1].score = 5;
    expect(computeWinner(s)).toEqual({ winnerId: null, tied: ["p1", "p2"] });
  });

  it("ينهي اللعبة بفايز واحد", () => {
    let s = createInitialState({ roomCode: "A", players: [{ id: "p1", name: "أ" }, { id: "p2", name: "ب" }] });
    s.players[0].score = 5; s.players[1].score = 2; s.state = "result";
    const r: any = judge(s, { type: "judge:endGame" });
    expect(r.state.state).toBe("finished");
    expect(r.state.round.winnerId).toBe("p1");
  });

  it("يفتح سؤالًا فاصلًا ويحسمه", () => {
    let s = createInitialState({ roomCode: "A", players: [{ id: "p1", name: "أ" }, { id: "p2", name: "ب" }] });
    s.state = "finished"; s.round.winnerId = null;
    let r: any = judge(s, { type: "judge:startTieBreaker" }); s = r.state;
    expect(s.state).toBe("tie_breaker");
    expect(s.round.tieBreaker).toBe(true);
  });

  it("يزيد رقم الجولة مع كل nextQuestion", () => {
    let s = createInitialState({ roomCode: "A", players: [{ id: "p1", name: "أ" }] });
    s.state = "result";
    const r: any = judge(s, { type: "judge:nextQuestion" });
    expect(r.state.state).toBe("next_question");
    expect(r.state.round.index).toBe(1);
  });
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `pnpm --filter @casino/game-core test tiebreak` — Expected: FAIL.

- [ ] **Step 3: نفّذ الانتقالات**

- `judge:endGame`: من `result`/`next_question`/`reveal` → `finished`، يحسب الفايز؛ لو تعادل `winnerId=null` ويبث `game_finished` مع `tied`.
- `judge:startTieBreaker`: من `finished` فقط وبوجود تعادل → `tie_breaker` مع `round.tieBreaker=true`، ويصفّر `currentQuestion` و`buzzer`.
- `judge:declareTie`: من `tie_breaker` → `finished` مع `winnerId=null`.
- `judge:rematch`: من `finished` → `lobby`، ويصفّر النقاط والإقصاء والكروت وقائمة الأسئلة المستخدمة و`round`، ويحتفظ بنفس اللاعبين والجلسات.
- في `tie_breaker`، `judge:selectQuestion`/`startQuestion` تعمل بنفس منطق الجولة العادية؛ أول إجابة صحيحة تمنح النقاط وتُنهي اللعبة (`finished` مع `winnerId`).
- `judge:nextQuestion`: من `reveal` → `result` (ملخص الجولة)؛ ومن `result` → `next_question` مع `round.index += 1`، ويصفّر `answererId`/`buzzer`/`submissions`/`round.cards`، ويعيد الكروت المحروقة للجولة التالية (يحتفظ بقائمة `usedCards` على مستوى اللعبة).
- `judge:beginRound` من `next_question` → `question_setup` (نفس `roundKind` الحالي)، و`judge:selectRoundKind` من `next_question` → `round_intro` مع النوع الجديد.

- [ ] **Step 4: شغّل الاختبارات**

Run: `pnpm --filter @casino/game-core test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/game-core
git commit -m "feat(game-core): question lifecycle, game finish and tie breaker"
```

---

### Task 8: game-core — الـ ٣ Power-Ups

**Files:**
- Create: `packages/game-core/src/powerups.ts`
- Modify: `packages/game-core/src/machine.ts`, `packages/shared/src/types.ts`
- Test: `packages/game-core/test/powerups.test.ts`

**Interfaces:**
- Consumes: `PowerupKey`, `GameSettings.salem`, `RoomState.pendingPowerup`, `RoomState.powerup`.
- Produces:
  - `requestPowerup(state, ownerId, key, payload: { targetId?: string; categorySlug?: string }, at): CommandResult`
  - `resolvePowerup(state, approve: boolean, at): CommandResult`
  - `chooseSalemTarget(state, ownerId, targetId, at): CommandResult`
  - `powerupReturnState(pending): State`

- [ ] **Step 1: اكتب الاختبارات**

```ts
// packages/game-core/test/powerups.test.ts
import { describe, expect, it } from "vitest";
import { applyCommand } from "../src";
import { readyRoomWithPowerups } from "./helpers";
import { makeQuestion } from "./fixtures";

const player = (state: any, command: any, actorId: string) =>
  applyCommand(state, { id: crypto.randomUUID(), actorId, role: "player", expectedState: state.state, command }, { at: 1, seq: state.seq + 1 });
const judge = (state: any, command: any) =>
  applyCommand(state, { id: crypto.randomUUID(), actorId: "judge", role: "judge", expectedState: state.state, command }, { at: 1, seq: state.seq + 1 });

describe("Power-ups", () => {
  it("شنك الحرمية يخصم ٣ بعد موافقة الحكم ويستهلك الكارت", () => {
    let s = readyRoomWithPowerups();
    let r: any = player(s, { type: "player:activatePowerup", targetId: "p3" }, "p1"); s = r.state;
    expect(s.pendingPowerup?.key).toBe("shank");
    r = judge(s, { type: "judge:resolvePowerup", approve: true }); s = r.state;
    expect(s.players.find((p: any) => p.id === "p3").score).toBe(-3);
    expect(s.players.find((p: any) => p.id === "p1").powerupState).toBe("used");
  });

  it("رفض الحكم لا يخصم لكن يستهلك الكارت", () => {
    let s = readyRoomWithPowerups();
    let r: any = player(s, { type: "player:activatePowerup", targetId: "p3" }, "p1"); s = r.state;
    r = judge(s, { type: "judge:resolvePowerup", approve: false }); s = r.state;
    expect(s.players.find((p: any) => p.id === "p3").score).toBe(0);
    expect(s.players.find((p: any) => p.id === "p1").powerupState).toBe("used");
  });

  it("كوبري يفرض التصنيف مرة واحدة", () => {
    let s = readyRoomWithPowerups();
    let r: any = player(s, { type: "player:activatePowerup", categorySlug: "history" }, "p2"); s = r.state;
    r = judge(s, { type: "judge:resolvePowerup", approve: true }); s = r.state;
    expect(s.nextCategoryOverride).toBe("history");
  });

  it("سلم وتعبان: غلط ← -1 للمالك", () => {
    let s = readyRoomWithPowerups();
    let r: any = player(s, { type: "player:activatePowerup", targetId: "p1" }, "p3"); s = r.state;
    r = judge(s, { type: "judge:resolvePowerup", approve: true }); s = r.state;
    expect(s.salem).toEqual({ ownerId: "p3", targetId: "p1", state: "active" });
    r = judge(s, { type: "judge:selectRoundKind", kind: "buzzer" }); s = r.state;
    r = judge(s, { type: "judge:beginRound" }); s = r.state;
    r = judge(s, { type: "judge:selectQuestion", question: makeQuestion() }); s = r.state;
    r = judge(s, { type: "judge:startQuestion" }); s = r.state;
    expect(s.state).toBe("answering");
    expect(s.answererId).toBe("p3");
    r = judge(s, { type: "judge:markWrong" }); s = r.state;
    expect(s.players.find((p: any) => p.id === "p3").score).toBe(-1);
  });

  it("سلم وتعبان: صح ← يختار هدفًا ويخصم 3", () => {
    let s = readyRoomWithPowerups();
    let r: any = player(s, { type: "player:activatePowerup", targetId: "p1" }, "p3"); s = r.state;
    r = judge(s, { type: "judge:resolvePowerup", approve: true }); s = r.state;
    r = judge(s, { type: "judge:selectRoundKind", kind: "buzzer" }); s = r.state;
    r = judge(s, { type: "judge:beginRound" }); s = r.state;
    r = judge(s, { type: "judge:selectQuestion", question: makeQuestion() }); s = r.state;
    r = judge(s, { type: "judge:startQuestion" }); s = r.state;
    r = judge(s, { type: "judge:markCorrect" }); s = r.state;
    expect(s.state).toBe("card_action");
    r = player(s, { type: "player:chooseSalemTarget", targetId: "p1" }, "p3"); s = r.state;
    expect(s.players.find((p: any) => p.id === "p1").score).toBe(-3);
    expect(s.state).toBe("result");
  });
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `pnpm --filter @casino/game-core test powerups` — Expected: FAIL.

- [ ] **Step 3: نفّذ الميكانيكا**

`RoomState` جاهز بالحقول المطلوبة من Task 1 (`pendingPowerup.returnState` و`salem`)؛ لا تعِد تعريفها هنا.

- أضف إلى `test/helpers.ts` الدالة `readyRoomWithPowerups()` التي تبني غرفة بثلاثة لاعبين، تجعل p1 يحجز `shank` وp2 يحجز `cobri` وp3 يحجز `salem`، وتصل بالحالة إلى `ready` عبر الأوامر الحقيقية.

- `player:activatePowerup`: مسموح بين الأسئلة (`ready`/`result`/`question_setup`/`next_question`) فقط، صاحب الكارت `reserved` فقط، ولا يوجد `pendingPowerup` آخر. يضبط `powerupState="used"` فورًا (الاستهلاك عند التفعيل) وينشئ `pendingPowerup` مع `returnState=state.state`.
- «شنك الحرمية» يتطلب `targetId` موجودًا وغير صاحب الكارت؛ «كوبري» يتطلب `categorySlug` من `CATEGORY_SLUGS`؛ «سلم وتعبان» يتطلب `targetId` مختلفًا عن المالك.
- `judge:resolvePowerup`:
  - موافقة + شنك → `applyScoreChange(target, shankPenalty)`.
  - موافقة + كوبري → `nextCategoryOverride = categorySlug`.
  - موافقة + سلم → `salem = { ownerId, targetId, state: "active" }`.
  - رفض → لا أثر.
  - في كل الحالات يعود إلى `pendingPowerup.returnState` ويصفّر `pendingPowerup`.
- عند `judge:startQuestion` لو `salem?.state==="active"`: بدل الجرس، الحالة `answering` و`answererId = settings.salem.answerer === "owner" ? salem.ownerId : salem.targetId`، ويُستهلك `salem=null` بعد التطبيق.
- `player:chooseSalemTarget`: مسموح في `card_action` فقط لصاحب الكارت، يخصم `targetPenalty` من الهدف ويحوّل الحالة إلى `result`.
- في «سلم وتعبان»: `judge:markWrong` يخصم `ownerPenaltyOnWrong` من صاحب الكارت ويحوّل إلى `result`؛ `judge:markCorrect` يذهب إلى `card_action` بانتظار `chooseSalemTarget`.
- بث `powerup_rejected` عند فشل أي شرط، وبث `powerup_resolved` عند النجاح.

- [ ] **Step 4: شغّل الاختبارات**

Run: `pnpm --filter @casino/game-core test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/game-core packages/shared
git commit -m "feat(game-core): shank, cobri and salem powerups with judge confirmation"
```

---

### Task 9: game-core — جولة أتوبيس

**Files:**
- Create: `packages/game-core/src/bus.ts`
- Modify: `packages/game-core/src/machine.ts`
- Test: `packages/game-core/test/bus.test.ts`

**Interfaces:**
- Consumes: `SubmissionPayload` (`kind:"bus"`), `GameSettings.busCategories`, `GameSettings.busSeconds`.
- Produces:
  - `setBusLetter(state, letter: string, at: number): CommandResult`
  - `submitBusAnswers(state, playerId: string, answers: Record<string,string>, at: number): CommandResult`
  - `callBus(state, playerId: string, at: number): CommandResult`
  - `closeSubmissions(state, at: number): CommandResult`
  - `judgeBusCell(state, playerId: string, category: string, accepted: boolean, at: number): CommandResult`
  - `approveAllBusCells(state, at: number): CommandResult`

- [ ] **Step 1: اكتب الاختبارات**

```ts
// packages/game-core/test/bus.test.ts
import { describe, expect, it } from "vitest";
import { applyCommand } from "../src";
import { startBusRound } from "./helpers";

const send = (state: any, command: any, actorId = "judge", role: "judge" | "player" = "judge") =>
  applyCommand(state, { id: crypto.randomUUID(), actorId, role, expectedState: state.state, command }, { at: 20_000, seq: state.seq + 1 });

describe("أتوبيس", () => {
  it("أول «أتوبيس» يقفل الإرسال والثاني يُرفض", () => {
    let s = startBusRound();
    let r: any = send(s, { type: "player:callBus" }, "p2", "player"); s = r.state;
    expect(s.state).toBe("submissions_closed");
    r = send(s, { type: "player:callBus" }, "p3", "player");
    expect(r.ok ? null : r.code).toBe("wrong_phase");
  });

  it("يقبل إجابة واحدة فقط لكل لاعب", () => {
    let s = startBusRound();
    const payload = { kind: "bus", answers: { "اسم": "أحمد", "بلد": "أسوان" } };
    let r: any = send(s, { type: "player:submitRound", payload }, "p1", "player"); s = r.state;
    r = send(s, { type: "player:submitRound", payload }, "p1", "player");
    expect(r.ok ? null : r.code).toBe("already_used");
  });

  it("يرفض فئة غير موجودة أو إجابة فارغة", () => {
    const s = startBusRound();
    const bad = { kind: "bus", answers: { "كوكب": "المريخ" } };
    const r = send(s, { type: "player:submitRound", payload: bad }, "p1", "player");
    expect(r.ok ? null : r.code).toBe("invalid_payload");
  });

  it("كل خلية مقبولة +1، والتبديل لا يضاعف", () => {
    let s = startBusRound();
    const payload = { kind: "bus", answers: { "اسم": "أحمد", "بلد": "أسوان" } };
    let r: any = send(s, { type: "player:submitRound", payload }, "p1", "player"); s = r.state;
    r = send(s, { type: "judge:closeSubmissions" }); s = r.state;
    r = send(s, { type: "judge:openReveal" }); s = r.state;
    r = send(s, { type: "judge:judgeBusCell", playerId: "p1", category: "اسم", accepted: true }); s = r.state;
    r = send(s, { type: "judge:judgeBusCell", playerId: "p1", category: "اسم", accepted: true }); s = r.state;
    expect(s.players.find((p: any) => p.id === "p1").score).toBe(1);
    r = send(s, { type: "judge:judgeBusCell", playerId: "p1", category: "اسم", accepted: false }); s = r.state;
    expect(s.players.find((p: any) => p.id === "p1").score).toBe(0);
  });
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `pnpm --filter @casino/game-core test bus` — Expected: FAIL.

- [ ] **Step 3: نفّذ المنطق**

- أضف إلى `test/helpers.ts`: `startBusRound()` تبني غرفة بثلاثة لاعبين وتصل إلى `simultaneous_active` بنوع `bus` وحرف «س»، و`startLetterRace(letter)` نفس الشيء بنوع `letter_race`.
- `judge:setBusLetter`: في `question_setup` و`roundKind` هو `bus`/`letter_race`؛ يقبل حرفًا عربيًا واحدًا بعد trim، وإلا `invalid_payload`.
- `judge:startQuestion` لو النوع `bus`: يتطلب `busLetter`، والحالة `simultaneous_active`، و`submissionsClosedAt = at + busSeconds*1000`.
- `player:submitRound` (bus): مسموح في `simultaneous_active`، لاعب متصل وغير مقصي، بلا إرسال سابق، والفئات كلها ضمن `settings.busCategories`، والقيم غير فارغة وبحد أقصى ٦٠ حرفًا؛ يخزّن `{ playerId, payload }`.
- `player:callBus`: مسموح في `simultaneous_active` و`roundKind==="bus"` فقط → `submissions_closed` مع `submissionsClosedAt=at`، وبث `submissions_closed` مع من أرسل.
- `judge:closeSubmissions`: نفس الانتقال في أي وضع جماعي.
- `judge:openReveal`: `submissions_closed → reveal`، ويبث `submission_judged` مجمّعة.
- `judge:judgeBusCell`: في `reveal` فقط؛ يقلب حالة الخلية، ويضيف/يطرح `pointsPerCorrect` مرة واحدة حسب الحالة السابقة، ويحفظ `accepted` في `submission.acceptedCells` (أضف `acceptedCells: Record<string,boolean>` إلى `submission`).
- `judge:approveAllSubmissions`: يعتمد كل الخلايا غير الفارغة في كل الإرسالات، ويطبّق الفرق مرة واحدة.
- `judge:nextQuestion` من `reveal` → `result` مع ملخص الجولة.

- [ ] **Step 4: شغّل الاختبارات**

Run: `pnpm --filter @casino/game-core test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/game-core
git commit -m "feat(game-core): bus round with exclusive letter, submissions and per-cell judging"
```

---

### Task 10: game-core — جولة «أكتر كلمات بنفس الحرف»

**Files:**
- Create: `packages/game-core/src/letterRace.ts`
- Modify: `packages/game-core/src/bus.ts` (إعادة استخدام الإرسال والإغلاق), `packages/game-core/src/machine.ts`
- Test: `packages/game-core/test/letterRace.test.ts`

**Interfaces:**
- Consumes: `SubmissionPayload` (`kind:"letter_race"`), `normalizeAnswer`.
- Produces:
  - `submitWords(state, playerId: string, words: string[], at: number): CommandResult`
  - `judgeWord(state, playerId: string, wordIndex: number, accepted: boolean, at: number): CommandResult`
  - `computeLetterRaceWinner(state): string | null` (أعلى عدد كلمات مقبولة؛ التعادل ← الأعلى نقاطًا؛ ثم `null`)

- [ ] **Step 1: اكتب الاختبارات**

```ts
// packages/game-core/test/letterRace.test.ts
import { describe, expect, it } from "vitest";
import { computeLetterRaceWinner } from "../src/letterRace";
import { applyCommand } from "../src";
import { startLetterRace } from "./helpers";

const send = (state: any, command: any, actorId = "judge", role: "judge" | "player" = "judge") =>
  applyCommand(state, { id: crypto.randomUUID(), actorId, role, expectedState: state.state, command }, { at: 20_000, seq: state.seq + 1 });

describe("أكتر كلمات", () => {
  it("ينظّف التكرار داخل قائمة اللاعب فقط", () => {
    let s = startLetterRace("س");
    const r: any = send(s, { type: "player:submitRound", payload: { kind: "letter_race", words: ["سمك", "سمك", " سلم ", ""] } }, "p1", "player");
    expect(r.state.submissions[0].payload.words).toEqual(["سمك", "سلم"]);
  });

  it("لا يقبل إرسالًا ثانيًا ولا كلمة بعد الإغلاق", () => {
    let s = startLetterRace("س");
    let r: any = send(s, { type: "player:submitRound", payload: { kind: "letter_race", words: ["سمك"] } }, "p1", "player"); s = r.state;
    r = send(s, { type: "player:submitRound", payload: { kind: "letter_race", words: ["سلم"] } }, "p1", "player");
    expect(r.ok ? null : r.code).toBe("already_used");
  });

  it("+1 لكل كلمة مقبولة بحد أقصى 5", () => {
    let s = startLetterRace("س");
    let r: any = send(s, { type: "player:submitRound", payload: { kind: "letter_race", words: ["س1","س2","س3","س4","س5","س6","س7"] } }, "p1", "player"); s = r.state;
    r = send(s, { type: "judge:closeSubmissions" }); s = r.state;
    r = send(s, { type: "judge:openReveal" }); s = r.state;
    for (let i = 0; i < 7; i++) r = send(s, { type: "judge:judgeWord", playerId: "p1", wordIndex: i, accepted: true }), s = r.state;
    expect(s.players.find((p: any) => p.id === "p1").score).toBe(5);
  });

  it("الفايز صاحب أعلى عدد كلمات مقبولة", () => {
    let s = startLetterRace("س");
    let r: any = send(s, { type: "player:submitRound", payload: { kind: "letter_race", words: ["سمك","سلم"] } }, "p1", "player"); s = r.state;
    r = send(s, { type: "player:submitRound", payload: { kind: "letter_race", words: ["سحاب"] } }, "p2", "player"); s = r.state;
    s.submissions[0].acceptedWords = [true, true];
    s.submissions[1].acceptedWords = [true];
    expect(computeLetterRaceWinner(s)).toBe("p1");
  });
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `pnpm --filter @casino/game-core test letterRace` — Expected: FAIL.

- [ ] **Step 3: نفّذ المنطق**

- `player:submitRound` (letter_race): مسموح في `simultaneous_active`؛ `words` مصفوفة ١–٥٠ نصًا، تُنظَّف بـ`trim`، وتُحذف الفارغة، ويُزال التكرار بـ`normalizeAnswer` مع الاحتفاظ بأول شكل مكتوب، وبحد أقصى ٣٠ حرفًا للكلمة.
- `judge:judgeWord`: في `reveal` فقط؛ يقلب `acceptedWords[index]`، يعيد حساب `min(عدد المقبول, letterRaceMaxPoints)`، ويطبّق الفرق على النقاط (لا يضاعف عند التكرار).
- `computeLetterRaceWinner`: يجمع `acceptedWords.filter(Boolean).length` لكل لاعب، ويختار الأعلى؛ التعادل ← الأعلى `score`؛ التعادل التام ← `null`.
- **قرار:** التكرار بين لاعبين مختلفين مسموح ولا يخصم نقاطًا؛ الشرط هو عدم تكرار الكلمة داخل قائمة اللاعب نفسه. لا توجد نقاط إضافية للفايز غير نقاط كلماته.
- `judge:nextQuestion` من `reveal` → `result` ويضبط `round.winnerId = computeLetterRaceWinner(state)` لو لم يكن مضبوطًا.

- [ ] **Step 4: شغّل الاختبارات**

Run: `pnpm --filter @casino/game-core test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/game-core
git commit -m "feat(game-core): letter race with dedupe, per-word judging and score cap"
```

---

### Task 11: game-core — رويال رامبل

**Files:**
- Create: `packages/game-core/src/rumble.ts`
- Modify: `packages/game-core/src/machine.ts`, `packages/shared/src/types.ts`
- Test: `packages/game-core/test/rumble.test.ts`

**Interfaces:**
- Consumes: `groupDuplicates`, `answersMatch`, `SubmissionPayload` (`kind:"rumble"`).
- Produces:
  - `submitRumbleAnswer(state, playerId: string, answer: string, at: number): CommandResult`
  - `setRumbleVerdict(state, playerId: string, verdict: "correct" | "wrong", at: number): CommandResult`
  - `confirmRumbleResult(state, at: number): CommandResult`
  - `RUMBLE_SECONDS = 30`

- [ ] **Step 1: اكتب الاختبارات**

```ts
// packages/game-core/test/rumble.test.ts
import { describe, expect, it } from "vitest";
import { applyCommand } from "../src";
import { startRumble, submitAll } from "./helpers";

const judge = (state: any, command: any) =>
  applyCommand(state, { id: crypto.randomUUID(), actorId: "judge", role: "judge", expectedState: state.state, command }, { at: 30_000, seq: state.seq + 1 });

describe("رويال رامبل", () => {
  it("الإجابة المكررة تقصي أصحابها والفريد الصحيح يبقى ويأخذ +2", () => {
    let s = startRumble({ answer: "الجيزة" });
    s = submitAll(s, { p1: "القاهرة", p2: "قاهره", p3: "الجيزة" });
    let r: any = judge(s, { type: "judge:closeSubmissions" }); s = r.state;
    r = judge(s, { type: "judge:confirmRumbleResult" }); s = r.state;
    expect(s.players.filter((p: any) => p.isEliminated).map((p: any) => p.id).sort()).toEqual(["p1", "p2"]);
    expect(s.players.find((p: any) => p.id === "p3").score).toBe(2);
    expect(s.round.winnerId).toBe("p3");
  });

  it("إقصاء واحد ← الاثنان الباقيان +1 لكل واحد", () => {
    let s = startRumble({ answer: "القاهرة", acceptedAnswers: ["مصر"] });
    s = submitAll(s, { p1: "أسوان", p2: "القاهرة", p3: "مصر" });
    let r: any = judge(s, { type: "judge:closeSubmissions" }); s = r.state;
    r = judge(s, { type: "judge:confirmRumbleResult" }); s = r.state;
    expect(s.players.find((p: any) => p.id === "p1").isEliminated).toBe(true);
    expect(s.players.find((p: any) => p.id === "p2").score).toBe(1);
    expect(s.players.find((p: any) => p.id === "p3").score).toBe(1);
  });

  it("خروج الكل ← إعادة الجولة وكل اللاعبين يرجعون", () => {
    let s = startRumble({ answer: "القاهرة" });
    s = submitAll(s, { p1: "قاهرة", p2: "القاهرة", p3: "أسوان" });
    let r: any = judge(s, { type: "judge:closeSubmissions" }); s = r.state;
    r = judge(s, { type: "judge:confirmRumbleResult" }); s = r.state;
    expect(s.players.every((p: any) => p.isEliminated === false)).toBe(true);
    expect(s.state).toBe("question_setup");
    expect(s.rumble?.replayed).toBe(true);
  });

  it("الإجابة الصحيحة الفريدة تنجّي صاحبها كآخر لاعب باقٍ وتأخذ +2", () => {
    let s = startRumble({ answer: "القاهرة" });
    s = submitAll(s, { p1: "القاهرة", p2: "أسوان", p3: "طنطا" });
    let r: any = judge(s, { type: "judge:closeSubmissions" }); s = r.state;
    r = judge(s, { type: "judge:confirmRumbleResult" }); s = r.state;
    expect(s.players.find((p: any) => p.id === "p1").score).toBe(2); // آخر واحد باقي
  });

  it("الغلط الفريد يقصي صاحبه حتى لو لم يتكرر", () => {
    let s = startRumble({ answer: "القاهرة", acceptedAnswers: ["مصر"] });
    s = submitAll(s, { p1: "أسوان", p2: "القاهرة", p3: "مصر" });
    let r: any = judge(s, { type: "judge:closeSubmissions" }); s = r.state;
    r = judge(s, { type: "judge:setRumbleVerdict", playerId: "p1", verdict: "wrong" }); s = r.state;
    r = judge(s, { type: "judge:confirmRumbleResult" }); s = r.state;
    expect(s.players.find((p: any) => p.id === "p1").isEliminated).toBe(true);
  });
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `pnpm --filter @casino/game-core test rumble` — Expected: FAIL.

- [ ] **Step 3: نفّذ المنطق**

- `RoomState.rumble` و`round.cards` و`usedQuestionIds` موجودة من Task 1؛ لا تعِد تعريفها.
- أضف إلى `test/helpers.ts`: `startRumble(overrides)` تبني غرفة بثلاثة لاعبين وتصل إلى `simultaneous_active` بنوع `rumble`، و`submitAll(state, answers)` ترسل إجابة كل لاعب عبر `applyCommand` بدور `player`.
- `judge:startQuestion` لو `roundKind==="rumble"` → `simultaneous_active`، `deadline = at + 30_000`، ويحفظ `eliminatedBefore` من اللاعبين المقصيين الحاليين.
- `player:submitRound` (rumble): مسموح في `simultaneous_active`، لاعب غير مقصي، إجابة واحدة غير فارغة ≤ ٦٠ حرفًا، وإرسال واحد فقط.
- `judge:closeSubmissions`: `simultaneous_active → submissions_closed`.
- `judge:confirmRumbleResult` (في `submissions_closed`):
  1. أي لاعب نشط لم يرسل = خارج.
  2. `groupDuplicates` بين المرسلين؛ أي مجموعة حجمها ≥ ٢ → كل أصحابها خارج.
  3. الباقي: `answersMatch(answer, currentQuestion.answer, currentQuestion.acceptedAnswers)`؛ الصح فريد ويبقى بدون نقاط؛ الغلط خارج.
  4. `judge:setRumbleVerdict` يسبق التأكيد ويستبدل حكم لاعب واحد (للحالات الغامضة).
  5. احسب الباقين بعد الإقصاء:
     - `0` → أعد `isEliminated` من `eliminatedBefore`، صفّر الإرسالات والتحكيم، `state="question_setup"`، `currentQuestion=null`، `rumble.replayed=true`، وبث `round_replayed`.
     - `1` → `+2` للباقي، `round.winnerId=الباقي`.
     - `≥2` → `+1` لكل باقٍ (فقط لو حدث إقصاء واحد على الأقل في هذا السؤال).
  6. `state="reveal"`، `rumble.confirmed=true`، وبث `rumble_resolved` مع التفاصيل.
- `judge:nextQuestion` من `reveal` → `result`، ثم `next_question` بالضغط التالي.

- [ ] **Step 4: شغّل الاختبارات**

Run: `pnpm --filter @casino/game-core test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/game-core packages/shared
git commit -m "feat(game-core): royal rumble duplicate/wrong elimination and replay rules"
```

---

### Task 12: السيرفر — الغرف، الأكواد، التوكنات، والمخزن في الذاكرة

**Files:**
- Create: `packages/server/package.json`, `packages/server/tsconfig.json`
- Create: `packages/server/src/ids.ts`, `packages/server/src/tokens.ts`
- Create: `packages/server/src/rooms/{roomStore,memoryStore,roomService}.ts`
- Test: `packages/server/test/rooms.test.ts`, `packages/server/test/tokens.test.ts`

**Interfaces:**
- Produces:
  - `generateRoomCode(random = crypto.randomInt): string` — ٦ أحرف من `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`.
  - `createToken(): string` / `hashToken(token: string): string` / `verifyToken(token: string, hash: string): boolean` / `createRecoveryCode(): string`.
  - `type RoomRecord = { code: string; judgeTokenHash: string; judgeRecoveryHash: string; state: RoomState; tokens?: Record<string, string>; createdAt: number }` — `tokens` = `playerId → token hash`.
  - `interface RoomStore { create(r: RoomRecord): Promise<void>; get(code: string): Promise<RoomRecord | null>; save(code: string, state: RoomState): Promise<void>; appendEvents(code: string, events: GameEvent[]): Promise<void>; upsertSubmissions(code: string, submissions: { playerId: string; payload: SubmissionPayload; judged?: boolean; isCorrect?: boolean; points?: number }[]): Promise<void> }`
  - `class MemoryRoomStore implements RoomStore`
  - `class RoomService { createRoom(settings?): Promise<CreateRoomResult>; joinRoom(code, name, tokenSeed?): Promise<JoinResult>; reissueJudgeToken(code, recoveryCode): Promise<{ judgeToken: string }>; authenticate(code, token): Promise<{ role: "judge" | "player"; playerId?: string }> }`

- [ ] **Step 1: اكتب اختبارات الكود والتوكن**

```ts
// packages/server/test/tokens.test.ts
import { describe, expect, it } from "vitest";
import { generateRoomCode } from "../src/ids";
import { createRecoveryCode, createToken, hashToken, verifyToken } from "../src/tokens";

describe("ids and tokens", () => {
  it("كود الغرفة 6 أحرف بلا 0/O/1/I", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateRoomCode();
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    }
  });
  it("التوكن لا يُخزَّن خامًا", () => {
    const token = createToken();
    const hash = hashToken(token);
    expect(hash).not.toBe(token);
    expect(verifyToken(token, hash)).toBe(true);
    expect(verifyToken(token + "x", hash)).toBe(false);
  });
  it("كود الاسترجاع 8 أحرف", () => {
    expect(createRecoveryCode()).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
  });
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `pnpm --filter @casino/server test tokens` — Expected: FAIL.

- [ ] **Step 3: نفّذ الأكواد والتوكنات والمخزن**

- `generateRoomCode`: يعيد المحاولة ١٠ مرات عند التصادم داخل `RoomService.createRoom`.
- `hashToken`: `createHmac("sha256", process.env.TOKEN_SECRET ?? "dev-secret").update(token).digest("hex")`، والمقارنة بـ`timingSafeEqual`.
- `MemoryRoomStore` يحفظ نسخة عميقة (`structuredClone`) لمنع التسريب بين الطلبات.
- `RoomService.createRoom`: ينشئ `RoomState` عبر `createInitialState`، يخزّن `judgeTokenHash` و`judgeRecoveryHash`، ويعيد `{ code, judgeToken, judgeRecoveryCode }`.
- `joinRoom`: قفل per-room (Promise chain في `Map<string, Promise<unknown>>`)، يتحقق من `lobby` وعدد اللاعبين < ٣ واسم غير مكرر، ثم يطبّق `system:addPlayer` بـ`at=Date.now()` و`seq=state.seq+1`، ويولّد `playerToken` ويحفظ `playerTokenHash` في `state.players[i].id`? **لا** — التوكنات خارج `game-core`؛ خزّنها في `RoomRecord.tokens: Record<playerId,string>` (أضف الحقل).
- `authenticate`: يبحث عن hash مطابق في توكن الحكم أو توكنات اللاعبين، ويعيد الدور.
- `reissueJudgeToken`: يتحقق من كود الاسترجاع، يولّد توكنًا جديدًا ويستبدل الـhash.

- [ ] **Step 4: شغّل الاختبارات**

Run: `pnpm --filter @casino/server test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server
git commit -m "feat(server): room codes, hashed tokens and in-memory room store"
```

---

### Task 13: Prisma — المخطط والمخزن الدائم

**Files:**
- Create: `packages/server/prisma/schema.prisma`, `packages/server/prisma/migrations/`
- Create: `packages/server/src/rooms/prismaStore.ts`
- Create: `docker-compose.test.yml`
- Test: `packages/server/test/storeContract.ts`, `packages/server/test/prismaStore.test.ts`

**Interfaces:**
- Consumes: `RoomStore`, `RoomRecord`.
- Produces: `class PrismaRoomStore implements RoomStore`، و`prisma` singleton في `src/db.ts`.

- [ ] **Step 1: اكتب عقد المخزن المشترك**

```ts
// packages/server/test/storeContract.ts
import { describe, expect, it } from "vitest";
import type { RoomStore } from "../src/rooms/roomStore";
import { createInitialState } from "@casino/game-core";

export function storeContract(name: string, makeStore: () => Promise<{ store: RoomStore; cleanup: () => Promise<void> }>) {
  describe(name, () => {
    it("ينشئ ويقرأ ويحفظ snapshot", async () => {
      const { store, cleanup } = await makeStore();
      const state = createInitialState({ roomCode: "ABC123" });
      await store.create({ code: "ABC123", judgeTokenHash: "h", judgeRecoveryHash: "r", state, createdAt: 1 });
      expect((await store.get("ABC123"))?.state.state).toBe("lobby");
      await store.save("ABC123", { ...state, state: "setup" });
      expect((await store.get("ABC123"))?.state.state).toBe("setup");
      await cleanup();
    });
  });
}
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `pnpm --filter @casino/server test prismaStore` — Expected: FAIL لعدم وجود `PrismaRoomStore`.

- [ ] **Step 3: اكتب المخطط والمخزن**

- `schema.prisma` يطابق قسم ٥ في التصميم حرفيًا: `Room`, `Player`, `Category`, `Question`, `RoomQuestion`, `Submission`, `GameEvent`. أضف `Room.tokens Json @default("{}")` لتخزين hashes اللاعبين خارج `game-core`.
- `datasource db` = `postgresql`، و`generator client` = `prisma-client-js`.
- `PrismaRoomStore`:
  - `create`: `prisma.room.create` مع `state` و`tokens` كـ JSON.
  - `get`: `findUnique` ويحوّل `state` إلى `RoomState` بعد تحقق Zod.
  - `save`: `update` على `state` و`status` المشتق (`lobby|active|paused|finished`) في transaction واحدة.
- أضف `docker-compose.test.yml` فيه Postgres 16 على 5433، وسكربت `test:db` يشغّل `prisma migrate deploy` ثم Vitest.
- `prismaStore.test.ts` يستخدم `DATABASE_URL_TEST` ويفشل بوضوح لو غير مضبوط (لا skip صامت).

- [ ] **Step 4: شغّل الاختبارات**

Run: `pnpm --filter @casino/server test:db` — Expected: PASS على قاعدة اختبار حقيقية.

- [ ] **Step 5: Commit**

```bash
git add packages/server/prisma packages/server/src/rooms/prismaStore.ts packages/server/src/db.ts docker-compose.test.yml
git commit -m "feat(server): prisma schema and durable room store"
```

---

### Task 14: HTTP API — إنشاء، انضمام، استرجاع، واسترداد الحكم

**Files:**
- Create: `packages/server/src/http.ts`, `packages/server/src/index.ts`
- Test: `packages/server/test/http.test.ts`

**Interfaces:**
- Consumes: `RoomService`.
- Produces: `createApp(deps: { rooms: RoomService; questions?: QuestionRepository; adminKey?: string }): express.Express` مع المسارات:
  - `POST /api/rooms` → `201 { roomCode, judgeToken, judgeRecoveryCode }`
  - `POST /api/rooms/:code/join` → `201 { playerToken, playerId }`
  - `POST /api/rooms/:code/reconnect` → `200 { role, playerId? }`
  - `POST /api/rooms/:code/judge/recover` → `200 { judgeToken }`
  - `GET /api/health` → `200 { ok: true }`

- [ ] **Step 1: اكتب اختبارات HTTP**

```ts
// packages/server/test/http.test.ts
import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/http";
import { MemoryRoomStore } from "../src/rooms/memoryStore";
import { RoomService } from "../src/rooms/roomService";

const app = () => createApp({ rooms: new RoomService(new MemoryRoomStore()) });

describe("HTTP API", () => {
  it("ينشئ غرفة ويعيد كود وتوكن واسترجاع", async () => {
    const res = await request(app()).post("/api/rooms").send({});
    expect(res.status).toBe(201);
    expect(res.body.roomCode).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(res.body.judgeToken).toHaveLength(43);
    expect(res.body.judgeRecoveryCode).toHaveLength(8);
  });

  it("يرفض اللاعب الرابع", async () => {
    const a = app();
    const { body } = await request(a).post("/api/rooms").send({});
    for (const name of ["أحمد", "سارة", "محمود"]) {
      expect((await request(a).post(`/api/rooms/${body.roomCode}/join`).send({ name })).status).toBe(201);
    }
    const res = await request(a).post(`/api/rooms/${body.roomCode}/join`).send({ name: "رابع" });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("room_full");
  });

  it("يرفض اسمًا مكررًا", async () => {
    const a = app();
    const { body } = await request(a).post("/api/rooms").send({});
    await request(a).post(`/api/rooms/${body.roomCode}/join`).send({ name: "أحمد" });
    const res = await request(a).post(`/api/rooms/${body.roomCode}/join`).send({ name: "أحمد" });
    expect(res.status).toBe(409);
  });

  it("يسترجع الحكم بكود الاسترجاع", async () => {
    const a = app();
    const { body } = await request(a).post("/api/rooms").send({});
    const res = await request(a).post(`/api/rooms/${body.roomCode}/judge/recover`).send({ recoveryCode: body.judgeRecoveryCode });
    expect(res.status).toBe(200);
    expect(res.body.judgeToken).not.toBe(body.judgeToken);
  });

  it("يسترجع اللاعب بالتوكن بعد الانقطاع", async () => {
    const a = app();
    const { body } = await request(a).post("/api/rooms").send({});
    const join = await request(a).post(`/api/rooms/${body.roomCode}/join`).send({ name: "أحمد" });
    const res = await request(a).post(`/api/rooms/${body.roomCode}/reconnect`).send({ token: join.body.playerToken });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ role: "player", playerId: join.body.playerId });
  });
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `pnpm --filter @casino/server test http` — Expected: FAIL.

- [ ] **Step 3: نفّذ الـ API**

- Express 5 + `express.json({ limit: "64kb" })` + CORS من `process.env.CORS_ORIGIN` (fallback `*` في التطوير).
- تحقق Zod لكل body؛ أي خطأ → `400 { code: "invalid_payload", message }`.
- `join` يمرر `at=Date.now()`؛ `room_full` → 409؛ `wrong_state` → 409.
- `index.ts` يقرأ `PORT`، ينشئ Prisma store في الإنتاج (`DATABASE_URL` موجود) وMemory store في الاختبار، ويشغّل `app.listen`.
- أضف `app.use(express.static(webDist))` وfallback لـ`index.html` لخدمة الـPWA من نفس الخدمة.

- [ ] **Step 4: شغّل الاختبارات**

Run: `pnpm --filter @casino/server test http` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/http.ts packages/server/src/index.ts packages/server/test/http.test.ts
git commit -m "feat(server): room creation, join, reconnect and judge recovery HTTP API"
```

---

### Task 15: Socket.IO — المصادقة، الأوامر، الـIdempotency، وإسقاط DTO

**Files:**
- Create: `packages/server/src/socket.ts`, `packages/server/src/projection.ts`, `packages/server/src/commands.ts`
- Modify: `packages/server/src/index.ts`
- Test: `packages/server/test/socket.test.ts`, `packages/server/test/projection.test.ts`

**Interfaces:**
- Consumes: `CommandEnvelope`, `applyCommand`, `RoomService`, `RoomStore`, `QuestionRepository`.
- Produces:
  - `toJudgeView(state: RoomState): JudgeView`
  - `toPlayerView(state: RoomState, playerId: string): PlayerView`
  - `toPlayerEvent(event: GameEvent): GameEvent` (نسخة منزوعة الأسرار)
  - `class CommandService { constructor(deps: { store: RoomStore; questions: QuestionRepository; timers?: RoomTimers }); execute(code: string, envelope: CommandEnvelope): Promise<{ ok: boolean; duplicate?: boolean; code?: RejectCode; state?: RoomState; events?: GameEvent[] }> }`
  - `attachSocket(io, deps: { commands: CommandService; rooms: RoomService; store: RoomStore }): void`

- [ ] **Step 1: اكتب اختبارات الإسقاط والـIdempotency**

```ts
// packages/server/test/projection.test.ts
import { describe, expect, it } from "vitest";
import { toJudgeView, toPlayerEvent, toPlayerView } from "../src/projection";
import { activeQuestionState } from "./fixtures";

describe("DTO projection", () => {
  it("الحكم يرى الإجابة والتصنيف", () => {
    const view = toJudgeView(activeQuestionState());
    expect(view.question?.answer).toBe("القاهرة");
    expect(view.question?.categorySlug).toBe("geography");
  });

  it("اللاعب لا يرى الإجابة ولا الخيارات الصحيحة حتى مع إظهار السؤال", () => {
    const state = activeQuestionState({ showQuestionToPlayers: true });
    const view = toPlayerView(state, "p1");
    expect(view.question?.text).toBe("ما هي عاصمة مصر؟");
    expect(JSON.stringify(view)).not.toContain("القاهرة");
    expect((view.question as any).answer).toBeUndefined();
    expect((view.question as any).correctIndex).toBeUndefined();
  });

  it("اللاعب لا يرى نص السؤال لو الإعداد مغلق", () => {
    const view = toPlayerView(activeQuestionState({ showQuestionToPlayers: false }), "p1");
    expect(view.question).toBeNull();
  });

  it("اللاعب لا يرى إجابات الآخرين قبل الكشف", () => {
    const state = activeQuestionState();
    state.state = "simultaneous_active";
    state.submissions = [
      { playerId: "p1", payload: { kind: "rumble", answer: "القاهرة" } },
      { playerId: "p2", payload: { kind: "rumble", answer: "أسوان" } },
    ];
    const view = toPlayerView(state, "p1");
    expect(view.submissions).toEqual([{ playerId: "p1", payload: { kind: "rumble", answer: "القاهرة" } }]);
  });

  it("اللاعب يرى إجابات الجميع بعد الكشف", () => {
    const state = activeQuestionState();
    state.state = "reveal";
    state.submissions = [
      { playerId: "p1", payload: { kind: "rumble", answer: "القاهرة" } },
      { playerId: "p2", payload: { kind: "rumble", answer: "أسوان" } },
    ];
    const view = toPlayerView(state, "p1");
    expect(view.submissions.map((s) => s.playerId)).toEqual(["p1", "p2"]);
  });

  it("حدث question_selected لا يسرّب الإجابة للاعب", () => {
    const event = { id: "e1", roomCode: "A", seq: 1, at: 1, type: "question_selected", payload: { question: { text: "عاصمة مصر؟", answer: "القاهرة" } } } as any;
    expect(JSON.stringify(toPlayerEvent(event))).not.toContain("القاهرة");
  });
});
```

```ts
// packages/server/test/idempotency.test.ts
import { describe, expect, it } from "vitest";
import { MemoryRoomStore } from "../src/rooms/memoryStore";
import { RoomService } from "../src/rooms/roomService";
import { CommandService } from "../src/commands";
import { MemoryQuestionRepository } from "../src/questions/memoryRepository";

describe("idempotency", () => {
  it("إعادة نفس الأمر لا تطبّق النقاط مرتين", async () => {
    const store = new MemoryRoomStore();
    const rooms = new RoomService(store);
    const { code } = await rooms.createRoom();
    const joined = await rooms.joinRoom(code, "أحمد");
    const commands = new CommandService({ store, questions: new MemoryQuestionRepository() });
    const envelope = { id: "same-id", actorId: joined.playerId, role: "system" as const, expectedState: "lobby" as const, command: { type: "system:setConnection" as const, playerId: joined.playerId, connected: true } };
    const first = await commands.execute(code, envelope);
    const second = await commands.execute(code, envelope);
    expect(first.ok).toBe(true);
    expect(second).toEqual(expect.objectContaining({ ok: true, duplicate: true }));
  });

  it("الخادم يختار السؤال من البنك ولا يثق في سؤال العميل", async () => {
    const store = new MemoryRoomStore();
    const rooms = new RoomService(store);
    const repo = new MemoryQuestionRepository();
    await repo.insertMany([{ id: "q1", categorySlug: "geography", text: "عاصمة مصر؟", answer: "القاهرة", type: "capital", difficulty: "easy" }]);
    const { code } = await rooms.createRoom();
    const commands = new CommandService({ store, questions: repo });
    // الوصول لحالة question_setup يتم عبر أوامر الحكم في اختبار متكامل؛ هنا نتحقق أن الحمولة بلا سؤال مقبول
    await expect(commands.execute(code, { id: "x", actorId: "judge", role: "judge", expectedState: "lobby", command: { type: "judge:selectQuestion" } as any })).resolves.toMatchObject({ ok: false });
  });
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `pnpm --filter @casino/server test projection idempotency` — Expected: FAIL.

- [ ] **Step 3: نفّذ الإسقاط والبوابة**

- `PlayerView.question` كائن جديد بحقول مسموحة فقط: `id,text,type,mediaUrl,mediaCredit,letter,options` (بدون `answer`, `acceptedAnswers`, `correctIndex`, `categorySlug`, `difficulty`). وإذا `showQuestionToPlayers=false` → `null`.
- `PlayerView.settings` يشيل أي قيمة حساسة، ويعرض `buzzerSeconds`, `busSeconds`, `showBuzzerNames`.
- `PlayerView.players`: `id,name,score,isEliminated,isConnected,powerupKey,powerupState` فقط.
- `PlayerView.submissions`: إرسال اللاعب نفسه فقط أثناء `simultaneous_active`؛ وفي `reveal` يرى إجابات الجميع (بدون `acceptedAnswers` القياسية).
- `buzzer.presses`: أسماء اللاعبين فقط لو `showBuzzerNames=true` وبعد إغلاق الجرس، وإلا عدد الضغطات فقط.
- `toPlayerEvent`: يمرر الأحداث العامة، ويحوّل `question_selected` إلى `{ questionId, categorySlug? }` فقط، ويحذف أي مفتاح اسمه `answer`/`acceptedAnswers`/`correctIndex` recursively.
- `CommandService.execute`:
  - يجيب `RoomRecord`، ويرفض `wrong_state` لو `envelope.expectedState !== state.state`.
  - `judge:selectQuestion`: يتجاهل أي حمولة من العميل، ويستدعي `questions.pick({ categorySlug: state.nextCategoryOverride ?? state.selectedCategory, excludeIds: state.usedQuestionIds })`، وإذا `null` يرجع `invalid_payload`. يحقن `question` في الأمر ثم ينفّذ.
  - `idempotency`: `Map<`${code}:${id}`, RoomState>` — إعادة نفس `id` تعيد `{ ok: true, duplicate: true, state }` بدون تطبيق.
  - `at = Date.now()` و`seq = state.seq + 1` من السيرفر فقط.
  - يحفظ snapshot عبر `store.save`، ثم يضيف `usedQuestionIds` عند اختيار سؤال، ويكتب `GameEvent` و`Submission` عبر `store` (أضف `appendEvents` و`upsertSubmissions` إلى `RoomStore`).
- `attachSocket`: handshake `auth: { code, token }` → `rooms.authenticate`؛ فشل → `connect_error`. الانضمام لغرفة Socket باسم `room:{code}:judge` أو `room:{code}:player:{id}`.
- `game:event` يبث `toPlayerEvent(event)` للاعبين و`event` كاملًا للحكم.
- `buzzer:rank` للحكم فقط بعد كل ضغطة.
- عند الاتصال/الانقطاع: `system:setConnection` + بث `judge:status` للحكم.
- `error` للاعب برسالة عربية عامة دون تفاصيل داخلية؛ وأضف throttle بسيط (10 أوامر/ثانية لكل Socket) بـ`Map<socketId, timestamps[]>`.
- `attachSocket` يستخدم `commands.execute` ثم يبث `state:patch` لكل دور.

- [ ] **Step 4: شغّل الاختبارات**

Run: `pnpm --filter @casino/server test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/socket.ts packages/server/src/projection.ts packages/server/src/commands.ts
git commit -m "feat(server): authenticated socket gateway, idempotency and role-safe DTOs"
```

---

### Task 16: المؤقتات وإغلاق الجرس/الإرسال تلقائيًا

**Files:**
- Create: `packages/server/src/timers.ts`
- Modify: `packages/server/src/socket.ts`, `packages/game-core/src/machine.ts`, `packages/game-core/src/timers.ts`
- Test: `packages/server/test/timers.test.ts`, `packages/game-core/test/deadline.test.ts`

**Interfaces:**
- Consumes: `RoomState`, `applyCommand` (أمر `system:deadline`).
- Produces:
  - `class RoomTimers { schedule(code: string, state: RoomState): void; cancel(code: string): void; fireNow(code: string): Promise<void> }`
  - `applyDeadline(state: RoomState, at: number): CommandResult` في `game-core` (يُضاف في هذه المهمة).

- [ ] **Step 1: اكتب الاختبار**

```ts
// packages/game-core/test/deadline.test.ts
import { describe, expect, it } from "vitest";
import { applyCommand, createInitialState } from "../src";

const deadline = (state: any) =>
  applyCommand(state, { id: crypto.randomUUID(), actorId: "system", role: "system", expectedState: state.state, command: { type: "system:deadline" } }, { at: 50_000, seq: state.seq + 1 });

describe("system:deadline", () => {
  it("يقفل الجرس في question_active", () => {
    const s = createInitialState({ roomCode: "A" });
    s.state = "question_active";
    s.buzzer = { isOpen: true, openedAt: 1_000, deadline: 50_000, presses: [] };
    const r: any = deadline(s);
    expect(r.state.state).toBe("buzzer_locked");
    expect(r.state.buzzer?.isOpen).toBe(false);
  });

  it("يقفل الإرسال في simultaneous_active", () => {
    const s = createInitialState({ roomCode: "A" });
    s.state = "simultaneous_active";
    s.submissionsClosedAt = 50_000;
    expect((deadline(s) as any).state.state).toBe("submissions_closed");
  });

  it("يُرفض في lobby", () => {
    const s = createInitialState({ roomCode: "A" });
    expect((deadline(s) as any).ok).toBe(false);
  });
});
```

```ts
// packages/server/test/timers.test.ts
import { describe, expect, it, vi } from "vitest";
import { createInitialState } from "@casino/game-core";
import { RoomTimers } from "../src/timers";

describe("مؤقتات الغرفة", () => {
  it("يقفل الجرس عند المهلة باستخدام system:deadline", async () => {
    vi.useFakeTimers();
    const state = createInitialState({ roomCode: "A" });
    state.state = "question_active";
    state.buzzer = { isOpen: true, openedAt: 0, deadline: Date.now() + 1_000, presses: [] };
    const onDeadline = vi.fn();
    const timers = new RoomTimers({ onDeadline });
    timers.schedule("A", state);
    await vi.advanceTimersByTimeAsync(1_001);
    expect(onDeadline).toHaveBeenCalledWith("A", "buzzer");
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `pnpm --filter @casino/server test timers` — Expected: FAIL.

- [ ] **Step 3: نفّذ المؤقتات**

- `system:deadline` في `game-core`: في `question_active` مع جرس مفتوح → `buzzer_locked`؛ في `simultaneous_active` → `submissions_closed`. يُرفض في غير ذلك.
- `RoomTimers` يحتفظ بـ`Map<code, NodeJS.Timeout>`؛ يجدول مؤقتًا واحدًا لأقرب deadline (`buzzer.deadline` أو `submissionsClosedAt`) ويستدعي `onDeadline(code, kind)`.
- عند كل تغيير حالة من Socket، استدعِ `timers.schedule(code, state)` بعد الحفظ؛ وعند `finished`/`lobby` استدعِ `cancel`.
- `fireNow` تسمح للاختبارات بتشغيل المهلة دون انتظار.
- أعد جدولة المؤقتات عند بدء السيرفر من snapshots الغرف النشطة.

- [ ] **Step 4: شغّل الاختبارات**

Run: `pnpm --filter @casino/server test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/timers.ts packages/game-core packages/server/test/timers.test.ts
git commit -m "feat(server): server-side deadlines for buzzer and submissions"
```

---

### Task 17: خدمة الأسئلة + Admin API + استيراد CSV/JSON

**Files:**
- Create: `packages/server/src/questions/questionService.ts`, `packages/server/src/questions/repository.ts`, `packages/server/src/questions/memoryRepository.ts`
- Create: `packages/server/src/admin.ts`
- Modify: `packages/server/src/http.ts`
- Test: `packages/server/test/admin.test.ts`

**Interfaces:**
- Consumes: `Question`, `validateQuestion`, `hashQuestion`, `QuestionType`, `Category`.
- Produces:
  - `interface QuestionRepository { listCategories(): Promise<Category[]>; pick(input: { categorySlug: string; excludeIds: string[] }): Promise<Question | null>; insertMany(items: Question[]): Promise<{ inserted: number; skipped: number }>; list(filter): Promise<Question[]>; setActive(id, active): Promise<void> }`
  - `class QuestionService { pickForRoom(categorySlug, usedIds): Promise<Question | null>; assertCategoryExists(slug): Promise<boolean> }`
  - `createAdminRouter(deps): express.Router` — كل المسارات تتطلب هيدر `x-admin-key`.

- [ ] **Step 1: اكتب اختبارات الأدمن**

```ts
// packages/server/test/admin.test.ts
import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/http";
import { MemoryRoomStore } from "../src/rooms/memoryStore";
import { RoomService } from "../src/rooms/roomService";
import { MemoryQuestionRepository } from "../src/questions/memoryRepository";

const app = (repo = new MemoryQuestionRepository()) =>
  createApp({ rooms: new RoomService(new MemoryRoomStore()), questions: repo, adminKey: "test-key" });

describe("Admin API", () => {
  it("يرفض بدون مفتاح الأدمن", async () => {
    expect((await request(app()).get("/api/admin/questions")).status).toBe(401);
  });

  it("يستورد JSON ويقص الأسئلة غير الصالحة", async () => {
    const res = await request(app()).post("/api/admin/questions/import")
      .set("x-admin-key", "test-key")
      .send({ questions: [
        { categorySlug: "geography", text: "عاصمة مصر؟", answer: "القاهرة", type: "capital", difficulty: "easy" },
        { categorySlug: "geography", text: "", answer: "", type: "open", difficulty: "easy" },
      ] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ inserted: 1, skipped: 1, errors: [expect.objectContaining({ index: 1 })] });
  });

  it("يرفض التكرار بالـhash", async () => {
    const a = app();
    const q = { categorySlug: "geography", text: "عاصمة مصر؟", answer: "القاهرة", type: "capital", difficulty: "easy" };
    await request(a).post("/api/admin/questions/import").set("x-admin-key", "test-key").send({ questions: [q] });
    const res = await request(a).post("/api/admin/questions/import").set("x-admin-key", "test-key").send({ questions: [q] });
    expect(res.body.skipped).toBe(1);
  });

  it("يختار سؤالًا غير مستخدم من التصنيف", async () => {
    const repo = new MemoryQuestionRepository();
    await repo.insertMany([
      { id: "q1", categorySlug: "history", text: "س1", answer: "أ", type: "open", difficulty: "easy" },
      { id: "q2", categorySlug: "history", text: "س2", answer: "ب", type: "open", difficulty: "easy" },
    ]);
    expect((await repo.pick({ categorySlug: "history", excludeIds: ["q1"] }))?.id).toBe("q2");
  });
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `pnpm --filter @casino/server test admin` — Expected: FAIL.

- [ ] **Step 3: نفّذ الخدمة والمسارات**

- `ADMIN_KEY` من البيئة؛ المقارنة `timingSafeEqual`؛ غيابه في الإنتاج يمنع تشغيل السيرفر (fail fast).
- `POST /api/admin/questions/import` يقبل `{ questions: Question[] }` أو `{ csv: string }`؛ يستخدم `csv-parse/sync` بترويسة ثابتة، ويحوّل `acceptedAnswers`/`options` من `|` مفصولة.
- كل عنصر يمر على `validateQuestion` و`hashQuestion`؛ المكرر أو غير الصالح يُعدّ `skipped` مع `errors[{index, message}]`.
- `GET /api/admin/questions?category=&type=&active=` يرجع صفحة (`limit=50`, `offset`).
- `PATCH /api/admin/questions/:id` يفعّل/يعطّل أو يعدّل النص/الإجابة مع إعادة حساب الـhash.
- `pickForRoom`: يستبعد `usedIds`، ويفضّل الأسئلة الأقل `usageCount`، ويرجع `null` لو التصنيف فاضي (ليستخدمها «كوبري» كـfallback عشوائي).
- استخدم `MemoryQuestionRepository` في التطوير و`PrismaQuestionRepository` في الإنتاج (نفس الواجهة، استعلام `findFirst` مع `notIn` و`orderBy usageCount asc`).

- [ ] **Step 4: شغّل الاختبارات**

Run: `pnpm --filter @casino/server test admin` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/questions packages/server/src/admin.ts packages/server/test/admin.test.ts
git commit -m "feat(server): question repository, admin CRUD and CSV/JSON import"
```

---

### Task 18: بنك ٤٠٠ سؤال + الميديا الحرة + سكربت التحقق

**Files:**
- Create: `packages/questions/data/categories.json`, `packages/questions/data/questions.seed.json`
- Create: `packages/questions/media/flags/*.svg`, `packages/questions/media/cities/*.jpg`, `packages/questions/media/CREDITS.md`
- Create: `packages/questions/src/{seed,validateBank,importCsv}.ts`
- Create: `packages/questions/test/{seed,validateBank,media}.test.ts`
- Modify: `packages/server/prisma/seed.ts`

**Interfaces:**
- Consumes: `Question`, `validateQuestion`, `hashQuestion`, `CATEGORY_SLUGS`.
- Produces:
  - `loadSeed(): { categories: Category[]; questions: Question[] }`
  - `validateBank(items: Question[]): { errors: { id: string; messages: string[] }[]; duplicates: string[] }`
  - `seedDatabase(prisma): Promise<{ categories: number; questions: number }>`

- [ ] **Step 1: اكتب اختبارات البنك**

```ts
// packages/questions/test/validateBank.test.ts
import { describe, expect, it } from "vitest";
import { loadSeed } from "../src/seed";
import { validateBank } from "../src/validateBank";

describe("بنك الأسئلة", () => {
  const { questions } = loadSeed();

  it("٤٠٠ سؤال على الأقل وكل التصنيفات ممثلة", () => {
    expect(questions.length).toBeGreaterThanOrEqual(400);
    const cats = new Set(questions.map((q) => q.categorySlug));
    expect(cats.size).toBe(11);
  });

  it("لا أخطاء ولا تكرار", () => {
    const result = validateBank(questions);
    expect(result.errors).toEqual([]);
    expect(result.duplicates).toEqual([]);
  });

  it("كل نوع سؤال له ١٠ أمثلة على الأقل", () => {
    const counts = new Map<string, number>();
    for (const q of questions) counts.set(q.type, (counts.get(q.type) ?? 0) + 1);
    for (const type of ["open","mcq","true_false","capital","quote","proverb","actor","reversed","reversed_song","description","song","singer_song","movie_line","movie_scene","number_guess","flag","city_image"]) {
      expect(counts.get(type) ?? 0).toBeGreaterThanOrEqual(10);
    }
  });

  it("كل سؤال صورة له credit وملف محلي", () => {
    for (const q of questions.filter((x) => x.mediaUrl)) {
      expect(q.mediaCredit?.trim().length).toBeGreaterThan(10);
      expect(q.mediaUrl).toMatch(/^\/media\//);
    }
  });
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `pnpm --filter @casino/questions test` — Expected: FAIL لعدم وجود البنك.

- [ ] **Step 3: اكتب البنك والتحقق**

**التوزيع الملزم (٤٠٠):**

| التصنيف | العدد | التصنيف | العدد |
|---|---|---|---|
| معلومات عامة | 40 | رياضة | 38 |
| تاريخ | 38 | جغرافيا | 40 |
| أفلام ومسلسلات | 38 | موسيقى | 36 |
| علوم | 34 | ثقافة | 32 |
| أكل مصري | 30 | مسلسلات رمضان | 26 |
| أغاني وطنية | 24 | **الإجمالي** | **376** |

أضف **٢٤ سؤالًا فاصلًا** موزعة على التصنيفات للوصول إلى **٤٠٠**.

**توزيع الأنواع:** كل نوع من الـ١٧ له ١٠ على الأقل. الصور: ٢٠ علمًا + ١٥ مدينة. الأسئلة السمعية كلها نصية. الأسئلة الأصلية بصياغة خاصة، والاقتباسات ≤ ٢٠ كلمة.

**قواعد المحتوى:**
- كل سؤال له `id` ثابت (`cat-001`)، `difficulty`، وإجابة واحدة قياسية + بدائل شائعة.
- «حكم مشهورة» تُنسب لصاحبها في `text` وتكون الإجابة إكمال العبارة.
- «اعرف الفيلم من المشهد» وصف مكتوب لثلاثة عناصر (مكان، لبس، جملة) بدون لقطات.
- «أغنية مقلوبة» كلمات مقلوبة حرفيًا في `text`، والإجابة اسم الأغنية.
- الأعلام: SVG من Wikimedia Commons (Public Domain)، أسماء الملفات `eg.svg`, `sa.svg`... مع `mediaCredit: "Wikimedia Commons — Public Domain"`.
- صور المدن: JPG من Wikimedia Commons بترخيص CC0/CC-BY/CC-BY-SA، بعرض ≤ 1200px، و`mediaCredit` بالشكل `"المؤلف — CC BY-SA 4.0 — Wikimedia Commons"`، وتُسجَّل في `CREDITS.md`.
- لا صور لأشخاص أحياء، ولا رموز دينية/سياسية حساسة، ولا محتوى مسيء.

**التحقق الآلي:**
- `validateBank` يفشل لو: عدد < 400، تصنيف ناقص، نوع < 10، hash مكرر، سؤال صورة بلا credit، `mcq` بلا ٤ خيارات، إجابة فارغة.
- `seedDatabase`: upsert للتصنيفات، ثم `createMany({ skipDuplicates: true })` للأسئلة، ويطبع التقرير.
- `importCsv` يقرأ نفس الترويسة المستخدمة في الأدمن ويحوّل الملف إلى `Question[]`.

- [ ] **Step 4: شغّل الاختبارات**

Run: `pnpm --filter @casino/questions test` — Expected: PASS، والبنك ٤٠٠+.

- [ ] **Step 5: Commit**

```bash
git add packages/questions
git commit -m "content: 400-question reviewed arabic bank with licensed media credits"
```

---

### Task 19: الويب — الهيكل، الهوية، RTL، PWA، وعميل الـSocket

**Files:**
- Create: `packages/web/{package.json,tsconfig.json,vite.config.ts,index.html}`
- Create: `packages/web/src/{main.tsx,App.tsx,router.tsx}`
- Create: `packages/web/src/styles/{theme.css,animations.css}`
- Create: `packages/web/src/lib/{api,socket,tokenStore}.ts`, `packages/web/src/store/gameStore.ts`
- Create: `packages/web/public/{manifest.webmanifest,icons/icon-192.png,icons/icon-512.png}`
- Test: `packages/web/test/tokenStore.test.ts`, `packages/web/test/theme.test.ts`

**Interfaces:**
- Produces:
  - `saveSession(s: { role; code; token; playerId? }): void` / `loadSession()` / `clearSession()`
  - `createGameSocket(session): Socket`
  - `useGameStore` (zustand) بـ`{ view, setView, connection, setConnection, toast, showToast }`
  - `api.createRoom()`, `api.joinRoom(code, name)`, `api.reconnect(code, token)`, `api.recoverJudge(code, recoveryCode)`
  - Routes: `/`, `/join/:code?`, `/room/:code`, `/admin/questions`

- [ ] **Step 1: اكتب اختبار حالة الجلسة**

```ts
// packages/web/test/tokenStore.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { clearSession, loadSession, saveSession } from "../src/lib/tokenStore";

describe("tokenStore", () => {
  beforeEach(() => localStorage.clear());
  it("يحفظ ويسترجع جلسة اللاعب", () => {
    saveSession({ role: "player", code: "ABC123", token: "t", playerId: "p1" });
    expect(loadSession()).toEqual({ role: "player", code: "ABC123", token: "t", playerId: "p1" });
  });
  it("يمسح الجلسة", () => {
    saveSession({ role: "judge", code: "ABC123", token: "t" });
    clearSession();
    expect(loadSession()).toBeNull();
  });
  it("يتجاهل JSON تالف", () => {
    localStorage.setItem("casino.session", "{bad");
    expect(loadSession()).toBeNull();
  });
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `pnpm --filter @casino/web test` — Expected: FAIL.

- [ ] **Step 3: أنشئ الهيكل والهوية**

- Vite + React 19 + TypeScript + Tailwind 4 (`@tailwindcss/vite`) + `react-router-dom` + `zustand` + `socket.io-client` + `@fontsource/ibm-plex-sans-arabic` + `vite-plugin-pwa`.
- `index.html`: `<html lang="ar" dir="rtl">`، عنوان «كازينو الألعاب»، `theme-color #0A0806`، وربط الخط محليًا.
- `theme.css` يعرّف المتغيرات:

```css
:root {
  --bg-0: #0A0806; --bg-1: #15100A; --surface: #1B1611;
  --gold: #F2B01E; --gold-soft: #F5C542; --bell: #D92B2B;
  --cream: #F7F3EA; --glow: #FF7A18; --green: #39D353; --blue: #2FA8FF;
  --shank: #A855F7; --cobri: #2FA8FF; --salem: #39D353;
  --radius: 16px; --tap: 44px;
}
```

- خلفية متدرجة من `--bg-0` إلى `--bg-1` مع توهج برتقالي شفاف، حدود ذهبية 1px، ظل داخلي خفيف.
- `animations.css`: نبضة الجرس، ripple، flash أخضر/أحمر، دخول كرت، وكلها داخل `@media (prefers-reduced-motion: no-preference)`.
- `vite.config.ts`: `base: "/"`, proxy `/api` و`/socket.io` إلى `http://localhost:3000` في التطوير، و`VitePWA` بـ`registerType: "autoUpdate"`، `display: "standalone"`, `orientation: "portrait"`, أيقونات 192/512، و`start_url: "/"`.
- `tokenStore` يستخدم `localStorage` بمفتاح `casino.session` مع `try/catch`.
- `lib/format.ts`: `formatNumber(n)` بـ`Intl.NumberFormat("ar-EG")` لعرض الأرقام العربية، و`formatDuration(ms)` بـ`mm:ss` مع أرقام عربية. استخدمه في كل الشاشات (النقاط، العدادات، عدد اللاعبين) حتى تتطابق الاختبارات.
- `socket.ts`: `io({ auth: { code, token }, transports: ["websocket"] })` مع إعادة اتصال لا نهائية و`connection` state.
- `gameStore` يستقبل `state:patch` ويخزّن `PlayerView | JudgeView`، و`toast` يعرض آخر إشعار ٣ ثوانٍ.
- `router` يحمي `/room/:code` بوجود جلسة، ويحوّل لـ`/join` لو لا توجد.

- [ ] **Step 4: شغّل الاختبارات والبناء**

Run: `pnpm --filter @casino/web test && pnpm --filter @casino/web build` — Expected: PASS + بناء ناجح.

- [ ] **Step 5: Commit**

```bash
git add packages/web
git commit -m "feat(web): RTL casino theme, PWA shell, session store and socket client"
```

---

### Task 20: الويب — الرئيسية، الانضمام، اللوبي، واختيار الكروت

**Files:**
- Create: `packages/web/src/pages/{Home,Join,Lobby}.tsx`
- Create: `packages/web/src/components/{PowerupCard,Scoreboard,Toast}.tsx`
- Test: `packages/web/test/lobby.test.tsx`

**Interfaces:**
- Consumes: `api`, `saveSession`, `useGameStore`.
- Produces: مكوّنات `HomePage`, `JoinPage`, `LobbyPage`؛ `PowerupCard({ powerup, state, disabled, onSelect })`.

- [ ] **Step 1: اكتب اختبار الواجهة**

```tsx
// packages/web/test/lobby.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LobbyPage } from "../src/pages/Lobby";

const view = (over: any = {}) => ({
  code: "ABC123", state: "powerup_selection", roundKind: "buzzer",
  players: [
    { id: "p1", name: "أحمد", score: 0, powerupKey: null, powerupState: "none", isConnected: true, isEliminated: false },
    { id: "p2", name: "سارة", score: 0, powerupKey: "shank", powerupState: "reserved", isConnected: true, isEliminated: false },
  ],
  me: { id: "p1", name: "أحمد", score: 0, powerupKey: null, powerupState: "none", isConnected: true, isEliminated: false },
  settings: { showQuestionToPlayers: false },
  ...over,
});

describe("لوبي اللاعب", () => {
  it("يعرض الكروت الثلاثة ويقفل المحجوز", () => {
    render(<MemoryRouter><LobbyPage view={view()} onChoose={vi.fn()} /></MemoryRouter>);
    expect(screen.getByText("شنك الحرمية")).toBeTruthy();
    expect(screen.getByRole("button", { name: /كوبري/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /سلم وتعبان/ })).toBeDisabled();
  });

  it("يرسل اختيار الكارت مرة واحدة", async () => {
    const onChoose = vi.fn();
    render(<MemoryRouter><LobbyPage view={view()} onChoose={onChoose} /></MemoryRouter>);
    await userEvent.click(screen.getByRole("button", { name: /شنك الحرمية/ }));
    expect(onChoose).toHaveBeenCalledWith("shank");
  });

  it("يعرض كود الغرفة وعدد اللاعبين ٢ من ٣", () => {
    render(<MemoryRouter><LobbyPage view={view()} onChoose={vi.fn()} /></MemoryRouter>);
    expect(screen.getByText("ABC123")).toBeTruthy();
    expect(screen.getByText("٢ / ٣")).toBeTruthy();
  });
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `pnpm --filter @casino/web test lobby` — Expected: FAIL.

- [ ] **Step 3: نفّذ الصفحات**

- **الرئيسية:** شعار نصي «كازينو الألعاب» + جرس أحمر، زر «اعمل غرفة» (حكم) وزر «انضم بكود». شرح ٣ خطوات بالعربية. لا نص إنجليزي ظاهر.
- **الانضمام:** حقل كود ٦ أحرف (uppercase تلقائي)، حقل اسم (٢–١٦ حرفًا، بلا مسافات بادئة)، أخطاء عربية واضحة (`الغرفة مليانة`، `الكود غلط`، `الاسم مستخدم`).
- **اللوبي (حكم):** كود الغرفة بخط كبير + زر نسخ، قائمة اللاعبين، زر «ابدأ اختيار الكروت»، ثم «ابدأ اللعبة» (يُقفل قبل اكتمال الاختيار الاختياري)، وزر «ابدأ من غير باقي الكروت».
- **اللوبي (لاعب):** بطاقات الكروت الثلاثة بألوانها، وصف سطر لكل كرت، الكارت المحجوز يظهر مقفولًا باسم صاحبه، والمختار يظهر بحالة «كرتك».
- **PowerupCard:** زر كبير ≥ 44px، حدود بلون الكرت، أيقونة SVG بسيطة، حالة `reserved/used/disabled` مع `aria-disabled`.
- **Toast:** `aria-live="polite"` وأسفل الشاشة.
- اربط جميع الأفعال بـ`emit("command", { id: crypto.randomUUID(), expectedState, command })` عبر `sendCommand` helper في `lib/socket.ts`.

- [ ] **Step 4: شغّل الاختبارات**

Run: `pnpm --filter @casino/web test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/pages packages/web/src/components packages/web/test
git commit -m "feat(web): home, join, lobby and exclusive powerup selection screens"
```

---

### Task 21: الويب — لوحة الحكم (الجرس والتحكم الكامل)

**Files:**
- Create: `packages/web/src/pages/JudgeRoom.tsx`
- Create: `packages/web/src/components/{QuestionCard,CardBadge,SettingsPanel,ScoreAdjustDialog}.tsx`
- Modify: `packages/web/src/components/Scoreboard.tsx`
- Test: `packages/web/test/judge.test.tsx`

**Interfaces:**
- Consumes: `useGameStore`, `sendCommand`, `DEFAULT_SETTINGS`.
- Produces: `JudgeRoom({ view, send })`؛ `QuestionCard({ question, showAnswer, media })`؛ `SettingsPanel({ settings, onChange })`.

- [ ] **Step 1: اكتب اختبارات لوحة الحكم**

```tsx
// packages/web/test/judge.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { JudgeRoom } from "../src/pages/JudgeRoom";

const base = (over: any = {}) => ({
  code: "ABC123", state: "question_active", roundKind: "buzzer",
  players: [
    { id: "p1", name: "أحمد", score: 2, powerupKey: "shank", powerupState: "reserved", isConnected: true, isEliminated: false },
    { id: "p2", name: "سارة", score: -1, powerupKey: null, powerupState: "none", isConnected: true, isEliminated: false },
  ],
  me: { id: "judge", name: "الحكم" },
  question: { id: "q1", text: "ما هي عاصمة مصر؟", answer: "القاهرة", categorySlug: "geography", type: "capital" },
  buzzer: { isOpen: true, deadline: Date.now() + 10_000, presses: [{ playerId: "p1", playerName: "أحمد" }] },
  settings: { buzzerSeconds: 15, showQuestionToPlayers: false, showBuzzerNames: true, allowNegative: true, yellowPenalty: -1, redPenalty: -3 },
  ...over,
});

describe("لوحة الحكم", () => {
  it("تعرض السؤال والإجابة للحكم فقط", () => {
    render(<MemoryRouter><JudgeRoom view={base()} send={vi.fn()} /></MemoryRouter>);
    expect(screen.getByText("ما هي عاصمة مصر؟")).toBeTruthy();
    expect(screen.getByText("القاهرة")).toBeTruthy();
  });

  it("تعرض ترتيب الضغطات أثناء فتح الجرس", () => {
    render(<MemoryRouter><JudgeRoom view={base()} send={vi.fn()} /></MemoryRouter>);
    expect(screen.getByText("أحمد")).toBeTruthy();
    expect(screen.getByText("١")).toBeTruthy();
  });

  it("تقفل زر الإجابة الصحيحة قبل اختيار المجيب", () => {
    render(<MemoryRouter><JudgeRoom view={base({ state: "buzzer_locked" })} send={vi.fn()} /></MemoryRouter>);
    expect(screen.getByRole("button", { name: "صح" })).toBeDisabled();
  });

  it("ترسل الكارت الأصفر للاعب المحدد", async () => {
    const send = vi.fn();
    render(<MemoryRouter><JudgeRoom view={base({ state: "card_action" })} send={send} /></MemoryRouter>);
    await userEvent.click(screen.getByRole("button", { name: "إنذار أصفر لأحمد" }));
    expect(send).toHaveBeenCalledWith({ type: "judge:playCard", playerId: "p1", card: "yellow" });
  });

  it("تطلب سببًا قبل تعديل النقاط يدويًا", async () => {
    const send = vi.fn();
    render(<MemoryRouter><JudgeRoom view={base({ state: "result" })} send={send} /></MemoryRouter>);
    await userEvent.click(screen.getByRole("button", { name: /تعديل نقاط/ }));
    await userEvent.type(screen.getByLabelText("السبب"), "خصم يدوي");
    await userEvent.click(screen.getByRole("button", { name: "تأكيد" }));
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ type: "judge:adjustScore", reason: "خصم يدوي" }));
  });
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `pnpm --filter @casino/web test judge` — Expected: FAIL.

- [ ] **Step 3: نفّذ اللوحة**

- **التخطيط:** عمودان على الشاشات الكبيرة (سؤال + تحكم / نتائج)، وعمود واحد على الموبايل. الشريط العلوي: كود الغرفة، الحالة بالعربية، زر إيقاف مؤقت.
- **عرض الحالات:**
  - `lobby`: كود + لاعبون + «ابدأ اختيار الكروت».
  - `powerup_selection`: حالة كل لاعب + «ابدأ اللعبة».
  - `ready`: اختيار نوع الجولة (جرس/أتوبيس/أكتر كلمات/رويال) — الضغط على النوع يرسل `judge:selectRoundKind` وينتقل لشرح الجولة.
  - `round_intro`: شرح الوضع + «ابدأ الجولة» (`judge:beginRound`).
  - `question_setup`: اختيار التصنيف + قائمة أسئلة (٣ اقتراحات من الخادم) + «اسحب سؤال» (`judge:selectQuestion`) ثم «ابدأ السؤال» (`judge:startQuestion`). في وضع أتوبيس/السباق يظهر اختيار الحرف أولًا (`judge:setBusLetter`).
  - `question_active`: عرض السؤال والإجابة + عدّاد الجرس + قائمة الضغطات + «اقفل الجرس» + «صح/غلط» (بعد اختيار المجيب).
  - `buzzer_locked`: اختيار المجيب من الضغطات + «إعادة فتح» + «تخطي».
  - `answering`: «صح» / «غلط».
  - `card_action`: إنذار أصفر/أحمر لكل لاعب + «إنهاء السؤال» + «إعادة فتح الجرس».
  - `result`: ملخص النقاط + كروت + «الجولة التالية» (`judge:nextQuestion`) + «تعديل نقاط» + «إنهاء اللعبة».
  - `next_question`: اختيار نوع الجولة القادمة + «ابدأ الجولة» (أو «إنهاء اللعبة»).
  - `simultaneous_active`: عدّاد + حالة إرسال كل لاعب + «اقفل الإرسال».
  - `submissions_closed`: «اكشف الإجابات» (`judge:openReveal`) — وفي رويال رامبل «اعتمد النتيجة» (`judge:confirmRumbleResult`).
  - `reveal`: قائمة الإجابات مع اعتماد/إلغاء + «اعتمد الكل» + «الجولة التالية» (تعود إلى `result` أولًا).
  - `tie_breaker`: نفس واجهة اختيار السؤال، مع توضيح أن الإجابة الصحيحة تحسم اللعبة.
  - `finished`: الترتيب النهائي + «سؤال فاصل» لو تعادل + «إعادة جولة» (`judge:rematch` ترجع للوبي بنفس اللاعبين).
- **SettingsPanel:** `allowNegative`، `showQuestionToPlayers`، `showBuzzerNames`، `buzzerSeconds`، `pointsPerCorrect`، وقيم الكروت. تُحفظ قبل بدء اللعبة فقط.
- **`judge:selectQuestion`:** الواجهة ترسل `{ type: "judge:selectQuestion" }` فقط؛ الخادم هو من يختار السؤال من البنك ويحقن `Question` الكامل قبل `applyCommand` (لا يثق في سؤال قادم من المتصفح).
- **اختبارات E2E hooks:** ضع `data-testid="room-code"` على كود الغرفة، `data-testid="question-answer"` على نص الإجابة في `QuestionCard`، و`data-testid={`score-${player.id}`}` على رقم نقاط كل لاعب في `Scoreboard`. هذه هي نفس المحددات المستخدمة في Task 27.
- **عرض الميديا:** `MediaCard` يعرض الصورة مع `figcaption` فيه `mediaCredit` بخط صغير مقروء.
- **ألوان الحالة:** أخضر للصح، أحمر للغلط، ذهبي للانتظار، مع `aria-live` لتغيّر النتيجة.

- [ ] **Step 4: شغّل الاختبارات**

Run: `pnpm --filter @casino/web test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/pages/JudgeRoom.tsx packages/web/src/components packages/web/test/judge.test.tsx
git commit -m "feat(web): full judge dashboard with buzzer, cards, settings and reveal controls"
```

---

### Task 22: الويب — شاشة اللاعب والجرس

**Files:**
- Create: `packages/web/src/pages/PlayerRoom.tsx`
- Create: `packages/web/src/components/{BellButton,ConnectionBanner}.tsx`
- Test: `packages/web/test/player.test.tsx`

**Interfaces:**
- Consumes: `useGameStore`, `sendCommand`.
- Produces: `PlayerRoom({ view, send, connection })`؛ `BellButton({ enabled, onPress, myRank, pressCount })`.

- [ ] **Step 1: اكتب الاختبارات**

```tsx
// packages/web/test/player.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PlayerRoom } from "../src/pages/PlayerRoom";

const view = (over: any = {}) => ({
  code: "ABC123", state: "question_active", roundKind: "buzzer",
  me: { id: "p1", name: "أحمد", score: 3, powerupKey: "shank", powerupState: "reserved", isConnected: true, isEliminated: false },
  players: [
    { id: "p1", name: "أحمد", score: 3, isConnected: true },
    { id: "p2", name: "سارة", score: 1, isConnected: true },
  ],
  question: { id: "q1", text: "ما هي عاصمة مصر؟", type: "capital" },
  buzzer: { isOpen: true, deadline: Date.now() + 10_000, myRank: null, pressCount: 1 },
  settings: { showQuestionToPlayers: true, showBuzzerNames: true, allowNegative: true },
  ...over,
});

describe("شاشة اللاعب", () => {
  it("ترسل ضغطة واحدة فقط وتقفل الجرس بعدها", async () => {
    const send = vi.fn();
    render(<MemoryRouter><PlayerRoom view={view()} send={send} connection="connected" /></MemoryRouter>);
    const bell = screen.getByRole("button", { name: /دوس الجرس/ });
    await userEvent.click(bell);
    await userEvent.click(bell);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("تعرض ترتيب الضغط بعد رد السيرفر", () => {
    render(<MemoryRouter><PlayerRoom view={view({ buzzer: { ...view().buzzer, myRank: 1 } })} send={vi.fn()} connection="connected" /></MemoryRouter>);
    expect(screen.getByText("أنت الأول")).toBeTruthy();
  });

  it("تعرض بانر إعادة الاتصال", () => {
    render(<MemoryRouter><PlayerRoom view={view()} send={vi.fn()} connection="reconnecting" /></MemoryRouter>);
    expect(screen.getByText("بنجرب نرجع الاتصال…")).toBeTruthy();
  });

  it("تقفل الجرس بعد قفله من الخادم", () => {
    render(<MemoryRouter><PlayerRoom view={view({ buzzer: { ...view().buzzer, isOpen: false } })} send={vi.fn()} connection="connected" /></MemoryRouter>);
    expect(screen.getByRole("button", { name: /الجرس مقفول/ })).toBeDisabled();
  });
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `pnpm --filter @casino/web test player` — Expected: FAIL.

- [ ] **Step 3: نفّذ الشاشة**

- **BellButton:** دائرة كبيرة ٢٠٠px+، أحمر الجرس مع ذهبي، `onPointerDown` (مش `onClick`) لتقليل التأخير، `touch-action: manipulation`، `user-select: none`، ripple فوري، و`aria-label` يتغيّر حسب الحالة.
- عند الضغط: أرسل `player:buzz` مرة واحدة، واعرض «ثبّت…» محليًا حتى يصل `buzzer:rank` من السيرفر (لا تعتمد على العدّ المحلي).
- **عدّاد المهلة** يعتمد على `deadline - serverNowOffset`، وليس على ساعة المتصفح وحدها؛ احسب `serverNowOffset` من أول `state:patch` يحمل `serverNow`.
- **العرض حسب الحالة:** سؤال مخفي/ظاهر حسب `settings.showQuestionToPlayers`، نتيجة آخر سؤال، كارت اللاعب، ترتيب النقاط.
- **ConnectionBanner:** `reconnecting` → «بنجرب نرجع الاتصال…» مع `role="status"`؛ `disconnected` → زر «إعادة المحاولة».
- **منع اللمس المزدوج:** `pointerdown` + `lock` محلي لمدة ٥٠٠ms + الخادم يرفض التكرار أصلًا.
- **إتاحة:** الجرس `<button>` حقيقي، يعمل بـEnter/Space، و`aria-pressed`/`aria-disabled` صحيحان، وممنوع `outline: none` بدون بديل.
- **بدون إجابة:** لا تعرض الخيارات الصحيحة ولا الإجابة بعد الكشف للاعب إلا لو الخادم بعتها في `reveal` (وهي إجابات اللاعبين لا الإجابة القياسية).

- [ ] **Step 4: شغّل الاختبارات**

Run: `pnpm --filter @casino/web test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/pages/PlayerRoom.tsx packages/web/src/components/BellButton.tsx packages/web/src/components/ConnectionBanner.tsx packages/web/test/player.test.tsx
git commit -m "feat(web): low-latency player buzzer screen with server-authoritative rank"
```

---

### Task 23: الويب — أتوبيس و«أكتر كلمات»

**Files:**
- Create: `packages/web/src/components/{BusGrid,LetterRaceInput,RoundTimer}.tsx`
- Create: `packages/web/src/pages/{BusRound,LetterRaceRound}.tsx`
- Test: `packages/web/test/bus.test.tsx`

**Interfaces:**
- Consumes: `view.busLetter`, `view.settings.busCategories`, `sendCommand`.
- Produces: `BusGrid({ categories, values, onChange, disabled })`؛ `LetterRaceInput({ words, onChange, disabled })`؛ `roundDeadlineRemaining(deadline, serverNow)`.

- [ ] **Step 1: اكتب الاختبارات**

```tsx
// packages/web/test/bus.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BusRound } from "../src/pages/BusRound";

const view = (over: any = {}) => ({
  code: "ABC123", state: "simultaneous_active", roundKind: "bus", busLetter: "س",
  me: { id: "p1", name: "أحمد" },
  players: [{ id: "p1", name: "أحمد" }, { id: "p2", name: "سارة" }],
  settings: { busCategories: ["اسم", "بلد", "حيوان"], busSeconds: 90 },
  submissions: [],
  ...over,
});

describe("أتوبيس", () => {
  it("يعرض الحرف والفئات", () => {
    render(<BusRound view={view()} send={vi.fn()} />);
    expect(screen.getByText("س")).toBeTruthy();
    expect(screen.getByLabelText("اسم")).toBeTruthy();
  });

  it("يرسل الإجابات مرة واحدة", async () => {
    const send = vi.fn();
    render(<BusRound view={view()} send={send} />);
    await userEvent.type(screen.getByLabelText("اسم"), "سمك");
    await userEvent.click(screen.getByRole("button", { name: "إرسال" }));
    expect(send).toHaveBeenCalledWith({ type: "player:submitRound", payload: { kind: "bus", answers: { "اسم": "سمك" } } });
  });

  it("لا يسمح بالإضافة بعد الإرسال", async () => {
    const send = vi.fn();
    render(<BusRound view={view({ submissions: [{ playerId: "p1", submitted: true }] })} send={send} />);
    expect(screen.getByText("وصلت إجاباتك")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "إرسال" })).toBeNull();
  });

  it("زر أتوبيس يطلب تأكيدًا", async () => {
    const send = vi.fn();
    render(<BusRound view={view()} send={send} />);
    await userEvent.click(screen.getByRole("button", { name: "أتوبيس!" }));
    await userEvent.click(screen.getByRole("button", { name: "أيوه، أتوبيس" }));
    expect(send).toHaveBeenCalledWith({ type: "player:callBus" });
  });
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `pnpm --filter @casino/web test bus` — Expected: FAIL.

- [ ] **Step 3: نفّذ الواجهات**

- **BusGrid:** شبكة بطاقات، كل بطاقة `<label>` + `<input>`، الحرف المختار ثابت في العنوان، عدّاد تنازلي، زر «إرسال» معطّل لو كل الحقول فاضية. **الإرسال نهائي** (لا زر تعديل)؛ بعد الإرسال تظهر «وصلت إجاباتك» وتقفل الحقول، والخادم يرفض أي إرسال ثانٍ.
- **زر «أتوبيس!»:** أحمر كبير ثابت أسفل الشاشة، يفتح `ConfirmDialog` عربي، ثم يرسل `player:callBus` مرة واحدة ويقفل نفسه.
- **RoundTimer:** شريط تقدم + رقم ثانوي، يحمرّ في آخر ١٠ ثوانٍ، `aria-live="off"` لتفادي الإزعاج، ويصدر صوتًا فقط لو المستخدم فعّل الصوت (بدون صوت افتراضيًا).
- **حرف الجولة للحكم:** حقل `<input aria-label="الحرف">` بحرف واحد + زر «ابدأ السؤال»، ويُرسل `judge:setBusLetter` قبل `judge:startQuestion`.
- **LetterRaceRound:** حقل إضافة كلمة + قائمة chips قابلة للحذف قبل الإرسال، عدّاد «عدد الكلمات»، زر إرسال نهائي.
- **شاشة الحكم في الوضعين:** نفس الشبكة لكن للقراءة فقط + أزرار اعتماد/إلغاء لكل خلية/كلمة، وزر «اعتمد الكل»، وإحصائية فورية (عدد المقبولين، مجموع النقاط).
- **قبل الإغلاق:** الحكم يرى «٢ من ٣ أرسلوا» بأسماء اللاعبين؛ اللاعب يرى «مستنيين الباقي…».

- [ ] **Step 4: شغّل الاختبارات**

Run: `pnpm --filter @casino/web test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/pages/BusRound.tsx packages/web/src/pages/LetterRaceRound.tsx packages/web/src/components/BusGrid.tsx packages/web/src/components/LetterRaceInput.tsx packages/web/src/components/RoundTimer.tsx packages/web/test/bus.test.tsx
git commit -m "feat(web): bus grid and letter race with final submission and reveal judging"
```

---

### Task 24: الويب — رويال رامبل، الكشف، النتائج، والسؤال الفاصل

**Files:**
- Create: `packages/web/src/pages/{RumbleRound,Results}.tsx`
- Create: `packages/web/src/components/{RumblePanel,RevealList,TieBreakPanel}.tsx`
- Test: `packages/web/test/rumble.test.tsx`

**Interfaces:**
- Consumes: `view.submissions`, `view.rumble`, `view.players`, `view.round`.
- Produces: `RumblePanel({ view, send })`؛ `RevealList({ submissions, kind, onJudge })`؛ `Results({ players, winnerId, tied, onTieBreak, onRematch })`.

- [ ] **Step 1: اكتب الاختبارات**

```tsx
// packages/web/test/rumble.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RumbleRound } from "../src/pages/RumbleRound";
import { Results } from "../src/pages/Results";

const view = (over: any = {}) => ({
  code: "ABC123", state: "simultaneous_active", roundKind: "rumble",
  me: { id: "p1", name: "أحمد" },
  players: [
    { id: "p1", name: "أحمد", score: 0, isEliminated: false },
    { id: "p2", name: "سارة", score: 0, isEliminated: false },
    { id: "p3", name: "محمود", score: 0, isEliminated: true },
  ],
  question: { id: "q1", text: "ما هي عاصمة مصر؟", type: "capital" },
  submissions: [],
  settings: {},
  ...over,
});

describe("رويال رامبل", () => {
  it("يخفي إجابات الآخرين قبل الكشف", () => {
    render(<RumbleRound view={view({ submissions: [{ playerId: "p2", submitted: true }] })} send={vi.fn()} />);
    expect(screen.queryByText("أسوان")).toBeNull();
    expect(screen.getByText("سارة أرسلت")).toBeTruthy();
  });

  it("يعرض الإجابات المكررة بعد الكشف", () => {
    render(<RumbleRound view={view({
      state: "reveal",
      submissions: [
        { playerId: "p1", answer: "القاهرة", duplicate: true, eliminated: true },
        { playerId: "p2", answer: "قاهره", duplicate: true, eliminated: true },
      ],
    })} send={vi.fn()} />);
    expect(screen.getAllByText("مكررة")).toHaveLength(2);
  });

  it("يعرض الفايز والترتيب", () => {
    render(<Results players={view().players} winnerId="p2" tied={[]} onTieBreak={vi.fn()} onRematch={vi.fn()} />);
    expect(screen.getByText("سارة")).toBeTruthy();
    expect(screen.getByText("الفايز")).toBeTruthy();
  });

  it("يعرض زر السؤال الفاصل عند التعادل", async () => {
    const onTieBreak = vi.fn();
    render(<Results players={view().players} winnerId={null} tied={["p1", "p2"]} onTieBreak={onTieBreak} onRematch={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "سؤال فاصل" }));
    expect(onTieBreak).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `pnpm --filter @casino/web test rumble` — Expected: FAIL.

- [ ] **Step 3: نفّذ الواجهات**

- **RumbleRound (لاعب):** حقل إجابة كبير `<input aria-label="إجابتك">` + زر إرسال نهائي، «إجابتك وصلت» بعد الإرسال، ولا يظهر نص أي لاعب آخر قبل `reveal`. بعد الكشف: بطاقة لكل لاعب مع اسمه وإجابته ووسم «مكررة» أو «غلط» أو «صح» وحالة «خرج»، بألوان وحركة خفيفة.
- **RumbleRound (حكم):** قائمة الإرسالات + إمكانية تصحيح حكم لاعب (`judge:setRumbleVerdict`) قبل «اعتمد النتيجة»، وملخص «هيخرج: فلان، فلان» قبل التأكيد.
- **RevealList:** يدعم `bus` (خلايا) و`letter_race` (كلمات) و`rumble` (إجابات)؛ كل عنصر زر تبديل مقبول/مرفوض بـ`aria-pressed`، ويعرض مجموع النقاط المتوقع لحظيًا.
- **Results:** ترتيب تنازلي، ميداليات ذهب/فضة/برونز، إظهار النقاط السالبة بلون أحمر، «الفايز» على الأول لو `winnerId`، وزر «سؤال فاصل» لو `tied.length > 1`، وزر «إعادة جولة» (يرجع اللوبي بنفس اللاعبين).
- **TieBreakPanel:** يوضح أن السؤال لا يمنح نقاطًا إلا نقطة الفوز، ويعرض المتعادلين فقط.
- **بث الإقصاء:** `aria-live="assertive"` عند خروج لاعب، ورسالة نصية «فلان خرج» حتى لا يعتمد على اللون فقط.

- [ ] **Step 4: شغّل الاختبارات**

Run: `pnpm --filter @casino/web test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/pages/RumbleRound.tsx packages/web/src/pages/Results.tsx packages/web/src/components/RumblePanel.tsx packages/web/src/components/RevealList.tsx packages/web/src/components/TieBreakPanel.tsx packages/web/test/rumble.test.tsx
git commit -m "feat(web): rumble reveal, eliminations, final results and tie breaker"
```

---

### Task 25: الويب — لوحة إدارة الأسئلة والميديا

**Files:**
- Create: `packages/web/src/pages/AdminQuestions.tsx`
- Create: `packages/web/src/components/{QuestionForm,ImportPanel,MediaCard}.tsx`
- Test: `packages/web/test/adminQuestions.test.tsx`

**Interfaces:**
- Consumes: `api` (مع `x-admin-key`).
- Produces: صفحة `/admin/questions` بحماية مفتاح محلي في `sessionStorage` (`casino.adminKey`).

- [ ] **Step 1: اكتب الاختبارات**

```tsx
// packages/web/test/adminQuestions.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminQuestions } from "../src/pages/AdminQuestions";

const api = {
  list: vi.fn(async () => ({ items: [{ id: "q1", text: "عاصمة مصر؟", answer: "القاهرة", categorySlug: "geography", type: "capital", isActive: true }], total: 1 })),
  importJson: vi.fn(async () => ({ inserted: 2, skipped: 0, errors: [] })),
  setActive: vi.fn(async () => ({})),
};

describe("إدارة الأسئلة", () => {
  it("تطلب مفتاح الأدمن أولًا", () => {
    render(<AdminQuestions api={api as any} />);
    expect(screen.getByLabelText("مفتاح الأدمن")).toBeTruthy();
  });

  it("تعرض الأسئلة بعد إدخال المفتاح", async () => {
    render(<AdminQuestions api={api as any} />);
    await userEvent.type(screen.getByLabelText("مفتاح الأدمن"), "test-key");
    await userEvent.click(screen.getByRole("button", { name: "دخول" }));
    expect(await screen.findByText("عاصمة مصر؟")).toBeTruthy();
  });

  it("تستورد JSON وتعرض تقريرًا", async () => {
    render(<AdminQuestions api={api as any} initialKey="test-key" />);
    await userEvent.click(await screen.findByRole("button", { name: "استيراد" }));
    await userEvent.type(screen.getByLabelText("أسئلة JSON"), '[{"text":"س"}]');
    await userEvent.click(screen.getByRole("button", { name: "نفّذ الاستيراد" }));
    expect(await screen.findByText("تمت إضافة 2")).toBeTruthy();
  });

  it("تعرض credit الصورة", async () => {
    render(<AdminQuestions api={{ ...api, list: vi.fn(async () => ({ items: [{ id: "q2", text: "علم مصر", answer: "مصر", type: "flag", mediaUrl: "/media/flags/eg.svg", mediaCredit: "Wikimedia — Public Domain", isActive: true }], total: 1 })) } as any} initialKey="k" />);
    expect(await screen.findByText(/Wikimedia — Public Domain/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `pnpm --filter @casino/web test adminQuestions` — Expected: FAIL.

- [ ] **Step 3: نفّذ اللوحة**

- **الدخول:** حقل مفتاح + زر «دخول»، يُخزَّن في `sessionStorage`، وأي `401` يمسحه ويعيد الشاشة.
- **القائمة:** جدول/كروت، فلاتر تصنيف/نوع/مفعّل، بحث نصي، ترقيم صفحات، إجمالي، وأزرار «تعديل»/«تعطيل».
- **النموذج:** كل حقول `Question` مع قوائم منسدلة للتصنيف والنوع والصعوبة، إدخال الاختيارات الأربعة، `correctIndex`، `acceptedAnswers` (سطر لكل بديل)، `mediaUrl`/`mediaCredit`، معاينة الصورة، وتحقق فوري بنفس قواعد `validateQuestion`.
- **الاستيراد:** tab لـJSON وتاب لـCSV، عرض مثال للترويسة، زر تنفيذ، وتقرير `inserted/skipped/errors` بالعربية مع رقم السطر.
- **الميديا:** `MediaCard` واحد مشترك بين الحكم واللاعب والأدمن، ويعرض `mediaCredit` دائمًا ولا يخفيها على الموبايل.
- **تحذير:** رفع صورة بلا credit يمنع الحفظ برسالة «لازم مصدر وترخيص للصورة».

- [ ] **Step 4: شغّل الاختبارات**

Run: `pnpm --filter @casino/web test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/pages/AdminQuestions.tsx packages/web/src/components packages/web/test/adminQuestions.test.tsx
git commit -m "feat(web): admin question management with media credits and import reports"
```

---

### Task 26: الصقل — الإتاحة، الاستجابة، النسخ، والحركة

**Files:**
- Modify: كل صفحات `packages/web/src/pages/*` والمكوّنات
- Create: `packages/web/test/a11y.spec.ts` (Playwright + axe)
- Create: `packages/web/test/responsive.spec.ts`

**Interfaces:**
- Consumes: كل ما سبق.
- Produces: لا واجهات جديدة؛ تحسينات سلوكية ومظهرية فقط.

- [ ] **Step 1: اكتب اختبارات الإتاحة والاستجابة**

```ts
// packages/web/test/a11y.spec.ts
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const path of ["/", "/join", "/room/ABC123"]) {
  test(`لا مخالفات WCAG A/AA في ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations).toEqual([]);
  });
}

test("الحركة تحترم prefers-reduced-motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const duration = await page.getByTestId("bell").evaluate((el) => getComputedStyle(el).animationDuration);
  expect(duration).toBe("0s");
});
```

```ts
// packages/web/test/responsive.spec.ts
import { test, expect } from "@playwright/test";

for (const width of [360, 768, 1280]) {
  test(`لا تمرير أفقي عند ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });
}
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `pnpm --filter @casino/web exec playwright test a11y responsive` — Expected: FAIL على الأقل في تباين أو تمرير أفقي.

- [ ] **Step 3: نفّذ الصقل**

- **تباين:** النص الكريمي على الداكن ≥ 7:1، الذهبي على الداكن ≥ 4.5:1، الأحمر للتحذير ≥ 4.5:1 مع حدود سوداء للنص الكبير. لا تعتمد على اللون وحده: أضف نصًا/أيقونة لكل حالة.
- **تركيز:** `:focus-visible` بحلقة ذهبية 3px + إزاحة 2px على كل عنصر تفاعلي، وترتيب Tab منطقي من أعلى لأسفل.
- **قارئ الشاشة:** `aria-live="assertive"` لإعلان الإقصاء والفايز، `polite` للنقاط والإشعارات، `aria-label` لكل زر أيقونة، و`role="timer"` لعدّاد الجرس مع تحديث كل ثانية (لا كل 100ms).
- **اللمس:** كل هدف ≥ 44×44px، مسافة ≥ 8px بين أزرار الخطر.
- **RTL:** استخدم خصائص منطقية (`margin-inline-start`, `inset-inline-end`, `text-align: start`) وليس `left/right`، واختبر الأرقام بـ`font-variant-numeric: tabular-nums`.
- **الاستجابة:** الحكم على تابلت أفقي بعمودين، اللاعب على الموبايل بعمود واحد، الجرس يتقلص بـ`clamp(180px, 42vw, 280px)`، والشبكة `grid-template-columns: repeat(auto-fit, minmax(140px, 1fr))`.
- **النسخ:** راجع كل نص: لا إنجليزي ظاهر، أخطاء محددة («الكود مش موجود»، «الغرفة بدأت خلاص»)، أزرار بأفعال واضحة، وشرح قصير لكل Power-Up.
- **الحالات:** لكل شاشة حالة تحميل (skeleton بسيط)، حالة فاضية برسالة، وحالة خطأ بزر «حاول تاني». لا شاشة بيضاء أبدًا.
- **الأداء:** خطوط محلية `font-display: swap`، صور `loading="lazy"` مع `width/height`، وعدم تحميل أصوات.

- [ ] **Step 4: شغّل الاختبارات**

Run: `pnpm --filter @casino/web exec playwright test a11y responsive` — Expected: PASS بلا مخالفات.

- [ ] **Step 5: Commit**

```bash
git add packages/web
git commit -m "polish(web): accessibility, RTL layout, responsive screens and reduced motion"
```

---

### Task 27: E2E، Docker، والنشر على Railway

**Files:**
- Create: `playwright.config.ts`, `packages/web/test/e2e/full-game.spec.ts`
- Create: `Dockerfile`, `.dockerignore`, `railway.json`
- Create: `README.md`, `docs/deploy-railway.md`
- Modify: `package.json` (سكربتات `start`, `migrate`, `test:e2e`)

**Interfaces:**
- Consumes: كل ما سبق.
- Produces: صورة Docker واحدة تخدم API + Socket.IO + ملفات الويب، ونشر يعمل على Railway.

- [ ] **Step 1: اكتب سيناريو E2E كامل**

```ts
// packages/web/test/e2e/full-game.spec.ts
import { test, expect, chromium } from "@playwright/test";

test("حكم + لاعبان: جرس، كارت، أتوبيس، رويال رامبل، نتائج", async ({ baseURL }) => {
  const browser = await chromium.launch();
  const judge = await browser.newContext();
  const p1 = await browser.newContext();
  const p2 = await browser.newContext();
  const j = await judge.newPage();
  const a = await p1.newPage();
  const b = await p2.newPage();

  await j.goto(baseURL!);
  await j.getByRole("button", { name: "اعمل غرفة" }).click();
  const code = await j.getByTestId("room-code").innerText();
  expect(code).toMatch(/^[A-Z2-9]{6}$/);

  for (const [page, name] of [[a, "أحمد"], [b, "سارة"]] as const) {
    await page.goto(`${baseURL}/join/${code}`);
    await page.getByLabel("اسمك").fill(name);
    await page.getByRole("button", { name: "دخول" }).click();
    await expect(page.getByText("انتظر باقي اللاعبين")).toBeVisible();
  }

  await j.getByRole("button", { name: "ابدأ اختيار الكروت" }).click();
  await a.getByRole("button", { name: /شنك الحرمية/ }).click();
  await b.getByRole("button", { name: /كوبري/ }).click();
  await expect(j.getByText("٢ / ٣")).toBeVisible();
  await j.getByRole("button", { name: "ابدأ اللعبة" }).click();

  await j.getByRole("button", { name: "جرس" }).click();
  await j.getByRole("button", { name: "ابدأ الجولة" }).click();
  await j.getByRole("button", { name: "اسحب سؤال" }).click();
  await j.getByRole("button", { name: "ابدأ السؤال" }).click();
  await a.getByRole("button", { name: /دوس الجرس/ }).click();
  await expect(j.getByText("أحمد")).toBeVisible();
  await j.getByRole("button", { name: "اقفل الجرس" }).click();
  await j.getByRole("button", { name: "أحمد" }).click();
  await j.getByRole("button", { name: "صح" }).click();
  await expect(a.getByText("١")).toBeVisible();

  await j.getByRole("button", { name: "إنذار أصفر لأحمد" }).click();
  await j.getByRole("button", { name: "الجولة التالية" }).click();

  await j.getByRole("button", { name: "أتوبيس" }).click();
  await j.getByRole("button", { name: "ابدأ الجولة" }).click();
  await j.getByLabel("الحرف").fill("س");
  await j.getByRole("button", { name: "ابدأ السؤال" }).click();
  await a.getByLabel("اسم").fill("سمك");
  await a.getByRole("button", { name: "إرسال" }).click();
  await b.getByRole("button", { name: "أتوبيس!" }).click();
  await j.getByRole("button", { name: "اكشف الإجابات" }).click();
  await j.getByRole("button", { name: "اعتمد الكل" }).click();
  await j.getByRole("button", { name: "الجولة التالية" }).click();
  await j.getByRole("button", { name: "الجولة التالية" }).click();

  await j.getByRole("button", { name: "رويال رامبل" }).click();
  await j.getByRole("button", { name: "ابدأ الجولة" }).click();
  await j.getByRole("button", { name: "اسحب سؤال" }).click();
  await j.getByRole("button", { name: "ابدأ السؤال" }).click();
  const correct = await j.getByTestId("question-answer").innerText();
  await a.getByLabel("إجابتك").fill(correct);
  await b.getByLabel("إجابتك").fill("إجابة غلط تمامًا");
  await a.getByRole("button", { name: "إرسال" }).click();
  await b.getByRole("button", { name: "إرسال" }).click();
  await j.getByRole("button", { name: "اقفل الإرسال" }).click();
  await j.getByRole("button", { name: "اعتمد النتيجة" }).click();
  await expect(j.getByText("خرج").first()).toBeVisible();
  await expect(j.getByTestId("score-p1")).toHaveText("٢");
  await j.getByRole("button", { name: "الجولة التالية" }).click();
  await j.getByRole("button", { name: "إنهاء اللعبة" }).click();
  await expect(j.getByText("النتيجة النهائية")).toBeVisible();

  await browser.close();
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

Run: `pnpm test:e2e` — Expected: FAIL قبل تجهيز `playwright.config.ts` وتشغيل السيرفر.

- [ ] **Step 3: جهّز التشغيل والنشر**

- `playwright.config.ts`: `webServer` يشغّل `pnpm build && pnpm start` على `PORT=3100` مع `DATABASE_URL_TEST`، و`reuseExistingServer: !process.env.CI`، وثلاثة متصفحات فقط على CI.
- `Dockerfile` متعدد المراحل:
  1. `node:22-alpine` + `corepack enable` + `pnpm install --frozen-lockfile`.
  2. `pnpm --filter @casino/server exec prisma generate` ثم `pnpm build` لكل الحزم.
  3. مرحلة تشغيل نحيفة تنسخ `dist` و`node_modules` الإنتاجية و`web/dist`.
- أمر البدء في Railway: `pnpm --filter @casino/server exec prisma migrate deploy && node packages/server/dist/index.js`.
- `railway.json`: `build.builder = "DOCKERFILE"`, `deploy.healthcheckPath = "/api/health"`, `deploy.restartPolicyType = "ON_FAILURE"`، ونسخة واحدة (`numReplicas: 1`).
- متغيرات البيئة المطلوبة: `DATABASE_URL`, `ADMIN_KEY`, `TOKEN_SECRET`, `PORT`, `CORS_ORIGIN`, `NODE_ENV=production`.
- `docs/deploy-railway.md` بالعربية: إنشاء المشروع، إضافة Postgres، ضبط المتغيرات، `railway up`، متابعة اللوجز، واختبار الدخول من ٣ أجهزة.
- `README.md`: المتطلبات، أوامر التشغيل المحلي، `pnpm test`, `pnpm test:e2e`، كيفية إضافة أسئلة، وقواعد اللعبة باختصار.

- [ ] **Step 4: شغّل التحقق الكامل**

Run: `pnpm lint && pnpm test && pnpm test:e2e` — Expected: كل الاختبارات PASS.

ثم على الرابط المنشور:

Run: `curl -f https://<railway-domain>/api/health` — Expected: `{"ok":true}`، وافتح الرابط من متصفحين واعمل غرفة حقيقية.

- [ ] **Step 5: Commit ووسم الإصدار**

```bash
git add playwright.config.ts packages/web/test/e2e Dockerfile .dockerignore railway.json README.md docs/deploy-railway.md package.json
git commit -m "test: end-to-end full game, docker image and railway deployment config"
git tag v0.1.0
```

---

## التحقق النهائي قبل التسليم

- [ ] `pnpm lint` بلا أخطاء.
- [ ] `pnpm test` أخضر بالكامل (shared + game-core + questions + server + web).
- [ ] `pnpm test:e2e` أخضر بثلاث جلسات متصفح.
- [ ] غرفة حقيقية على Railway: حكم + لاعبان من أجهزة مختلفة، ٥ أسئلة جرس + جولة أتوبيس + جولة رويال رامبل.
- [ ] محاولة اللاعب الرابع مرفوضة.
- [ ] محاولة حجز نفس الكارت مرفوضة.
- [ ] DTO اللاعب لا يحتوي الإجابة (يفحصه اختبار projection).
- [ ] كل صورة لها credit ظاهر.
- [ ] PWA قابلة للتثبيت وتعمل offline للهيكل الأساسي.
- [ ] لا نص إنجليزي ظاهر في أي شاشة.
- [ ] نسخة احتياطية من `DATABASE_URL` موثّقة، والـ`ADMIN_KEY` ليس افتراضيًا.
