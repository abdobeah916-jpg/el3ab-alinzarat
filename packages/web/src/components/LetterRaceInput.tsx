export function LetterRaceInput({ words, onChange, disabled }: { words: string[]; onChange: (w: string[]) => void; disabled?: boolean }) {
  return (
    <div>
      <ul>{words.map((w, i) => <li key={i}>{w}</li>)}</ul>
      <input placeholder="اكتب كلمة" disabled={disabled} onKeyDown={(e) => { if (e.key === "Enter") { onChange([...words, (e.target as HTMLInputElement).value]); (e.target as HTMLInputElement).value = ""; } }} />
    </div>
  );
}
