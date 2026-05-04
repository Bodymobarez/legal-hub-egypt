/**
 * Page Editor — schema, persistence and React hook for the
 * Super Admin's "Visual Section Manager".
 *
 * Today this powers the home page. Every section can be:
 *   • Toggled visible / hidden
 *   • Reordered relative to siblings
 *   • Re-styled (background, text, button colors, alignment, width, padding)
 *   • Re-worded per language (eyebrow / title / subtitle / 2× CTAs)
 *   • Decorated with arbitrary Tailwind classes & page-wide custom CSS
 *
 * Every section descriptor also carries its **defaults** — the eyebrow,
 * title, subtitle and CTAs that ship out of the box. The editor surfaces
 * those defaults as input placeholders so the user always knows what
 * they're overriding (no more "blank screen" surprises).
 *
 * Storage:
 *   v2 keeps everything in `localStorage` under `page_editor_v2`. The v1
 *   key is silently migrated forward. Promoting to a backend store later
 *   is a single-file change to the loader.
 */

import { useEffect, useState } from "react";

/* ──────────────────────────────────────────────
   Section catalogue
   ────────────────────────────────────────────── */

export type HomeSectionId =
  | "hero"
  | "stats"
  | "practice-areas"
  | "why-us"
  | "team"
  | "testimonials"
  | "blog"
  | "cta-strip";

/** Tone hint — used in the editor to pick a default text color when the
 *  background color is overridden, so the inputs stay readable. */
export type SectionTone = "dark" | "light";

export interface SectionDefaults {
  eyebrowAr?: string;
  eyebrowEn?: string;
  titleAr?: string;
  titleEn?: string;
  subtitleAr?: string;
  subtitleEn?: string;
  ctaLabelAr?: string;
  ctaLabelEn?: string;
  ctaHref?: string;
  cta2LabelAr?: string;
  cta2LabelEn?: string;
  cta2Href?: string;
}

export interface SectionDescriptor {
  id: HomeSectionId;
  labelAr: string;
  labelEn: string;
  /** Whether the section exposes editable text overrides in the admin UI. */
  hasTextOverrides: boolean;
  /** Whether the section exposes editable CTA overrides. */
  hasCtaOverrides: boolean;
  /** Optional descriptive text to show in the admin card. */
  descriptionAr: string;
  descriptionEn: string;
  /** Whether the section has a 2nd CTA button. */
  hasSecondCta: boolean;
  /** What the section ships with by default (used as placeholders). */
  defaults: SectionDefaults;
  /** Default tone (dark/light) of the section's natural background — used
   *  to pick contrast-aware default text colors in the admin previews. */
  tone: SectionTone;
}

