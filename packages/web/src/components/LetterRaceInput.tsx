export function LetterRaceInput({ words, onChange, disabled }: { words: string[]; onChange: (w: string[]) => void; disabled?: boolean }) {
  return (
    <div className="stack">
      <ul className="rumble__list">
        {words.map((w, i) => <li className="rumble__item" key={i}>{w}</li>)}
      </ul>
      <input
        className="input"
        placeholder="اكتب كلمة واضغط Enter"
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onChange([...words, (e.target as HTMLInputElement).value]);
            (e.target as HTMLInputElement).value = "";
          }
        }}
      />
    </div>
  );
}
