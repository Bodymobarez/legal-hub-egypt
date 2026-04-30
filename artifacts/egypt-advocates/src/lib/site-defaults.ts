/**
 * Hardcoded site defaults — used as fallback when the API is unavailable
 * (e.g. static Netlify deployment with no backend).
 */
export const SITE_DEFAULTS = {
  nameAr:     "مكتب محمد عثمان للمحاماة",
  nameEn:     "Mohamed A. Osaman Law Office",
  taglineAr:  "حلول قانونية قابلة للتنفيذ – خبرة وثقة",
  taglineEn:  "Actionable Legal Solutions – Experience & Trust",
  addressAr:  "الكوثر الجديد - منطقة البنوك - امام HSBC - أعلي بست واي - الدور الرابع - مكتب ٢١ - الغردقة",
  addressEn:  "Al Kawthar Al Jadid District / Banking Area / In front of HSBC / Above Best Way / 4th Floor / Office No. 21 - Hurghada",
  phone:      "+2 0122 7655 853",
  email:      "info@egyptadvocates.com",
} as const;
