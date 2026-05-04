/**
 * Page Editor — schema, persistence and hook for the admin's
 * "Visual Section Manager".
 *
 * What this gives the admin (today):
 *   • Toggle entire sections on/off per page
 *   • Reorder sections (drag handles in the UI; here we just store an
 *     ordered list of section ids)
 *   • Override text content per section + language (titles, eyebrow
 *     badges, CTA labels & links)
 *   • Per-section padding-Y preset and arbitrary CSS class string
 *   • Page-wide custom CSS injected as a <style> tag
 *
 * What it deliberately does NOT do (yet):
 *   • Drag-drop visual canvas (deferred to GrapesJS phase)
 *   • Add brand-new sections
 *   • Edit individual sub-elements inside a section
 *
 * Storage:
 *   v1 keeps everything in `localStorage` under `page_editor_v1`. This
 *   is per-browser only — promoting to the database later just means
 *   adding `GET/PUT /api/admin/page-editor` and swapping the loader.
 *   The schema stays the same so no UI changes are needed.
 */

import { useEffect, useState } from "react";

/* ──────────────────────────────────────────────
   Section catalogue — the source of truth for what sections each page
   exposes to the editor. The home page ships with 8 sections today;
   adding a new section here + handling its id in the consuming page is
   all that's needed to expose it.
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
}

export const HOME_SECTIONS: SectionDescriptor[] = [
  {
    id: "hero",
    labelAr: "البطل (Hero)",
    labelEn: "Hero",
    hasTextOverrides: true,
    hasCtaOverrides: true,
    descriptionAr: "الشريحة الرئيسية في أعلى الصفحة مع العنوان وأزرار الدعوة للحجز.",
    descriptionEn: "Top-of-page banner with the headline and primary CTAs.",
  },
  {
    id: "stats",
    labelAr: "الإحصائيات",
    labelEn: "Statistics",
    hasTextOverrides: false,
    hasCtaOverrides: false,
    descriptionAr: "أربع بطاقات للقضايا والعملاء والخبرة ونسبة النجاح.",
    descriptionEn: "Four KPI cards: cases, clients, years, success rate.",
  },
  {
    id: "practice-areas",
    labelAr: "مجالات الممارسة",
    labelEn: "Practice Areas",
    hasTextOverrides: true,
    hasCtaOverrides: true,
    descriptionAr: "شبكة من البطاقات لكل مجال قانوني نقدّمه.",
    descriptionEn: "Grid of cards for every legal practice area.",
  },
  {
    id: "why-us",
    labelAr: "لماذا تختارنا",
    labelEn: "Why Choose Us",
    hasTextOverrides: true,
    hasCtaOverrides: true,
    descriptionAr: "أربع نقاط تميز مع صورة على الجانب الآخر.",
    descriptionEn: "Four differentiator bullets paired with a hero image.",
  },
  {
    id: "team",
    labelAr: "فريق المحامين",
    labelEn: "Our Team",
    hasTextOverrides: true,
    hasCtaOverrides: true,
    descriptionAr: "بطاقات لأبرز المحامين مع المسمى الوظيفي وعدد سنوات الخبرة.",
    descriptionEn: "Cards highlighting key lawyers, their roles and tenure.",
  },
  {
    id: "testimonials",
    labelAr: "آراء العملاء",
    labelEn: "Testimonials",
    hasTextOverrides: true,
    hasCtaOverrides: false,
    descriptionAr: "اقتباسات من العملاء مع التقييم والصورة.",
    descriptionEn: "Quoted client reviews with avatar and star rating.",
  },
  {
    id: "blog",
    labelAr: "آخر المقالات",
    labelEn: "Latest Blog Posts",
    hasTextOverrides: true,
    hasCtaOverrides: true,
    descriptionAr: "ثلاث مقالات حديثة من المدونة.",
    descriptionEn: "Three most recent posts from the blog.",
  },
  {
    id: "cta-strip",
    labelAr: "شريط الدعوة",
    labelEn: "Final CTA Strip",
    hasTextOverrides: true,
    hasCtaOverrides: true,
    descriptionAr: "شريط في نهاية الصفحة يدعو الزائر لحجز استشارة.",
    descriptionEn: "Closing call-to-action strip at the bottom of the page.",
  },
];

/* ──────────────────────────────────────────────
   Per-section overrides
   ────────────────────────────────────────────── */

export type PaddingPreset = "none" | "sm" | "md" | "lg" | "xl";

export const PADDING_PRESETS: { id: PaddingPreset; label: string; classes: string }[] = [
  { id: "none", label: "None",          classes: "py-0"             },
  { id: "sm",   label: "Small",         classes: "py-8 md:py-10"    },
  { id: "md",   label: "Medium",        classes: "py-12 md:py-16"   },
  { id: "lg",   label: "Large",         classes: "py-16 md:py-24"   },
  { id: "xl",   label: "Extra Large",   classes: "py-24 md:py-32"   },
];

