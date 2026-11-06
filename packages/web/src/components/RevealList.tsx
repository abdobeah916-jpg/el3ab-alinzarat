export function RevealList({ submissions, onJudge }: { submissions: any[]; onJudge?: any }) {
  return (
    <ul className="rumble__list">
      {(submissions ?? []).map((s: any) => (
        <li className="rumble__item" key={s.playerId}>
          <span>{s.playerId}</span>
          <span className="muted" style={{ fontSize: 13 }}>{JSON.stringify(s.payload)}</span>
        </li>
      ))}
    </ul>
  );
}
