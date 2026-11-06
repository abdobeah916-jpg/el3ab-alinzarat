import { BridgeIcon, LadderIcon, SkullIcon } from "./icons";

const DATA: Record<string, { name: string; desc: string; color: string; Icon: any }> = {
  shank: { name: "شنك الحرمية", desc: "اختار لاعب واخصم منه ٣ من غير ما ياخد باله.", color: "var(--shank)", Icon: SkullIcon },
  cobri: { name: "كوبري", desc: "اختار تصنيف السؤال الجاي وخلّي الكل يلعب عليه.", color: "var(--cobri)", Icon: BridgeIcon },
  salem: { name: "سلم وتعبان", desc: "جاوب بدل لاعب تاني: صح −٣ منه، غلط −١ منك.", color: "var(--salem)", Icon: LadderIcon },
};

export function PowerupCard({ powerup, state, disabled, onSelect }: { powerup: string; state?: string; disabled?: boolean; onSelect?: () => void }) {
  const data = DATA[powerup] ?? { name: powerup, desc: "", color: "var(--gold)", Icon: BridgeIcon };
  const { name, desc, color, Icon } = data;
  const taken = state === "reserved";
  return (
    <button
      type="button"
      className="powerup"
      style={{ ["--pw" as any]: color }}
      disabled={disabled}
      data-taken={taken ? "true" : "false"}
      data-mine={taken && !disabled ? "true" : "false"}
      onClick={onSelect}
      aria-label={name}
    >
      <span className="powerup__icon">
        <Icon />
      </span>
      <span className="powerup__name">{name}</span>
      <span className="powerup__desc">{desc}</span>
      <span className="powerup__state">{taken ? "محجوز" : state === "used" ? "اتستخدم" : "متاح"}</span>
    </button>
  );
}