export interface SectionOverride {
  /** Section toggled visible? Default true. */
  enabled: boolean;
  /** Eyebrow / kicker badge above the headline, per language. */
  eyebrowAr?: string;
  eyebrowEn?: string;
  /** Section main headline, per language. */
  titleAr?: string;
  titleEn?: string;
  /** Sub-headline / paragraph, per language. */
  subtitleAr?: string;
  subtitleEn?: string;
  /** Primary CTA button label, per language. */
  ctaLabelAr?: string;
  ctaLabelEn?: string;
  /** Primary CTA destination (relative path or absolute URL). */
  ctaHref?: string;
  /** Secondary CTA button label, per language. */
  cta2LabelAr?: string;
  cta2LabelEn?: string;
  cta2Href?: string;
  /** Vertical padding preset; undefined ⇒ section's default. */
  paddingY?: PaddingPreset;
  /** Extra Tailwind / utility classes appended to the section root. */
  extraClassName?: string;
}

export interface PageEditorConfig {
  /** Schema version for forward-compatible migrations. */
  version: 1;
  /** Per-page section state, keyed by page id. */
  pages: {
    home: {
      /** Ordered list of section ids — drives render order. */
      order: HomeSectionId[];
      /** Per-section override map keyed by section id. */
      overrides: Partial<Record<HomeSectionId, SectionOverride>>;
      /** Page-level custom CSS injected as a <style> tag. */
      customCss: string;
    };
  };
}

/* ──────────────────────────────────────────────
   Defaults
   ────────────────────────────────────────────── */

const DEFAULT_HOME_ORDER: HomeSectionId[] = HOME_SECTIONS.map((s) => s.id);

export const DEFAULT_PAGE_EDITOR_CONFIG: PageEditorConfig = {
  version: 1,
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

const STORAGE_KEY = "page_editor_v1";
const STYLE_INJECT_ID = "page-editor-custom-css";
const EVENT_NAME = "page-editor-updated";

export function getStoredPageEditorConfig(): PageEditorConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
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
  /* Apply side-effects (custom CSS) immediately and notify listeners. */
  applyPageEditor(cfg);
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function resetPageEditorConfig(): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  applyPageEditor(DEFAULT_PAGE_EDITOR_CONFIG);
  window.dispatchEvent(new Event(EVENT_NAME));
}

/** Merge a partial (possibly older-shape) config with defaults so consumers
 *  never have to null-check intermediate keys. */
function mergeWithDefaults(partial: Partial<PageEditorConfig>): PageEditorConfig {
  const base = DEFAULT_PAGE_EDITOR_CONFIG;
  const home = (partial.pages?.home ?? {}) as Partial<PageEditorConfig["pages"]["home"]>;
  /* Order: keep stored order, but append any new sections that have been
     added to the catalogue since the config was first saved, and prune
     any unknown ids. */
  const known = new Set<HomeSectionId>(DEFAULT_HOME_ORDER);
  const storedOrder = (home.order ?? []).filter((id): id is HomeSectionId => known.has(id));
  const missing = DEFAULT_HOME_ORDER.filter((id) => !storedOrder.includes(id));
  const order = [...storedOrder, ...missing];
  return {
    version: 1,
    pages: {
      home: {
        order,
        overrides: home.overrides ?? {},
        customCss: typeof home.customCss === "string" ? home.customCss : "",
      },
    },
    ...base,
    /* `pages` above must win over the default spread below. */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
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

/** Apply all client-side side-effects of the editor config (CSS injection
 *  today, more later). Cheap to call repeatedly. */
export function applyPageEditor(cfg: PageEditorConfig): void {
  injectPageEditorCss(cfg.pages.home.customCss);
}

/** Run once at app boot to apply the persisted config. */
export function bootstrapPageEditor(): void {
  applyPageEditor(loadPageEditorConfig());
}

/* ──────────────────────────────────────────────
   React hook
   ────────────────────────────────────────────── */

/**
 * Subscribes to the persisted page-editor config and re-renders when it
 * changes (either from this tab or another tab via the storage event).
 */
export function usePageEditorConfig(): PageEditorConfig {
  const [cfg, setCfg] = useState<PageEditorConfig>(loadPageEditorConfig);

  useEffect(() => {
    const refresh = () => setCfg(loadPageEditorConfig());
    window.addEventListener(EVENT_NAME, refresh);
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY) refresh();
    });
    return () => {
      window.removeEventListener(EVENT_NAME, refresh);
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
