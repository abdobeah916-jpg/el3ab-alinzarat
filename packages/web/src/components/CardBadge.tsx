export function CardBadge({ card }: { card: "yellow" | "red" }) {
  return <span className={`tag ${card === "yellow" ? "tag--gold" : "tag--red"}`}>{card === "yellow" ? "أصفر" : "أحمر"}</span>;
}
