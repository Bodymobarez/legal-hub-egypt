import { useEffect, useState } from "react";
/**
 * Multi-tenant ("Firms") store for the Super Admin Control Plane.
 *
 * The platform-level Super Admin manages MANY law-firm offices, each one
 * being its own white-label instance:
 *
 *   - Identity (name, slug, optional custom domain, contact)
 *   - White-label branding (logo, primary / accent / CTA / dark-bg colours)
 *   - Module flags (which admin modules each firm gets — appointments,
 *     invoices, chat, blog, …). Toggling these is what hides parts of the
 *     office admin sidebar.
 *   - Status (trial / active / suspended)
 *   - Plan tier (free / pro / enterprise) — purely informational for now.
 *
 * Backed by `localStorage` so the whole control-plane is a self-contained,
 * fully-functional demo without needing a tenants table on the API yet.
 * Switching to a server-backed store later is a one-file swap.
 */

import {
  applyWebsiteAppearance,
  loadWebsiteAppearance,
  saveWebsiteAppearance,
  type WebsiteAppearance,
} from "@/lib/website-appearance";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

export type TenantStatus = "trial" | "active" | "suspended";
export type TenantPlan   = "free"  | "pro"    | "enterprise";

/** All admin modules the Super Admin can flip on/off per-tenant. */
export const TENANT_MODULES = [
  "dashboard",
  "clients",
  "cases",
  "appointments",
  "chat",
  "inquiries",
  "invoices",
  "payments",
  "statements",
  "services",
  "lawyers",
  "legalLibrary",
  "blog",
  "settings",
] as const;
export type TenantModule = typeof TENANT_MODULES[number];

/**
 * Sub-features inside each module. The platform admin can flip individual
 * tabs/sections on or off per tenant — e.g. give a firm the Settings
 * module but hide its "Email Settings" tab specifically.
 *
 * Keys MUST match the `value` prop on the corresponding `<TabsTrigger>` in
 * the office-admin pages, so the gating helper can match them up cheaply.
 */
export interface ModuleFeature {
  id: string;
  en: string;
  ar: string;
}

export const MODULE_FEATURES: Partial<Record<TenantModule, ModuleFeature[]>> = {
  settings: [
    { id: "availability",   en: "Booking Hours",      ar: "أوقات الحجز"      },
    { id: "site",           en: "Office Info",        ar: "معلومات المكتب"   },
    { id: "appearance",     en: "Appearance",         ar: "المظهر"           },
    { id: "website",        en: "Website Look",       ar: "مظهر الموقع"      },
    { id: "notifications",  en: "Notifications",      ar: "الإشعارات"        },
    { id: "email",          en: "Email Settings",     ar: "إعدادات البريد"   },
    { id: "payments",       en: "Payment Systems",    ar: "أنظمة الدفع"      },
  ],
  chat: [
    { id: "conversations",  en: "Conversations",      ar: "المحادثات"        },
    { id: "autoreply",      en: "Auto-Reply",         ar: "الرد التلقائي"    },
    { id: "hours",          en: "Working Hours",      ar: "أوقات العمل"      },
  ],
  clients: [
    { id: "overview",       en: "Overview",           ar: "نظرة عامة"        },
    { id: "cases",          en: "Cases",              ar: "القضايا"          },
    { id: "appointments",   en: "Appointments",       ar: "المواعيد"         },
    { id: "invoices",       en: "Invoices",           ar: "الفواتير"         },
  ],
  cases: [
    { id: "overview",       en: "Overview",           ar: "نظرة عامة"        },
    { id: "timeline",       en: "Timeline",           ar: "الجدول الزمني"    },
    { id: "documents",      en: "Documents",          ar: "المستندات"        },
    { id: "invoices",       en: "Invoices",           ar: "الفواتير"         },
  ],
};

/** Total enable-able toggles a tenant can have (modules + their features). */
export function totalToggleCount(): number {
  let total = TENANT_MODULES.length;
  for (const m of TENANT_MODULES) total += (MODULE_FEATURES[m]?.length ?? 0);
  return total;
}

