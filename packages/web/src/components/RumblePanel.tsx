export function RumblePanel({ view, send }: { view: any; send: any }) {
  return (
    <div className="rumble">
      <h3 style={{ fontSize: 16 }}>رويال رامبل</h3>
      <ul className="rumble__list">
        {(view?.players ?? []).map((p: any) => (
          <li className="rumble__item" key={p.id} data-out={p.isEliminated ? "true" : "false"}>
            <span>{p.name}</span>
            <span className={p.isEliminated ? "tag tag--red" : "tag tag--green"}>{p.isEliminated ? "خرج" : "فاضل"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
