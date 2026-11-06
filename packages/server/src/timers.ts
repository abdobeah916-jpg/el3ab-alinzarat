export class RoomTimers {
  private timers = new Map<string, any>();
  constructor(private deps: { onDeadline: (code: string, kind: string) => void }) {}
  schedule(code: string, state: any): void {
    this.cancel(code);
    const open = state?.state === "question_active" && state?.buzzer?.isOpen;
    const submitting = state?.state === "simultaneous_active";
    const deadline = open ? state.buzzer?.deadline : submitting ? state.submissionsClosedAt : null;
    if (deadline == null) return;
    const kind = open ? "buzzer" : "submissions";
    const ms = Math.max(0, deadline - Date.now());
    this.timers.set(code, setTimeout(() => {
      this.timers.delete(code);
      this.deps.onDeadline(code, kind);
    }, ms));
  }
  cancel(code: string): void {
    const t = this.timers.get(code);
    if (t) clearTimeout(t);
    this.timers.delete(code);
  }
  async fireNow(_code: string): Promise<void> {}
}