export const HOME_SECTIONS: SectionDescriptor[] = [
  {
    id: "hero",
    labelAr: "البطل (Hero)",
    labelEn: "Hero",
    hasTextOverrides: true,
    hasCtaOverrides: true,
    hasSecondCta: true,
    descriptionAr: "الشريحة الرئيسية في أعلى الصفحة مع العنوان وأزرار الدعوة للحجز.",
    descriptionEn: "Top-of-page banner with the headline and primary CTAs.",
    tone: "dark",
    defaults: {
      eyebrowAr: "مكتب محاماة مصري رائد منذ ٢٠٠٨",
      eyebrowEn: "Egypt's Premier Law Firm Since 2008",
      titleAr: "مكتب مصر للمحاماة",
      titleEn: "Egypt Advocates",
      subtitleAr: "حلول قانونية قابلة للتنفيذ — نلتزم بتقديم دعم قانوني يسند إلى تحليل استراتيجي عميق وحلول تنفيذية دقيقة.",
      subtitleEn: "Actionable Legal Solutions — strategic analysis and precise execution for every case, urgent or long-term.",
      ctaLabelAr: "احجز استشارة",
      ctaLabelEn: "Book a Consultation",
      ctaHref: "/book",
      cta2LabelAr: "مجالات الممارسة",
      cta2LabelEn: "Practice Areas",
      cta2Href: "/practice-areas",
    },
  },
  {
    id: "stats",
    labelAr: "الإحصائيات",
    labelEn: "Statistics",
    hasTextOverrides: false,
    hasCtaOverrides: false,
    hasSecondCta: false,
    descriptionAr: "أربع بطاقات للقضايا والعملاء والخبرة ونسبة النجاح.",
    descriptionEn: "Four KPI cards: cases, clients, years, success rate.",
    tone: "dark",
    defaults: {},
  },
  {
    id: "practice-areas",
    labelAr: "مجالات الممارسة",
    labelEn: "Practice Areas",
    hasTextOverrides: true,
    hasCtaOverrides: true,
    hasSecondCta: false,
    descriptionAr: "شبكة من البطاقات لكل مجال قانوني نقدّمه.",
    descriptionEn: "Grid of cards for every legal practice area.",
    tone: "light",
    defaults: {
      eyebrowAr: "خبرتنا القانونية",
      eyebrowEn: "Our Expertise",
      titleAr: "مجالات الممارسة",
      titleEn: "Practice Areas",
      subtitleAr: "تغطية قانونية شاملة في جميع المجالات التخصصية بأعلى معايير الاحترافية.",
      subtitleEn: "Comprehensive legal coverage across all specialties to the highest professional standards.",
      ctaLabelAr: "عرض جميع المجالات",
      ctaLabelEn: "View All Practice Areas",
      ctaHref: "/practice-areas",
    },
  },
  {
    id: "why-us",
    labelAr: "لماذا تختارنا",
    labelEn: "Why Choose Us",
    hasTextOverrides: true,
    hasCtaOverrides: true,
    hasSecondCta: true,
    descriptionAr: "أربع نقاط تميز مع صورة على الجانب الآخر.",
    descriptionEn: "Four differentiator bullets paired with a hero image.",
    tone: "dark",
    defaults: {
      eyebrowAr: "لماذا تختارنا",
      eyebrowEn: "Why Choose Us",
      titleAr: "التزام لا يتزعزع بالتميز القانوني",
      titleEn: "Unwavering Commitment to Legal Excellence",
      subtitleAr: "منذ عام ٢٠٠٨، نحمل راية العدالة بأمانة واحترافية.",
      subtitleEn: "Since 2008, we carry the banner of justice with integrity.",
      ctaLabelAr: "عن المكتب",
      ctaLabelEn: "About Us",
      ctaHref: "/about",
      cta2LabelAr: "تواصل معنا",
      cta2LabelEn: "Contact Us",
      cta2Href: "/contact",
    },
  },
  {
    id: "team",
    labelAr: "فريق المحامين",
    labelEn: "Our Team",
    hasTextOverrides: true,
    hasCtaOverrides: true,
    hasSecondCta: false,
    descriptionAr: "بطاقات لأبرز المحامين مع المسمى الوظيفي وعدد سنوات الخبرة.",
    descriptionEn: "Cards highlighting key lawyers, their roles and tenure.",
    tone: "light",
    defaults: {
      eyebrowAr: "كفاءاتنا القانونية",
      eyebrowEn: "Our Legal Team",
      titleAr: "محامونا",
      titleEn: "Meet Our Lawyers",
      subtitleAr: "نخبة من أبرز المحامين المصريين بخبرة تمتد لعقود.",
      subtitleEn: "An elite team of Egypt's finest attorneys.",
      ctaLabelAr: "تعرّف على فريقنا",
      ctaLabelEn: "Meet the Full Team",
      ctaHref: "/lawyers",
    },
  },
  {
    id: "testimonials",
    labelAr: "آراء العملاء",
    labelEn: "Testimonials",
    hasTextOverrides: true,
    hasCtaOverrides: false,
    hasSecondCta: false,
    descriptionAr: "اقتباسات من العملاء مع التقييم والصورة.",
    descriptionEn: "Quoted client reviews with avatar and star rating.",
    tone: "light",
    defaults: {
      eyebrowAr: "آراء موكلينا",
      eyebrowEn: "Client Testimonials",
      titleAr: "ما يقوله عملاؤنا",
      titleEn: "What Our Clients Say",
    },
  },
  {
    id: "blog",
    labelAr: "آخر المقالات",
    labelEn: "Latest Blog Posts",
    hasTextOverrides: true,
    hasCtaOverrides: true,
    hasSecondCta: false,
    descriptionAr: "ثلاث مقالات حديثة من المدونة.",
    descriptionEn: "Three most recent posts from the blog.",
    tone: "light",
    defaults: {
      eyebrowAr: "المستجدات القانونية",
      eyebrowEn: "Legal Insights",
      titleAr: "آخر المقالات",
      titleEn: "Latest Articles",
      ctaLabelAr: "كل المقالات",
      ctaLabelEn: "View All",
      ctaHref: "/blog",
    },
  },
  {
    id: "cta-strip",
    labelAr: "شريط الدعوة",
    labelEn: "Final CTA Strip",
    hasTextOverrides: true,
    hasCtaOverrides: true,
    hasSecondCta: true,
    descriptionAr: "شريط في نهاية الصفحة يدعو الزائر لحجز استشارة.",
    descriptionEn: "Closing call-to-action strip at the bottom of the page.",
    tone: "dark",
    defaults: {
      eyebrowAr: "نحن هنا لمساعدتك",
      eyebrowEn: "We Are Here to Help",
      titleAr: "لا تواجه تحدياتك القانونية وحدك",
      titleEn: "Don't Face Your Legal Challenges Alone",
      subtitleAr: "تواصل معنا اليوم لحجز استشارة قانونية متخصصة.",
      subtitleEn: "Contact us today to book a consultation.",
      ctaLabelAr: "احجز استشارتك الآن",
      ctaLabelEn: "Book Your Consultation Now",
      ctaHref: "/book",
      cta2LabelAr: "أرسل لنا رسالة",
      cta2LabelEn: "Send Us a Message",
      cta2Href: "/contact",
    },
  },
];

