/**
 * Public-website appearance runtime applier.
 *
 * Persisted under `website_appear` in localStorage.  Settings here only affect
 * the public marketing site (not the admin panel).  We ship two layers:
 *
 *   1. `applyWebsiteAppearance(cfg)` writes CSS variables, body data-attributes,
 *      a `<style id="website-custom-css">` block, a `<head>` injection element,
 *      and an updated favicon link — these can take effect immediately without
 *      re-rendering React.
 *   2. The public layout/components read the same config via a tiny
 *      `useWebsiteAppearance()` hook to react to layout-changing options
 *      (header style, announcement bar, footer columns, …).
 */

import { useEffect, useState } from "react";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

export type HeaderStyle = "solid" | "transparent" | "glass";
export type SiteWidth = "default" | "wide" | "full";
export type FooterColumns = 1 | 2 | 4;
export type CardStyle = "flat" | "elevated" | "outlined";

export interface AnnouncementBar {
  enabled: boolean;
  textAr: string;
  textEn: string;
  link: string;
  bg: string;        // hex
  fg: string;        // hex
}

export interface WebsiteAppearance {
  /* Branding */
  logoUrl: string;            // empty → keep `/logo.png`
  faviconUrl: string;
  ogImageUrl: string;

  /* Layout */
  topBarEnabled: boolean;
  headerStyle: HeaderStyle;
  headerSticky: boolean;
  showLanguageSwitcher: boolean;
  showBookCta: boolean;
  siteWidth: SiteWidth;
  cardStyle: CardStyle;

  /* Announcement bar */
  announcement: AnnouncementBar;

  /* Hero (read by Home page; applied via CSS vars) */
  heroBackgroundUrl: string;
  heroOverlayOpacity: number; // 0..100
  heroAlignment: "start" | "center" | "end";

  /* Footer */
  footerColumns: FooterColumns;
  footerShowSocial: boolean;
  footerShowMap: boolean;
  footerShowNewsletter: boolean;
  footerCopyrightAr: string;
  footerCopyrightEn: string;

  /* Color overrides — public site can use a different palette than admin */
  primaryColorOverride: string;   // empty → inherit from admin appearance
  accentColorOverride: string;
  backgroundOverride: string;

  /* ── Public-site brand palette ──
     - `ctaColor`        is the colour used for primary call-to-action
                         buttons (e.g. "Book a consultation"), badges,
                         star ratings, accent dividers, etc. A full
                         hover/soft/shadow ramp is derived from this hex.
     - `siteDeepColor`   is the dark navy hero / CTA-section background.
                         Derives 4 shades (deepest, deep, soft, warm).
     Empty string ⇒ keep the default copper / navy. */
  ctaColor: string;
  siteDeepColor: string;

  /* Custom code (advanced) */
  customCss: string;
  customHeadHtml: string;
}

export const DEFAULT_WEBSITE_APPEARANCE: WebsiteAppearance = {
  logoUrl: "",
  faviconUrl: "",
  ogImageUrl: "",
  topBarEnabled: true,
  headerStyle: "solid",
  headerSticky: true,
  showLanguageSwitcher: true,
  showBookCta: true,
  siteWidth: "default",
  cardStyle: "elevated",
  announcement: {
    enabled: false,
    textAr: "",
    textEn: "",
    link: "",
    bg: "#17264d",
    fg: "#ffffff",
  },
  heroBackgroundUrl: "",
  heroOverlayOpacity: 60,
  heroAlignment: "start",
  footerColumns: 4,
  footerShowSocial: true,
  footerShowMap: false,
  footerShowNewsletter: false,
  footerCopyrightAr: "",
  footerCopyrightEn: "",
  primaryColorOverride: "",
  accentColorOverride: "",
  backgroundOverride: "",
  ctaColor: "",
  siteDeepColor: "",
  customCss: "",
  customHeadHtml: "",
};

/**
 * Default brand palette anchors. These are reused both for the empty-
 * override fallback and for showing the "current" colour in the admin UI
 * pickers when nothing has been customised yet. They mirror the values
 * declared in `index.css` (`--site-cta`, `--site-deep`).
 */
export const DEFAULT_CTA_HEX = "#c4734a";
export const DEFAULT_SITE_DEEP_HEX = "#0d152a";

const STORAGE_KEY = "website_appear";
const CSS_INJECT_ID = "website-custom-css";
const HEAD_INJECT_ID = "website-custom-head";
const FAVICON_LINK_ID = "website-custom-favicon";

/* ──────────────────────────────────────────────
   Persistence
   ────────────────────────────────────────────── */

