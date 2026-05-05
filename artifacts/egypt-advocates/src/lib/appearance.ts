/**
 * Admin "Appearance & Colors" runtime applier (advanced).
 *
 * The admin settings page persists a config object to localStorage under
 * `admin_appear`. This module is responsible for *applying* it to the live DOM:
 *  - toggles `.dark` on <html> based on theme (light | dark | system)
 *  - rewrites `--primary` / `--accent` / `--ring` HSL components
 *  - sets `--radius`, font families, and a font-scale multiplier
 *  - applies a "density" attribute the rest of the app can react to
 *
 * Default language is propagated by the settings page into the existing
 * i18n contexts, so it isn't part of the DOM apply step here.
 */

export type Theme = "light" | "dark" | "system";
export type Lang = "ar" | "en";
export type Density = "compact" | "comfortable" | "spacious";

export interface AppearanceConfig {
  theme: Theme;
  defaultLang: Lang;
  primaryColor: string;     // hex (#RRGGBB)
  accentColor: string;      // hex
  borderRadius: number;     // rem
  fontHeading: string;      // CSS font-family value
  fontBody: string;         // CSS font-family value
  fontScale: number;        // 0.85..1.20 (1 = default)
  density: Density;
}

/* ──────────────────────────────────────────────
   Defaults — match the values shipped in index.css so an untouched
   config does NOT visibly change the brand.
   ────────────────────────────────────────────── */

export const DEFAULT_PRIMARY_HEX = "#17264d";   // Deep Navy (220 50% 18%)
export const DEFAULT_ACCENT_HEX  = "#bf6b4a";   // Rose Gold/Copper (15 45% 55%)

export const DEFAULT_APPEARANCE: AppearanceConfig = {
  theme: "system",
  defaultLang: "en",
  primaryColor: DEFAULT_PRIMARY_HEX,
  accentColor:  DEFAULT_ACCENT_HEX,
  borderRadius: 0.25,
  fontHeading: "'Playfair Display', serif",
  fontBody: "'Cairo', 'Inter', sans-serif",
  fontScale: 1,
  density: "comfortable",
};

const STORAGE_KEY = "admin_appear";

/** Returns the saved config or `null` when the admin has never customized. */
export function getStoredAppearance(): AppearanceConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return { ...DEFAULT_APPEARANCE, ...(JSON.parse(raw) as Partial<AppearanceConfig>) };
  } catch {
    return null;
  }
}

export function loadAppearance(): AppearanceConfig {
  return getStoredAppearance() ?? DEFAULT_APPEARANCE;
}