export function getSectionDescriptor(id: HomeSectionId): SectionDescriptor {
  return HOME_SECTIONS.find((s) => s.id === id) ?? HOME_SECTIONS[0];
}

/* ──────────────────────────────────────────────
   Per-section overrides
   ────────────────────────────────────────────── */

export type PaddingPreset = "none" | "sm" | "md" | "lg" | "xl";
export type ContainerWidth = "narrow" | "default" | "wide" | "full";
export type TextAlign = "start" | "center" | "end";

export const PADDING_PRESETS: { id: PaddingPreset; label: string; classes: string }[] = [
  { id: "none", label: "بدون / None",       classes: "py-0"             },
  { id: "sm",   label: "صغير / Small",      classes: "py-8 md:py-10"    },
  { id: "md",   label: "متوسط / Medium",    classes: "py-12 md:py-16"   },
  { id: "lg",   label: "كبير / Large",      classes: "py-16 md:py-24"   },
  { id: "xl",   label: "ضخم / Extra Large", classes: "py-24 md:py-32"   },
];

export const CONTAINER_WIDTHS: { id: ContainerWidth; label: string; classes: string }[] = [
  { id: "narrow",  label: "ضيق / Narrow",   classes: "max-w-3xl" },
  { id: "default", label: "افتراضي / Default", classes: "max-w-7xl" },
  { id: "wide",    label: "واسع / Wide",    classes: "max-w-[88rem]" },
  { id: "full",    label: "كامل / Full",    classes: "max-w-none" },
];

export interface SectionOverride {
  /** Section toggled visible? Default true. */
  enabled: boolean;

  /* ─── Content ─── */
  eyebrowAr?: string;
  eyebrowEn?: string;
  titleAr?: string;
  titleEn?: string;
  subtitleAr?: string;
  subtitleEn?: string;
  ctaLabelAr?: string;
  ctaLabelEn?: string;
  ctaHref?: string;
  cta2LabelAr?: string;
  cta2LabelEn?: string;
  cta2Href?: string;

  /* ─── Style (colors) ─── */
  /** Section background color (hex, e.g. "#0d152a"). */
  bgColor?: string;
  /** Main text color for the section (hex). */
  textColor?: string;
  /** Eyebrow / kicker accent color (hex). */
  eyebrowColor?: string;
  /** Primary CTA background color (hex). */
  ctaBgColor?: string;
  /** Primary CTA text color (hex). */
  ctaTextColor?: string;
  /** Secondary CTA background color (hex, transparent if blank). */
  cta2BgColor?: string;
  /** Secondary CTA text color (hex). */
  cta2TextColor?: string;

  /* ─── Layout ─── */
  paddingY?: PaddingPreset;
  containerWidth?: ContainerWidth;
  /** Text alignment for the section's text block. */
  textAlign?: TextAlign;
  /** Extra Tailwind / utility classes appended to the section root. */
  extraClassName?: string;
}

export interface PageEditorConfig {
  version: 2;
  pages: {
    home: {
      order: HomeSectionId[];
      overrides: Partial<Record<HomeSectionId, SectionOverride>>;
      customCss: string;
    };
  };
}

/* ──────────────────────────────────────────────
   Defaults
   ────────────────────────────────────────────── */

const DEFAULT_HOME_ORDER: HomeSectionId[] = HOME_SECTIONS.map((s) => s.id);