export function getStoredWebsiteAppearance(): WebsiteAppearance | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WebsiteAppearance>;
    return {
      ...DEFAULT_WEBSITE_APPEARANCE,
      ...parsed,
      announcement: {
        ...DEFAULT_WEBSITE_APPEARANCE.announcement,
        ...(parsed.announcement ?? {}),
      },
    };
  } catch {
    return null;
  }
}

export function loadWebsiteAppearance(): WebsiteAppearance {
  return getStoredWebsiteAppearance() ?? DEFAULT_WEBSITE_APPEARANCE;
}

export function saveWebsiteAppearance(cfg: WebsiteAppearance): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  /* In-page listeners should refresh too. */
  window.dispatchEvent(new Event("website-appearance-updated"));
}

export function clearStoredWebsiteAppearance(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("website-appearance-updated"));
}

/* ──────────────────────────────────────────────
   Tiny color helper — duplicated to avoid coupling
   ────────────────────────────────────────────── */

function hexToHslComponents(
  hex: string,
): { h: number; s: number; l: number } | null {
  const c = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(c)) return null;
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hexToHsl(hex: string): string | null {
  const parts = hexToHslComponents(hex);
  if (!parts) return null;
  return `${parts.h} ${parts.s}% ${parts.l}%`;
}

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

/**
 * Apply a complete brand-CTA ramp (`--site-cta`, `--site-cta-hover`,
 * `--site-cta-soft`, …) derived from a single hex chosen by the admin.
 * When `hex` is empty we strip the runtime overrides and let the static
 * `:root` defaults from index.css apply.
 */
function applyCtaRamp(hex: string) {
  const root = document.documentElement;
  const tokens = [
    "--site-cta", "--site-cta-hover", "--site-cta-soft", "--site-cta-softer",
    "--site-cta-shadow", "--site-cta-shadow-deep", "--site-cta-text",
  ];
  const parts = hex ? hexToHslComponents(hex) : null;
  if (!parts) {
    tokens.forEach(t => root.style.removeProperty(t));
    return;
  }
  const set = (name: string, l: number, sBoost = 0) => {
    root.style.setProperty(
      name,
      `${parts.h} ${clamp(parts.s + sBoost, 0, 100)}% ${clamp(l, 0, 100)}%`,
    );
  };
  set("--site-cta",             parts.l);
  set("--site-cta-hover",       parts.l - 7);
  set("--site-cta-soft",        parts.l + 10, 10);
  set("--site-cta-softer",      parts.l + 15, 10);
  set("--site-cta-shadow",      parts.l - 25);
  set("--site-cta-shadow-deep", parts.l - 35);
  set("--site-cta-text",        parts.l - 15, -10);
}

/** Same idea as `applyCtaRamp` but for the deep-navy hero/section bg. */
function applyDeepRamp(hex: string) {
  const root = document.documentElement;
  const tokens = [
    "--site-deep", "--site-deep-strong", "--site-deep-soft", "--site-deep-warm",
  ];
  const parts = hex ? hexToHslComponents(hex) : null;
  if (!parts) {
    tokens.forEach(t => root.style.removeProperty(t));
    return;
  }
  const set = (name: string, l: number) => {
    root.style.setProperty(name, `${parts.h} ${parts.s}% ${clamp(l, 0, 100)}%`);
  };
  /* Anchor on the chosen hex; nudge ±2-4% lightness for the four shades. */
  set("--site-deep",        parts.l);
  set("--site-deep-strong", parts.l - 2);
  set("--site-deep-soft",   parts.l + 2);
  set("--site-deep-warm",   parts.l + 4);
}

/* ──────────────────────────────────────────────
   Appliers
   ────────────────────────────────────────────── */

function setBodyData(key: string, value: string | undefined | null) {
  if (typeof document === "undefined") return;
  const el = document.body;
  if (!el) return;
  if (value == null || value === "") {
    delete el.dataset[key];
  } else {
    el.dataset[key] = value;
  }
}

function setRootHsl(name: string, hex: string) {
  const root = document.documentElement;
  if (!hex) {
    /* leave admin/global value in place */
    return;
  }
  const hsl = hexToHsl(hex);
  if (hsl) root.style.setProperty(name, hsl);
}

function injectCustomCss(css: string) {
  if (typeof document === "undefined") return;
  let node = document.getElementById(CSS_INJECT_ID) as HTMLStyleElement | null;
  if (!css || !css.trim()) {
    if (node) node.remove();
    return;
  }
  if (!node) {
    node = document.createElement("style");
    node.id = CSS_INJECT_ID;
    document.head.appendChild(node);
  }
  node.textContent = css;
}

