export function BellButton({ enabled, onPress, myRank }: { enabled: boolean; onPress: () => void; myRank: number | null }) {
  return (
    <button data-testid="bell" onPointerDown={onPress} disabled={!enabled} aria-label={enabled ? "دوس الجرس" : "الجرس مقفول"}>
      {myRank ? `أنت الأول ${myRank}` : "دوس الجرس"}
    </button>
  );
}
