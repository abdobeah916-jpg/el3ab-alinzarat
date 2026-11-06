export const CATEGORIES = [
  { slug: "general", name: "معلومات عامة" },
  { slug: "sport", name: "رياضة" },
  { slug: "history", name: "تاريخ" },
  { slug: "geography", name: "جغرافيا" },
  { slug: "cinema", name: "أفلام ومسلسلات" },
  { slug: "music", name: "موسيقى" },
  { slug: "science", name: "علوم" },
  { slug: "culture", name: "ثقافة" },
  { slug: "egyptian-food", name: "أكل مصري" },
  { slug: "ramadan-series", name: "مسلسلات رمضان" },
  { slug: "national-songs", name: "أغاني وطنية" },
] as const;

export const ROUND_KINDS = [
  { kind: "buzzer", name: "جرس", desc: "القاضي يقرأ، وأول واحد يدوس بيجاوب." },
  { kind: "bus", name: "أتوبيس", desc: "حرف واحد، وكل اللاعبين بيكتبوا في نفس الوقت." },
  { kind: "letter_race", name: "أكتر كلمات", desc: "اكتب أكبر عدد كلمات بحرف معيّن." },
  { kind: "rumble", name: "رويال رامبل", desc: "إجابة واحدة للكل — الغلط أو المكرر بيخرّج." },
] as const;

export function categoryName(slug?: string | null): string {
  return CATEGORIES.find((c) => c.slug === slug)?.name ?? "معلومات عامة";
}
