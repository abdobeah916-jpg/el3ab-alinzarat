import { useState } from "react";
import { BusGrid } from "../components/BusGrid";

export function BusRound({ view, send }: { view?: any; send?: any } = {}) {
  const categories = view?.settings?.busCategories ?? ["اسم", "بلد", "حيوان"];
  const [values, setValues] = useState<Record<string, string>>({});
  const [confirmBus, setConfirmBus] = useState(false);
  const submitted = (view?.submissions ?? []).some((s: any) => s.playerId === view?.me?.id);
  const closed = view?.state === "submissions_closed" || view?.state === "reveal";

  return (
    <div>
      <div data-testid="bus-letter">{view?.busLetter ?? "س"}</div>
      <BusGrid categories={categories} values={values} onChange={(c, v) => setValues({ ...values, [c]: v })} disabled={submitted || closed} />
      {submitted ? <div>وصلت إجاباتك</div> : (
        <button onClick={() => send?.({ type: "player:submitRound", payload: { kind: "bus", answers: values } })}>إرسال</button>
      )}
      {!confirmBus ? <button aria-label="أتوبيس!" onClick={() => setConfirmBus(true)}>أتوبيس!</button> : (
        <button aria-label="أيوه، أتوبيس" onClick={() => send?.({ type: "player:callBus" })}>أيوه، أتوبيس</button>
      )}
    </div>
  );
}
