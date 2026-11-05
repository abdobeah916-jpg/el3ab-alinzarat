export function Results({ players, winnerId, tied, onTieBreak, onRematch }: { players: any[]; winnerId: string | null; tied: string[]; onTieBreak: () => void; onRematch: () => void }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return (
    <div>
      <h2>النتيجة النهائية</h2>
      <ol>
        {sorted.map((p) => (
          <li key={p.id}>{p.name} {winnerId === p.id ? "الفايز" : ""}</li>
        ))}
      </ol>
      {tied.length > 1 && <button onClick={onTieBreak}>سؤال فاصل</button>}
      <button onClick={onRematch}>إعادة جولة</button>
    </div>
  );
}
