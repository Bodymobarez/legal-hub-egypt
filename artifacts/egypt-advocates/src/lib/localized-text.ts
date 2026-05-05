/** Multi-line content from API/localized fields — never throws on null/odd types. */
export function localizedParagraphs(
  language: "ar" | "en",
  arRaw: unknown,
  enRaw: unknown,
): string[] {
  const norm = (v: unknown): string => {
    if (v == null) return "";
    if (typeof v === "string") return v.trim();
    return String(v).trim();
  };
  const ar = norm(arRaw);
  const en = norm(enRaw);
  const chosen = language === "ar" ? ar || en : en || ar;
  if (!chosen) return [];
  try {
    return chosen
      .split(/\r?\n/)
      .map((p) => p.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}
