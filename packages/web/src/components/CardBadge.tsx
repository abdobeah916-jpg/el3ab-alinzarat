export function CardBadge({ card }: { card: "yellow" | "red" }) {
  return <span>{card === "yellow" ? "أصفر" : "أحمر"}</span>;
}