function injectCustomHead(html: string) {
  if (typeof document === "undefined") return;
  let node = document.getElementById(HEAD_INJECT_ID);
  if (!html || !html.trim()) {
    if (node) node.remove();
    return;
  }
  if (!node) {
    node = document.createElement("div");
    node.id = HEAD_INJECT_ID;
    /* Hidden — tags inside still execute & take effect in <head>. */
    (node as HTMLElement).style.display = "none";
    document.head.appendChild(node);
  }
  node.innerHTML = html;
}

function applyFavicon(url: string) {
  if (typeof document === "undefined") return;
  let link = document.getElementById(FAVICON_LINK_ID) as HTMLLinkElement | null;
  if (!url) {
    if (link) link.remove();
    return;
  }
  if (!link) {
    link = document.createElement("link");
    link.id = FAVICON_LINK_ID;
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = url;
}

/** Apply all the side-effects of a website-appearance config. */
export function applyWebsiteAppearance(cfg: WebsiteAppearance): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  /* Color overrides — only when an explicit hex is provided. */
  setRootHsl("--primary", cfg.primaryColorOverride);
  setRootHsl("--accent",  cfg.accentColorOverride);
  if (cfg.backgroundOverride) {
    const hsl = hexToHsl(cfg.backgroundOverride);
    if (hsl) root.style.setProperty("--background", hsl);
  }

  /* Public-website brand ramps. Each hex derives a full shade ramp the
     home page (and other public pages) consume via `bg-site-cta`,
     `text-site-cta-soft`, `bg-site-deep`, etc. */
  applyCtaRamp(cfg.ctaColor);
  applyDeepRamp(cfg.siteDeepColor);

  /* Hero overlay opacity exposed as a CSS variable. */
  root.style.setProperty(
    "--hero-overlay-opacity",
    String(Math.max(0, Math.min(100, cfg.heroOverlayOpacity)) / 100),
  );
  if (cfg.heroBackgroundUrl) {
    root.style.setProperty("--hero-background-url", `url("${cfg.heroBackgroundUrl}")`);
  } else {
    root.style.removeProperty("--hero-background-url");
  }

  /* body data-attributes for layout components to react to. */
  setBodyData("websiteHeader", cfg.headerStyle);
  setBodyData("websiteSticky", cfg.headerSticky ? "1" : "0");
  setBodyData("websiteWidth", cfg.siteWidth);
  setBodyData("websiteCard", cfg.cardStyle);
  setBodyData("websiteAnnouncement", cfg.announcement.enabled ? "1" : "0");

  injectCustomCss(cfg.customCss);
  injectCustomHead(cfg.customHeadHtml);
  applyFavicon(cfg.faviconUrl);
}

export function clearWebsiteAppearanceOverrides(): void {
  const root = document.documentElement;
  /* Don't strip --primary/--accent here — admin appearance owns them.
     Only revert THIS module's exclusive vars. */
  root.style.removeProperty("--background");
  root.style.removeProperty("--hero-overlay-opacity");
  root.style.removeProperty("--hero-background-url");
  /* Reset the public brand ramps to the static :root defaults. */
  applyCtaRamp("");
  applyDeepRamp("");
  ["websiteHeader", "websiteSticky", "websiteWidth", "websiteCard", "websiteAnnouncement"].forEach((k) =>
    setBodyData(k, undefined),
  );
  injectCustomCss("");
  injectCustomHead("");
  applyFavicon("");
}

/* ──────────────────────────────────────────────
   Bootstrap
   ────────────────────────────────────────────── */

let bootstrapped = false;

export function bootstrapWebsiteAppearance(): () => void {
  if (typeof window === "undefined") return () => undefined;

  const apply = () => {
    const cfg = loadWebsiteAppearance();
    /* Re-apply on every refresh — old style/head injections are replaced. */
    applyWebsiteAppearance(cfg);
  };
  apply();
  bootstrapped = true;

  const onUpd = () => apply();
  window.addEventListener("website-appearance-updated", onUpd);
  const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) apply(); };
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener("website-appearance-updated", onUpd);
    window.removeEventListener("storage", onStorage);
  };
}

/** Returns whether bootstrap has run (useful for guards in hooks). */
export const isWebsiteAppearanceReady = () => bootstrapped;

/* ──────────────────────────────────────────────
   React hook used by public components
   ────────────────────────────────────────────── */

export function useWebsiteAppearance(): WebsiteAppearance {
  const [cfg, setCfg] = useState<WebsiteAppearance>(() => loadWebsiteAppearance());

  useEffect(() => {
    const reload = () => setCfg(loadWebsiteAppearance());
    window.addEventListener("website-appearance-updated", reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener("website-appearance-updated", reload);
      window.removeEventListener("storage", reload);
    };
  }, []);

  return cfg;
}