export interface TenantBranding {
  /** Primary brand colour (admin + public). Empty ⇒ inherit theme default. */
  primaryHex: string;
  /** Accent / secondary brand colour. */
  accentHex: string;
  /** Public-site CTA button colour (drives the full ramp). */
  ctaHex: string;
  /** Public-site dark-section background. */
  deepHex: string;
  /** Public site logo (data-URL or absolute URL). */
  logoUrl: string;
  /** Browser favicon. */
  faviconUrl: string;
}

export interface Tenant {
  id: string;
  /** URL-safe slug, e.g. "egypt-advocates". */
  slug: string;
  nameAr: string;
  nameEn: string;
  /** Optional custom domain (e.g. "lawfirm.com"). Display-only for now. */
  domain: string;
  contactEmail: string;
  contactPhone: string;
  status: TenantStatus;
  plan: TenantPlan;
  branding: TenantBranding;
  /** Module → enabled. Missing keys default to enabled. */
  modules: Record<TenantModule, boolean>;
  /**
   * Per-module sub-feature flags, e.g.
   *   { settings: { email: false, payments: true }, chat: { autoreply: false } }
   * Missing keys default to enabled — old tenants in localStorage keep working.
   */
  moduleFeatures: Partial<Record<TenantModule, Record<string, boolean>>>;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp of last update — used in "last activity" displays. */
  updatedAt: string;
  /** Free-text notes the platform admin keeps about this tenant. */
  notes: string;
}

/* ──────────────────────────────────────────────
   Constants
   ────────────────────────────────────────────── */

const STORAGE_KEY = "super_admin_tenants";
const ACTIVE_KEY  = "super_admin_active_tenant";
const EVENT_NAME  = "super-admin-tenants-updated";

export const DEFAULT_TENANT_BRANDING: TenantBranding = {
  primaryHex: "",
  accentHex: "",
  ctaHex: "#c4734a",
  deepHex: "#0d152a",
  logoUrl: "",
  faviconUrl: "",
};

export const ALL_MODULES_ENABLED: Record<TenantModule, boolean> =
  TENANT_MODULES.reduce(
    (acc, m) => ({ ...acc, [m]: true }),
    {} as Record<TenantModule, boolean>,
  );

/** All sub-features enabled, ready to clone into a fresh tenant. */
export const ALL_FEATURES_ENABLED: Partial<Record<TenantModule, Record<string, boolean>>> =
  Object.fromEntries(
    (Object.entries(MODULE_FEATURES) as [TenantModule, ModuleFeature[]][])
      .map(([m, feats]) => [
        m,
        feats.reduce((acc, f) => ({ ...acc, [f.id]: true }), {} as Record<string, boolean>),
      ]),
  ) as Partial<Record<TenantModule, Record<string, boolean>>>;

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */

