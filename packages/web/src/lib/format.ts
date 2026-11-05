export function formatNumber(n: number): string {
  return new Intl.NumberFormat("ar-EG").format(n);
}
export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return `${formatNumber(mm)}:${formatNumber(ss).padStart(2, "٠")}`;
}
