export function RevealList({ submissions, onJudge }: { submissions: any[]; onJudge?: any }) {
  return (
    <ul>
      {(submissions ?? []).map((s: any) => (
        <li key={s.playerId}>{s.playerId}: {JSON.stringify(s.payload)}</li>
      ))}
    </ul>
  );
}