const rid = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : `t_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function emit() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT_NAME));
  }
}

function readRaw(): unknown {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function normalizeTenant(raw: Partial<Tenant>): Tenant {
  /* Merge stored sub-feature flags onto the all-enabled defaults so that
     newly-introduced features automatically opt-in for existing tenants. */
  const mergedFeatures: Partial<Record<TenantModule, Record<string, boolean>>> = {};
  for (const m of TENANT_MODULES) {
    const defaults = ALL_FEATURES_ENABLED[m];
    if (!defaults) continue;
    mergedFeatures[m] = { ...defaults, ...(raw.moduleFeatures?.[m] ?? {}) };
  }

  return {
    id: raw.id ?? rid(),
    slug: raw.slug ?? slugify(raw.nameEn ?? raw.nameAr ?? "firm"),
    nameAr: raw.nameAr ?? "",
    nameEn: raw.nameEn ?? "",
    domain: raw.domain ?? "",
    contactEmail: raw.contactEmail ?? "",
    contactPhone: raw.contactPhone ?? "",
    status: raw.status ?? "active",
    plan: raw.plan ?? "free",
    branding: { ...DEFAULT_TENANT_BRANDING, ...(raw.branding ?? {}) },
    modules: { ...ALL_MODULES_ENABLED, ...(raw.modules ?? {}) },
    moduleFeatures: mergedFeatures,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
    notes: raw.notes ?? "",
  };
}

/* ──────────────────────────────────────────────
   Seed data — gives the platform a starting point with the existing
   "Egypt Advocates" firm so toggling modules / opening admin works
   immediately without manual setup.
   ────────────────────────────────────────────── */

const SEED_TENANTS: Tenant[] = [
  normalizeTenant({
    id: "tenant-egypt-advocates",
    slug: "egypt-advocates",
    nameAr: "مكتب مصر للمحاماة",
    nameEn: "Egypt Advocates",
    domain: "egyptadvocates.com",
    contactEmail: "info@egyptadvocates.com",
    contactPhone: "+20 122 7655 853",
    status: "active",
    plan: "enterprise",
    branding: {
      primaryHex: "",
      accentHex: "",
      ctaHex: "#c4734a",
      deepHex: "#0d152a",
      logoUrl: "",
      faviconUrl: "",
    },
    notes: "Founding firm — full module access.",
  }),
];

/* ──────────────────────────────────────────────
   CRUD
   ────────────────────────────────────────────── */

export function listTenants(): Tenant[] {
  if (typeof window === "undefined") return [];
  const raw = readRaw();
  if (!Array.isArray(raw)) {
    /* First boot — seed and persist. */
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_TENANTS));
    return SEED_TENANTS.map(normalizeTenant);
  }
  return (raw as Partial<Tenant>[]).map(normalizeTenant);
}

export function getTenant(id: string): Tenant | null {
  return listTenants().find(t => t.id === id) ?? null;
}

export function getTenantBySlug(slug: string): Tenant | null {
  return listTenants().find(t => t.slug === slug) ?? null;
}

export function saveTenant(t: Tenant): Tenant {
  const all = listTenants();
  const idx = all.findIndex(x => x.id === t.id);
  const next = { ...t, updatedAt: new Date().toISOString() };
  if (idx === -1) {
    all.push(next);
  } else {
    all[idx] = next;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  emit();
  return next;
}

export function createTenant(input: Partial<Tenant>): Tenant {
  const t = normalizeTenant({
    ...input,
    id: rid(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return saveTenant(t);
}

export function deleteTenant(id: string): void {
  const next = listTenants().filter(t => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  if (getActiveTenantId() === id) clearActiveTenant();
  emit();
}

export function duplicateTenant(id: string): Tenant | null {
  const src = getTenant(id);
  if (!src) return null;
  return createTenant({
    ...src,
    nameEn: `${src.nameEn} (Copy)`,
    nameAr: `${src.nameAr} (نسخة)`,
    slug: `${src.slug}-copy-${Math.floor(Math.random() * 1000)}`,
    domain: "",
  });
}

/* ──────────────────────────────────────────────
   Active tenant + white-label switching
   ────────────────────────────────────────────── */

export function getActiveTenantId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_KEY);
}

export function getActiveTenant(): Tenant | null {
  const id = getActiveTenantId();
  return id ? getTenant(id) : null;
}

export function setActiveTenant(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id);
  emit();
}

export function clearActiveTenant(): void {
  localStorage.removeItem(ACTIVE_KEY);
  emit();
}

/**
 * Push the tenant's branding into the public-site appearance store and
 * apply it immediately. Used when the platform admin clicks "Open admin
 * as this firm" or "Preview website as this firm".
 */
export function applyTenantBranding(t: Tenant): void {
  const current = loadWebsiteAppearance();
  const next: WebsiteAppearance = {
    ...current,
    logoUrl: t.branding.logoUrl || current.logoUrl,
    faviconUrl: t.branding.faviconUrl || current.faviconUrl,
    primaryColorOverride: t.branding.primaryHex || current.primaryColorOverride,
    accentColorOverride: t.branding.accentHex || current.accentColorOverride,
    ctaColor: t.branding.ctaHex || current.ctaColor,
    siteDeepColor: t.branding.deepHex || current.siteDeepColor,
  };
  saveWebsiteAppearance(next);
  applyWebsiteAppearance(next);
  setActiveTenant(t.id);
}

/* ──────────────────────────────────────────────
   React subscription helpers (used by pages that need to live-update
   when tenants are mutated)
   ────────────────────────────────────────────── */

export function onTenantsChanged(cb: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onLocal = () => cb();
  const onStore = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === ACTIVE_KEY) cb();
  };
  window.addEventListener(EVENT_NAME, onLocal);
  window.addEventListener("storage", onStore);
  return () => {
    window.removeEventListener(EVENT_NAME, onLocal);
    window.removeEventListener("storage", onStore);
  };
}

/* ──────────────────────────────────────────────
   Aggregate stats — feed the Super Admin dashboard.
   ────────────────────────────────────────────── */

export interface TenantStats {
  total: number;
  active: number;
  trial: number;
  suspended: number;
  byPlan: Record<TenantPlan, number>;
  recentlyAdded: Tenant[];
}

export function getTenantStats(): TenantStats {
  const all = listTenants();
  const byPlan: Record<TenantPlan, number> = { free: 0, pro: 0, enterprise: 0 };
  let active = 0, trial = 0, suspended = 0;
  for (const t of all) {
    byPlan[t.plan] = (byPlan[t.plan] ?? 0) + 1;
    if (t.status === "active") active += 1;
    if (t.status === "trial") trial += 1;
    if (t.status === "suspended") suspended += 1;
  }
  const recentlyAdded = [...all]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 5);
  return { total: all.length, active, trial, suspended, byPlan, recentlyAdded };
}

/* ──────────────────────────────────────────────
   Module gating — used by AdminLayout's sidebar to hide modules disabled
   for the active tenant.
   ────────────────────────────────────────────── */

const PATH_TO_MODULE: { match: (path: string) => boolean; module: TenantModule }[] = [
  { match: p => p === "/admin" || p === "/admin/",     module: "dashboard"    },
  { match: p => p.startsWith("/admin/clients"),        module: "clients"      },
  { match: p => p.startsWith("/admin/cases"),          module: "cases"        },
  { match: p => p.startsWith("/admin/appointments"),   module: "appointments" },
  { match: p => p.startsWith("/admin/chat"),           module: "chat"         },
  { match: p => p.startsWith("/admin/inquiries"),      module: "inquiries"    },
  { match: p => p.startsWith("/admin/invoices"),       module: "invoices"     },
  { match: p => p.startsWith("/admin/payments"),       module: "payments"     },
  { match: p => p.startsWith("/admin/statements"),     module: "statements"   },
  { match: p => p.startsWith("/admin/services"),       module: "services"     },
  { match: p => p.startsWith("/admin/lawyers"),        module: "lawyers"      },
  { match: p => p.startsWith("/admin/legal-articles"), module: "legalLibrary" },
  { match: p => p.startsWith("/admin/blog-posts"),     module: "blog"         },
  { match: p => p.startsWith("/admin/settings"),       module: "settings"     },
];

export function moduleForPath(path: string): TenantModule | null {
  return PATH_TO_MODULE.find(r => r.match(path))?.module ?? null;
}

/** True if the active tenant has the given module enabled (or no active tenant set). */
export function isModuleEnabled(module: TenantModule | null): boolean {
  if (!module) return true;
  const t = getActiveTenant();
  if (!t) return true;
  return t.modules[module] !== false;
}

/** Catalog of sub-features for a module (empty array if the module has none). */
export function featuresFor(module: TenantModule | null): ModuleFeature[] {
  if (!module) return [];
  return MODULE_FEATURES[module] ?? [];
}

/**
 * True if the active tenant has the given (module, feature) sub-tab enabled.
 * Falls back to enabled when there's no active tenant or the flag is missing,
 * so the office admin keeps working in single-tenant mode.
 */
export function isFeatureEnabled(
  module: TenantModule | null,
  featureId: string,
): boolean {
  if (!module) return true;
  const t = getActiveTenant();
  if (!t) return true;
  if (t.modules[module] === false) return false;
  const flags = t.moduleFeatures?.[module];
  if (!flags) return true;
  return flags[featureId] !== false;
}

/**
 * Subscribe to active-tenant / feature-flag changes. Returns an unsubscribe.
 * Same wire as `onTenantsChanged` but exported under a name that reads better
 * inside React components that gate UI on feature flags.
 */
export const onTenantConfigChanged = onTenantsChanged;

/**
 * React hook: returns a memoised gate function for the given module that
 * re-renders the host component whenever the active tenant's feature flags
 * change. Use inside admin pages to filter `<TabsTrigger>` / `<TabsContent>`
 * lists.
 *
 *   const gate = useFeatureGate("settings");
 *   const tabs = ALL_TABS.filter(t => gate(t.id));
 */
export function useFeatureGate(module: TenantModule | null) {
  const [, bump] = useState(0);
  useEffect(() => onTenantsChanged(() => bump(n => n + 1)), []);
  return (featureId: string) => isFeatureEnabled(module, featureId);
}
