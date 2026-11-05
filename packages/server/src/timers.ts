export class RoomTimers {
  private timers = new Map<string, any>();
  constructor(private deps: { onDeadline: (code: string, kind: string) => void }) {}
  schedule(code: string, state: any): void {
    this.cancel(code);
    const deadline = state.buzzer?.deadline ?? state.submissionsClosedAt ?? null;
    if (deadline == null) return;
    const ms = Math.max(0, deadline - Date.now());
    const kind = state.buzzer?.isOpen ? "buzzer" : "submissions";
    this.timers.set(code, setTimeout(() => this.deps.onDeadline(code, kind), ms));
  }
  cancel(code: string): void { const t = this.timers.get(code); if (t) clearTimeout(t); this.timers.delete(code); }
  async fireNow(_code: string): Promise<void> {}
}
