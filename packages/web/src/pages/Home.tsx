import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRoom } from "../lib/api";
import { onlineEnabled } from "../lib/api";
import { saveSession } from "../lib/tokenStore";
import { BellIcon, ChipIcon, ArrowIcon, CopyIcon, UsersIcon } from "../components/icons";

const OFFLINE_MESSAGE = "الغرف الأونلاين محتاجة سيرفر — استخدم «لعب فردي» دلوقتي.";

export function Home() {
  const nav = useNavigate();
  const online = onlineEnabled();
  const [room, setRoom] = useState<{ code: string; recovery: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function makeRoom() {
    if (!online) {
      setError(OFFLINE_MESSAGE);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await createRoom();
      saveSession({ role: "judge", code: data.roomCode, token: data.judgeToken });
      setRoom({ code: data.roomCode, recovery: data.judgeRecoveryCode });
    } catch {
      setError("معرفناش نعمل غرفة، جرّب تاني.");
    } finally {
      setBusy(false);
    }
  }

  function openJoin() {
    if (!online) {
      setError(OFFLINE_MESSAGE);
      return;
    }
    nav("/join");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${location.origin}/join/${room?.code ?? ""}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  return (
    <div className="screen home page-enter">
      <div className="home__top">
        <span className="brand">
          <span className="brand__mark"><BellIcon /></span>
          كازينو الألعاب
        </span>
        <a className="btn btn--ghost" href="/join">عندك كود؟</a>
      </div>

      <div className="home__hero">
        <div>
          <span className="eyebrow">حكم واحد · ٣ لاعبين · ليلة واحدة</span>
          <h1 className="title-xl home__title">
            الجرس في إيدك،
            <br />
            <span className="gold-text">والفلوس على الطاولة.</span>
          </h1>
          <p className="home__sub">
            لعبة مسابقات فيها كروت إنذار، أسلحة سرية، و٣ أطوار جولة. القاضي بيقرأ السؤال،
            وأنت أول واحد يدوس الجرس.
          </p>

          <div className="home__cta">
            <button type="button" className="btn btn--gold btn--lg" onClick={makeRoom} disabled={busy}>
              <BellIcon />
              {busy ? "بيجهّز الطاولة…" : "اعمل غرفة كحكم"}
            </button>
            <button type="button" className="btn btn--lg home__cta-local" onClick={() => nav("/local")}>
              <UsersIcon />
              لعب فردي
            </button>
            <button type="button" className="btn btn--lg btn--ghost" onClick={openJoin}>
              انضم كلاعب
              <ArrowIcon />
            </button>
          </div>

          {!online && (
            <p className="home__offline" role="note">
              الأونلاين محتاج سيرفر مش منشور على النسخة دي — استخدم <b>«لعب فردي»</b>.
            </p>
          )}

          <p className="muted home__cta-note">
            <b>«لعب فردي»</b> يعني طاولة على تليفون واحد — الحكم بيدخل اللاعبين بنفسه ويحسب النقط والكروت من نفس الشاشة.
          </p>

          {error && <p className="form-error" role="alert" style={{ marginTop: 14 }}>{error}</p>}

          {room && (
            <div className="code-card" style={{ marginTop: 20 }}>
              <span className="eyebrow">الغرفة جاهزة</span>
              <div className="code-card__value" data-testid="room-code">{room.code}</div>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <button type="button" className="btn" onClick={copy}>
                  <CopyIcon />
                  {copied ? "اتنسخ" : "انسخ لينك الدعوة"}
                </button>
                <button type="button" className="btn btn--gold" onClick={() => nav(`/room/${room.code}`)}>
                  ادخل كحكم
                  <ArrowIcon />
                </button>
              </div>
              <p className="code-card__recovery">
                كود الاسترجاع (احفظه): <b>{room.recovery}</b>
              </p>
            </div>
          )}

          <div className="home__meta">
            <div><b>١٧ نوع سؤال</b>صور · صوت · كلام</div>
            <div><b>٣ أطوار</b>جرس · أتوبيس · رويال رامبل</div>
            <div><b>بدون تسجيل</b>كود غرفة وخلاص</div>
          </div>
        </div>

        <div className="table-scene" aria-hidden="true">
          <span className="table-scene__ring" />
          <span className="chip-float chip-float--a" />
          <span className="chip-float chip-float--b" />
          <div className="table-scene__inner">
            <span className="bell-mini"><BellIcon /></span>
            <span className="pill pill--gold" style={{ background: "rgba(8,6,4,.6)" }}>
              <ChipIcon style={{ width: 15, height: 15 }} /> الطاولة مستنية
            </span>
          </div>
        </div>
      </div>

      <div className="steps">
        <div className="step">
          <span className="step__num">٠١</span>
          <h3>اعمل غرفة</h3>
          <p>اختار الحكم، وخد كود من ٦ حروف وابعته لأصحابك.</p>
        </div>
        <div className="step">
          <span className="step__num">٠٢</span>
          <h3>اختار سلاحك</h3>
          <p>شنك، كوبري، أو سلم وتعبان — كل سلاح بيتاخد مرة واحدة.</p>
        </div>
        <div className="step">
          <span className="step__num">٠٣</span>
          <h3>دوس الجرس</h3>
          <p>أسرع إيد هي اللي بتجاوب. غلط؟ الكرت الأحمر مستنيك.</p>
        </div>
      </div>
    </div>
  );
}
