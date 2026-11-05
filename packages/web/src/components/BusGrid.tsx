export function BusGrid({ categories, values, onChange, disabled }: { categories: string[]; values: Record<string, string>; onChange: (cat: string, v: string) => void; disabled?: boolean }) {
  return (
    <div>
      {categories.map((cat) => (
        <label key={cat}>
          {cat}
          <input aria-label={cat} value={values[cat] ?? ""} disabled={disabled} onChange={(e) => onChange(cat, e.target.value)} />
        </label>
      ))}
    </div>
  );
}
