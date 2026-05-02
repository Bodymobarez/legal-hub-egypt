/**
 * Super Admin Control-Plane layout.
 *
 * This is the chrome for the platform-level "Super Admin" — distinct from
 * any one law-firm's admin. It uses its own dark sidebar, its own brand
 * ("Legal Hub — Control Plane"), and its own navigation. From here the
 * platform owner manages MULTIPLE law-firm tenants and can issue full
 * white-label instances per firm.
 */

import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Building2, LayoutDashboard, Sparkles, Activity,
  Settings as SettingsIcon, ShieldCheck, ArrowLeft, Crown, Plus,
  ExternalLink, ChevronRight, Lock, LogOut,
} from "lucide-react";
import {
  useAdminMe, useAdminLogout, getAdminMeQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminI18n } from "@/lib/admin-i18n";
import { isSuperAdmin } from "@/lib/permissions";
import { getActiveTenant, listTenants, onTenantsChanged } from "@/lib/tenants";

/* Mirrors the constant defined in `pages/super-admin/login.tsx`. The login
   page silently auto-redirects to the dashboard when this hint is set,
   so we MUST drop it on logout to prevent a redirect loop. */
const SUPER_ADMIN_SESSION_HINT_KEY = "lh:super-admin:session-hint";

interface NavItem {
  href: string;
  labelEn: string;
  labelAr: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

const NAV: NavItem[] = [
  { href: "/super-admin",            labelEn: "Overview",      labelAr: "نظرة عامة",   icon: LayoutDashboard, exact: true },
  { href: "/super-admin/firms",      labelEn: "Firms",         labelAr: "المكاتب",     icon: Building2 },
  { href: "/super-admin/firms/new",  labelEn: "Create Firm",   labelAr: "مكتب جديد",   icon: Plus },
  { href: "/super-admin/audit",      labelEn: "Activity",      labelAr: "النشاط",      icon: Activity },
  { href: "/super-admin/settings",   labelEn: "Platform",      labelAr: "النظام",      icon: SettingsIcon },
];

function isCurrent(loc: string, href: string, exact?: boolean): boolean {
  if (exact) return loc === href;
  return loc === href || loc.startsWith(`${href}/`);
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { lang, setLang, isRtl } = useAdminI18n();
  const [tenantCount, setTenantCount] = useState(() => listTenants().length);
  const [active, setActive] = useState(() => getActiveTenant());

  /* Hard gate — only super-admins reach the control plane.
     - Not signed in            → redirect to dedicated /super-admin/login
     - Signed in, wrong role    → "elevated access required" screen
     - Signed in, correct role  → render the page */
  const { data: user, isLoading } = useAdminMe({
    query: { retry: false, queryKey: [] as const } as any,
  });
  const logout = useAdminLogout();
  const qc = useQueryClient();
  const userIsSuper = isSuperAdmin((user as { role?: string } | undefined)?.role);

  /* Redirect unauthenticated visitors to the platform login. */
  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/super-admin/login", { replace: true });
    }
  }, [isLoading, user, navigate]);

  async function doLogout() {
    try { await logout.mutateAsync(); } catch { /* best effort */ }
    /* Drop the stale `useAdminMe` cache so the redirect-on-mount in the
       login page (and the unauth gate above) picks up the new state
       immediately, instead of seeing the previously-cached user. */
    qc.removeQueries({ queryKey: getAdminMeQueryKey() });
    /* Bury the auto-redirect hint, otherwise the login page would
       silently probe `/api/admin/me` and bounce us straight back here
       (after 401-clearing the hint anyway) — wasted round-trip. */
    if (typeof window !== "undefined") {
      localStorage.removeItem(SUPER_ADMIN_SESSION_HINT_KEY);
    }
    navigate("/super-admin/login", { replace: true });
  }

  useEffect(() => {
    const refresh = () => {
      setTenantCount(listTenants().length);
      setActive(getActiveTenant());
    };
    return onTenantsChanged(refresh);
  }, []);

  /* Loading + un-authenticated states render the same dark scrim so the
     transition into the login page is seamless (no flash of either
     content or "denied" screen). */
  if (isLoading || !user) {
    return (
      <div
        dir={isRtl ? "rtl" : "ltr"}
        className="min-h-dvh grid place-items-center bg-slate-950 text-slate-100"
      >
        <div className="text-center text-slate-500 text-xs flex items-center gap-2">
          <span className="w-3 h-3 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
          {isRtl ? "جارٍ التحقق…" : "Verifying access…"}
        </div>
      </div>
    );
  }

  if (!userIsSuper) {
    return (
      <div
        dir={isRtl ? "rtl" : "ltr"}
        className="min-h-dvh grid place-items-center bg-slate-950 text-slate-100 p-6"
      >
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 grid place-items-center mb-4">
            <Lock className="w-7 h-7 text-amber-300" />
          </div>
          <h1 className="text-xl font-bold mb-2">
            {isRtl ? "وصول مقيّد" : "Elevated access required"}
          </h1>
          <p className="text-sm text-slate-400 mb-5 leading-relaxed">
            {isRtl
              ? "مركز التحكم Legal Hub متاح فقط لحسابات «مالك المنصّة». تواصل مع المسؤول إذا كنت تحتاج وصولاً."
              : "The Legal Hub Control Plane is only available to platform-owner accounts. Contact your administrator if you need access."}
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={doLogout}
              className="inline-flex items-center gap-1.5 text-sm text-slate-300 hover:text-white px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-500 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {isRtl ? "تسجيل الخروج" : "Sign out"}
            </button>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-sm text-amber-200 hover:text-white px-4 py-2 rounded-lg border border-amber-500/30 hover:bg-amber-500/10 transition-colors"
            >
              <ArrowLeft className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} />
              {isRtl ? "العودة لإدارة المكتب" : "Back to office admin"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="min-h-dvh flex bg-slate-950 text-slate-100"
    >
      {/* ──────────────── Sidebar ──────────────── */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-e border-slate-800/80 bg-slate-900/60 backdrop-blur">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-linear-to-br from-amber-500 via-amber-400 to-orange-500 grid place-items-center shadow-lg shadow-amber-500/20">
              <Crown className="w-5 h-5 text-slate-900" />
            </div>
            <div className="leading-tight">
              <p className="text-[15px] font-bold tracking-tight">Legal Hub</p>
              <p className="text-[10.5px] text-amber-300/90 uppercase tracking-widest font-medium">
                Control Plane
              </p>
            </div>
          </div>
        </div>

        {/* Tenant counter chip */}
        <div className="px-4 pt-4">
          <div className="rounded-xl border border-slate-800 bg-slate-800/40 px-3 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Building2 className="w-3.5 h-3.5" />
              {isRtl ? "مكاتب نشطة" : "Active firms"}
            </div>
            <span className="text-sm font-mono font-bold text-amber-300">
              {tenantCount}
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(item => {
            const current = isCurrent(location, item.href, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group ${
                  current
                    ? "bg-amber-500/15 text-amber-200 border border-amber-500/20"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent"
                }`}
              >
                <Icon className={`w-4 h-4 ${current ? "text-amber-300" : "text-slate-400 group-hover:text-slate-200"}`} />
                <span className="flex-1 truncate">{isRtl ? item.labelAr : item.labelEn}</span>
                {current && <ChevronRight className={`w-3.5 h-3.5 text-amber-300 ${isRtl ? "rotate-180" : ""}`} />}
              </Link>
            );
          })}
        </nav>

        {/* Active-tenant footer + back-to-office */}
        <div className="border-t border-slate-800/80 p-3 space-y-2">
          {active && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-[11px]">
              <p className="text-amber-300/80 uppercase tracking-wider font-semibold mb-0.5">
                {isRtl ? "مفعّل حالياً" : "Currently active"}
              </p>
              <p className="text-amber-100 font-medium truncate">
                {isRtl ? active.nameAr : active.nameEn}
              </p>
            </div>
          )}
          <Link
            href="/admin"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <ArrowLeft className={`w-3.5 h-3.5 ${isRtl ? "rotate-180" : ""}`} />
            {isRtl ? "العودة لإدارة المكتب" : "Back to office admin"}
          </Link>
        </div>
      </aside>

      {/* ──────────────── Main column ──────────────── */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile + desktop) */}
        <header className="sticky top-0 z-30 backdrop-blur bg-slate-950/85 border-b border-slate-800/80">
          <div className="px-4 md:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 lg:hidden">
              <div className="w-8 h-8 rounded-lg bg-linear-to-br from-amber-500 to-orange-500 grid place-items-center">
                <Crown className="w-4 h-4 text-slate-900" />
              </div>
              <p className="font-bold text-sm">Legal Hub <span className="text-amber-300/80 font-medium">Control Plane</span></p>
            </div>

            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
              {isRtl
                ? "أنت تتصرف كمالك المنصة — لديك صلاحيات كاملة على جميع المكاتب."
                : "Acting as platform owner — full authority over every firm."}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setLang(lang === "ar" ? "en" : "ar")}
                className="text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded-md border border-slate-700/70 hover:bg-slate-800/60 transition-colors"
                title="Toggle language"
              >
                {lang === "ar" ? "English" : "AR"}
              </button>
              <Link
                href="/"
                className="text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded-md border border-slate-700/70 hover:bg-slate-800/60 transition-colors flex items-center gap-1.5"
                title="Open public site"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {isRtl ? "الموقع" : "Site"}
              </Link>
              <button
                onClick={doLogout}
                className="text-xs text-rose-300 hover:text-rose-200 px-2.5 py-1.5 rounded-md border border-rose-500/30 hover:bg-rose-500/10 transition-colors flex items-center gap-1.5"
                title={isRtl ? "تسجيل الخروج من لوحة التحكم العليا" : "Sign out of control plane"}
              >
                <LogOut className="w-3.5 h-3.5" />
                {isRtl ? "خروج" : "Sign out"}
              </button>
            </div>
          </div>

          {/* Mobile mini-nav */}
          <nav className="lg:hidden flex gap-1 overflow-x-auto px-3 pb-3">
            {NAV.map(item => {
              const current = isCurrent(location, item.href, item.exact);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors ${
                    current
                      ? "bg-amber-500/15 text-amber-200 border border-amber-500/20"
                      : "text-slate-300 hover:text-white border border-slate-800 hover:bg-slate-800/60"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {isRtl ? item.labelAr : item.labelEn}
                </Link>
              );
            })}
          </nav>
        </header>

        {/* Page body */}
        <div className="flex-1 overflow-auto">
          {/* Subtle spotlight bg pattern that we reuse on every page */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-0 opacity-[0.04]
                            bg-[radial-gradient(circle_at_25%_-10%,#fbbf24_0,transparent_45%),
                                radial-gradient(circle_at_85%_110%,#3b82f6_0,transparent_45%)]" />
            <div className="relative px-4 md:px-6 lg:px-8 py-6">
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Re-usable building blocks — keep all super-admin pages visually
   coherent without each having to re-declare card styles.
   ────────────────────────────────────────────── */

export function SuperPanel({
  title, subtitle, action, icon, children,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur p-5 shadow-xl shadow-black/20">
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-2.5 min-w-0">
            {icon && (
              <div className="w-7 h-7 rounded-md bg-amber-500/10 border border-amber-500/20 grid place-items-center text-amber-300 shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              {title && <h2 className="text-base font-semibold tracking-tight text-slate-100">{title}</h2>}
              {subtitle && <p className="text-[11.5px] text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function SuperHeader({
  title, subtitle, action,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        <div className="inline-flex items-center gap-2 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span className="text-[10.5px] uppercase tracking-widest text-amber-300/80 font-semibold">
            Super Admin
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-1.5 max-w-2xl">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
