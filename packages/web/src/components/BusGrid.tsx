export function BusGrid({ categories, values, onChange, disabled }: { categories: string[]; values: Record<string, string>; onChange: (cat: string, v: string) => void; disabled?: boolean }) {
  return (
    <div className="bus__grid">
      {categories.map((cat) => (
        <label className="bus__cell" key={cat}>
          <span>{cat}</span>
          <input aria-label={cat} value={values[cat] ?? ""} disabled={disabled} onChange={(e) => onChange(cat, e.target.value)} />
        </label>
      ))}
    </div>
  );
}
