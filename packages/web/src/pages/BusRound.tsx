import { useState } from "react";
import { BusGrid } from "../components/BusGrid";

export function BusRound({ view, send }: { view?: any; send?: any } = {}) {
  const categories = view?.settings?.busCategories ?? ["اسم", "بلد", "حيوان"];
  const [values, setValues] = useState<Record<string, string>>({});
  const [confirmBus, setConfirmBus] = useState(false);
  const submitted = (view?.submissions ?? []).some((s: any) => s.playerId === view?.me?.id);
  const closed = view?.state === "submissions_closed" || view?.state === "reveal";

  return (
    <div className="bus">
      <div className="bus__letter" data-testid="bus-letter">{view?.busLetter ?? "س"}</div>
      <BusGrid categories={categories} values={values} onChange={(c, v) => setValues({ ...values, [c]: v })} disabled={submitted || closed} />
      {submitted ? (
        <div className="console__hint"><span>وصلت إجاباتك</span><span className="muted">— استنى باقي اللاعبين أو الحكم.</span></div>
      ) : (
        <button type="button" className="btn btn--gold btn--block" onClick={() => send?.({ type: "player:submitRound", payload: { kind: "bus", answers: values } })} disabled={closed}>
          إرسال
        </button>
      )}
      {!confirmBus ? (
        <button type="button" className="btn btn--danger btn--block" aria-label="أتوبيس!" onClick={() => setConfirmBus(true)}>
          أتوبيس!
        </button>
      ) : (
        <button type="button" className="btn btn--danger btn--block" aria-label="أيوه، أتوبيس" onClick={() => send?.({ type: "player:callBus" })}>
          أيوه، أتوبيس
        </button>
      )}
    </div>
  );
}
