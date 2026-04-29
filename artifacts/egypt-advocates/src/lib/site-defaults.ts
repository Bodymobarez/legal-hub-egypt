/**
 * Hardcoded site defaults — used as fallback when the API is unavailable
 * (e.g. static Netlify deployment with no backend).
 */
export const SITE_DEFAULTS = {
  nameAr:     "مكتب محمد عثمان للمحاماة",
  nameEn:     "Mohamed A. Osaman Law Office",
  taglineAr:  "حلول قانونية قابلة للتنفيذ – خبرة وثقة",
  taglineEn:  "Actionable Legal Solutions – Experience & Trust",
  addressAr:  "الكوثر الجديد – منطقة البنوك – أمام HSBC – أعلى بست واي – الدور الرابع، مكتب 21 – الغردقة",
  addressEn:  "Al Kawthar Al Jadid, Banking Area, Opposite HSBC, Above Best Way, 4th Floor, Office 21, Hurghada",
  phone:      "+2 0122 7655 853",
  email:      "info@egyptadvocates.com",
} as const;