export function saveAppearance(cfg: AppearanceConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

export function clearStoredAppearance(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/* ──────────────────────────────────────────────
   Color helpers
   ────────────────────────────────────────────── */

/** "#c9a84c" → "39 56% 54%" — match the HSL-component format used in index.css. */
export function hexToHslComponents(hex: string): string | null {
  if (typeof hex !== "string" || !hex.trim()) return null;
  const cleaned = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return null;
  const r = parseInt(cleaned.slice(0, 2), 16) / 255;
  const g = parseInt(cleaned.slice(2, 4), 16) / 255;
  const b = parseInt(cleaned.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
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
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** True when a hex value is so close to the design-system default that we
 *  should clear the override instead of writing to the variable. */
function isHexEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  return a.trim().toLowerCase().replace(/^#/, "") === b.trim().toLowerCase().replace(/^#/, "");
}

/* ──────────────────────────────────────────────
   Appliers
   ────────────────────────────────────────────── */

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  const prefersDark =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = theme === "dark" || (theme === "system" && prefersDark);
  root.classList.toggle("dark", isDark);
  root.style.colorScheme = isDark ? "dark" : "light";
  root.dataset.theme = theme;
}

function applyHslVar(name: string, hex: string, defaultHex: string): void {
  const root = document.documentElement;
  const hsl = hexToHslComponents(hex);
  if (!hsl || isHexEqual(hex, defaultHex)) {
    root.style.removeProperty(name);
    return;
  }
  root.style.setProperty(name, hsl);
}

function applyRadius(radius: number): void {
  const root = document.documentElement;
  if (!Number.isFinite(radius) || radius < 0) {
    root.style.removeProperty("--radius");
    return;
  }
  root.style.setProperty("--radius", `${radius}rem`);
}

function applyFonts(headingFamily: string, bodyFamily: string): void {
  const root = document.documentElement;
  if (headingFamily && headingFamily !== DEFAULT_APPEARANCE.fontHeading) {
    root.style.setProperty("--app-font-serif", headingFamily);
  } else {
    root.style.removeProperty("--app-font-serif");
  }
  if (bodyFamily && bodyFamily !== DEFAULT_APPEARANCE.fontBody) {
    root.style.setProperty("--app-font-sans", bodyFamily);
  } else {
    root.style.removeProperty("--app-font-sans");
  }
}

function applyFontScale(scale: number): void {
  const root = document.documentElement;
  if (!Number.isFinite(scale) || scale === 1) {
    root.style.removeProperty("font-size");
    return;
  }
  /* Default browser size is 16px. Multiplying changes every rem-based unit. */
  root.style.fontSize = `${Math.max(12, Math.min(20, 16 * scale))}px`;
}

function applyDensity(density: Density): void {
  const root = document.documentElement;
  if (density === "comfortable") {
    delete root.dataset.density;
  } else {
    root.dataset.density = density;
  }
}

/** Strip every override this module ever applied → page falls back to design tokens. */
export function clearAppearanceOverrides(): void {
  const root = document.documentElement;
  root.style.removeProperty("--primary");
  root.style.removeProperty("--accent");
  root.style.removeProperty("--ring");
  root.style.removeProperty("--radius");
  root.style.removeProperty("--app-font-serif");
  root.style.removeProperty("--app-font-sans");
  root.style.removeProperty("font-size");
  root.style.removeProperty("color-scheme");
  root.classList.remove("dark");
  delete root.dataset.theme;
  delete root.dataset.density;
}

export function applyAppearance(cfg: AppearanceConfig): void {
  applyTheme(cfg.theme);
  applyHslVar("--primary", cfg.primaryColor, DEFAULT_PRIMARY_HEX);
  applyHslVar("--accent",  cfg.accentColor,  DEFAULT_ACCENT_HEX);
  /* `--ring` follows the accent so focus halos match the brand. */
  applyHslVar("--ring",    cfg.accentColor,  DEFAULT_ACCENT_HEX);
  applyRadius(cfg.borderRadius);
  applyFonts(cfg.fontHeading, cfg.fontBody);
  applyFontScale(cfg.fontScale);
  applyDensity(cfg.density);
}

let mqListenerAttached: ((e: MediaQueryListEvent) => void) | null = null;

/**
 * Apply current persisted appearance and keep the document in sync with the
 * user's OS color scheme when theme === "system". Returns a teardown.
 *
 * Safe to call multiple times — re-attaches a fresh media-query listener.
 */
export function bootstrapAppearance(): () => void {
  if (typeof window === "undefined") return () => undefined;

  const apply = () => {
    const stored = getStoredAppearance();
    clearAppearanceOverrides();
    if (stored) applyAppearance(stored);
  };
  apply();

  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  if (mqListenerAttached) {
    mq.removeEventListener?.("change", mqListenerAttached);
  }
  const listener = () => {
    const stored = getStoredAppearance();
    if (stored && stored.theme === "system") applyAppearance(stored);
  };
  mqListenerAttached = listener;
  mq.addEventListener?.("change", listener);

  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) apply();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    mq.removeEventListener?.("change", listener);
    window.removeEventListener("storage", onStorage);
    if (mqListenerAttached === listener) mqListenerAttached = null;
  };
}

/* ──────────────────────────────────────────────
   Curated catalogues used by the settings UI
   ────────────────────────────────────────────── */

export const COLOR_PRESETS: { name: string; hex: string }[] = [
  { name: "Deep Navy",   hex: DEFAULT_PRIMARY_HEX },
  { name: "Royal Blue",  hex: "#1e40af" },
  { name: "Forest",      hex: "#166534" },
  { name: "Emerald",     hex: "#047857" },
  { name: "Plum",        hex: "#5b21b6" },
  { name: "Wine",        hex: "#7e1d2e" },
  { name: "Charcoal",    hex: "#1f2937" },
  { name: "Midnight",    hex: "#0f172a" },
  { name: "Sunset",      hex: "#c2410c" },
  { name: "Olive",       hex: "#3f6212" },
];

export const ACCENT_PRESETS: { name: string; hex: string }[] = [
  { name: "Rose Gold",   hex: DEFAULT_ACCENT_HEX },
  { name: "Gold",        hex: "#d4a14a" },
  { name: "Amber",       hex: "#f59e0b" },
  { name: "Coral",       hex: "#fb7185" },
  { name: "Mint",        hex: "#34d399" },
  { name: "Sky",         hex: "#38bdf8" },
  { name: "Lilac",       hex: "#c4b5fd" },
  { name: "Slate",       hex: "#94a3b8" },
];

export const FONT_OPTIONS_HEADING: { label: string; value: string }[] = [
  { label: "Playfair Display (default)", value: "'Playfair Display', serif" },
  { label: "Cairo",                       value: "'Cairo', sans-serif" },
  { label: "Tajawal",                     value: "'Tajawal', sans-serif" },
  { label: "Amiri",                       value: "'Amiri', serif" },
  { label: "Merriweather",                value: "'Merriweather', serif" },
  { label: "Lora",                        value: "'Lora', serif" },
  { label: "Inter",                       value: "'Inter', sans-serif" },
];

export const FONT_OPTIONS_BODY: { label: string; value: string }[] = [
  { label: "Cairo (default)",      value: "'Cairo', 'Inter', sans-serif" },
  { label: "Tajawal",              value: "'Tajawal', sans-serif" },
  { label: "Inter",                value: "'Inter', sans-serif" },
  { label: "Roboto",               value: "'Roboto', sans-serif" },
  { label: "Open Sans",            value: "'Open Sans', sans-serif" },
  { label: "Noto Sans Arabic",     value: "'Noto Sans Arabic', sans-serif" },
  { label: "System",               value: "system-ui, -apple-system, sans-serif" },
];

export const RADIUS_PRESETS: { label: string; value: number }[] = [
  { label: "Sharp",    value: 0 },
  { label: "Subtle",   value: 0.125 },
  { label: "Default",  value: 0.25 },
  { label: "Smooth",   value: 0.5 },
  { label: "Round",    value: 0.75 },
  { label: "Pill",     value: 1.25 },
];
