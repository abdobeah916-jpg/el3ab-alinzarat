export function normalizeAnswer(raw: string): string {
  let s = raw.trim();
  s = s.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u0640]/g, "");
  s = s.replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي");
  s = s.toLowerCase();
  s = s.replace(/\bال/g, " ").replace(/^ال/, " ");
  s = s.replace(/[^\p{L}\p{N}]+/gu, "");
  return s;
}

export function answersMatch(given: string, canonical: string, accepted: string[] = []): boolean {
  const normalizedGiven = normalizeAnswer(given);
  const normalizedCanonical = normalizeAnswer(canonical);
  if (normalizedGiven === "" || normalizedCanonical === "") return false;
  if (normalizedGiven === normalizedCanonical) return true;
  return accepted.some((a) => normalizeAnswer(a) === normalizedGiven);
}

export function groupDuplicates(entries: { playerId: string; answer: string }[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const entry of entries) {
    const key = normalizeAnswer(entry.answer);
    map.set(key, [...(map.get(key) ?? []), entry.playerId]);
  }
  return map;
}