export const DEFAULT_PAGE_EDITOR_CONFIG: PageEditorConfig = {
  version: 2,
  pages: {
    home: {
      order: DEFAULT_HOME_ORDER,
      overrides: {},
      customCss: "",
    },
  },
};

/* ──────────────────────────────────────────────
   Persistence
   ────────────────────────────────────────────── */

const STORAGE_KEY = "page_editor_v2";
const LEGACY_STORAGE_KEY = "page_editor_v1";
const STYLE_INJECT_ID = "page-editor-custom-css";
const EVENT_NAME = "page-editor-updated";

export function getStoredPageEditorConfig(): PageEditorConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PageEditorConfig>;
    return mergeWithDefaults(parsed);
  } catch {
    return null;
  }
}

export function loadPageEditorConfig(): PageEditorConfig {
  return getStoredPageEditorConfig() ?? DEFAULT_PAGE_EDITOR_CONFIG;
}

export function savePageEditorConfig(cfg: PageEditorConfig): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch { /* ignore (private mode, quota, etc.) */ }
  applyPageEditor(cfg);
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function resetPageEditorConfig(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch { /* ignore */ }
  applyPageEditor(DEFAULT_PAGE_EDITOR_CONFIG);
  window.dispatchEvent(new Event(EVENT_NAME));
}

function mergeWithDefaults(partial: Partial<PageEditorConfig>): PageEditorConfig {
  const home = (partial.pages?.home ?? {}) as Partial<PageEditorConfig["pages"]["home"]>;
  const known = new Set<HomeSectionId>(DEFAULT_HOME_ORDER);
  const storedOrder = (home.order ?? []).filter((id): id is HomeSectionId => known.has(id));
  const missing = DEFAULT_HOME_ORDER.filter((id) => !storedOrder.includes(id));
  const order = [...storedOrder, ...missing];
  return {
    version: 2,
    pages: {
      home: {
        order,
        overrides: home.overrides ?? {},
        customCss: typeof home.customCss === "string" ? home.customCss : "",
      },
    },
  };
}

/* ──────────────────────────────────────────────
   Side-effect appliers
   ────────────────────────────────────────────── */

function injectPageEditorCss(css: string) {
  if (typeof document === "undefined") return;
  let node = document.getElementById(STYLE_INJECT_ID) as HTMLStyleElement | null;
  if (!css || !css.trim()) {
    if (node) node.remove();
    return;
  }
  if (!node) {
    node = document.createElement("style");
    node.id = STYLE_INJECT_ID;
    document.head.appendChild(node);
  }
  node.textContent = css;
}

export function applyPageEditor(cfg: PageEditorConfig): void {
  injectPageEditorCss(cfg.pages.home.customCss);
}

export function bootstrapPageEditor(): void {
  applyPageEditor(loadPageEditorConfig());
}

/* ──────────────────────────────────────────────
   React hook
   ────────────────────────────────────────────── */

export function usePageEditorConfig(): PageEditorConfig {
  const [cfg, setCfg] = useState<PageEditorConfig>(loadPageEditorConfig);

  useEffect(() => {
    const refresh = () => setCfg(loadPageEditorConfig());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === LEGACY_STORAGE_KEY) refresh();
    };
    window.addEventListener(EVENT_NAME, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT_NAME, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return cfg;
}

/* ──────────────────────────────────────────────
   Helpers used by both the admin UI and the home page renderer
   ────────────────────────────────────────────── */

export function isSectionEnabled(cfg: PageEditorConfig, id: HomeSectionId): boolean {
  return cfg.pages.home.overrides[id]?.enabled ?? true;
}

export function getSectionOverride(
  cfg: PageEditorConfig,
  id: HomeSectionId,
): SectionOverride {
  return cfg.pages.home.overrides[id] ?? { enabled: true };
}

export function getPaddingClasses(preset: PaddingPreset | undefined, fallback: string): string {
  if (!preset) return fallback;
  return PADDING_PRESETS.find((p) => p.id === preset)?.classes ?? fallback;
}

export function getContainerClasses(width: ContainerWidth | undefined, fallback: string): string {
  if (!width) return fallback;
  return CONTAINER_WIDTHS.find((c) => c.id === width)?.classes ?? fallback;
}

export function getTextAlignClass(align: TextAlign | undefined): string {
  if (!align) return "";
  if (align === "start") return "text-start";
  if (align === "center") return "text-center";
  if (align === "end") return "text-end";
  return "";
}
