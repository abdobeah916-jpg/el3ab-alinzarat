import { useState } from "react";
import { BellIcon } from "./icons";
import { formatNumber } from "../lib/format";

export function BellButton({ enabled, onPress, myRank }: { enabled: boolean; onPress: () => void; myRank: number | null }) {
  const [ripple, setRipple] = useState(0);
  const press = () => {
    if (!enabled) return;
    setRipple((n) => n + 1);
    onPress();
  };
  const label = myRank === 1 ? "أنت الأول" : myRank ? `أنت رقم ${formatNumber(myRank)}` : "دوس الجرس";
  return (
    <button
      data-testid="bell"
      type="button"
      className="bell"
      onPointerDown={press}
      disabled={!enabled}
      aria-label={enabled ? "دوس الجرس" : "الجرس مقفول"}
    >
      {ripple > 0 && <span key={ripple} className="bell__ripple" aria-hidden="true" />}
      <BellIcon />
      <span className="bell__label">{label}</span>
    </button>
  );
}
