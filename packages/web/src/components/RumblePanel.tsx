export function RumblePanel({ view, send }: { view: any; send: any }) {
  return (
    <div>
      <h3>رويال رامبل</h3>
      <ol>
        {(view?.players ?? []).map((p: any) => (
          <li key={p.id}>{p.name} {p.isEliminated ? "خرج" : "باقي"}</li>
        ))}
      </ol>
    </div>
  );
}
