import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Users, Briefcase, FileText,
  CalendarDays, MessageSquare, Receipt,
  FileQuestion, Scale, BookOpen, Settings, LogOut, X, Languages,
  ChevronRight, SlidersHorizontal, MoreHorizontal, Menu, ShieldCheck,
  Wallet, Crown, Eye, Lock,
} from "lucide-react";
import { useAdminLogout, useAdminMe } from "@workspace/api-client-react";
import { useAdminI18n } from "@/lib/admin-i18n";
import {
  resolvePermissions, isSuperAdmin, getViewAs, setViewAs,
  loadLockdown, type ViewAsState, type LockdownState,
} from "@/lib/permissions";
import { isModuleEnabled, moduleForPath } from "@/lib/tenants";
import { AdminNotificationsBell } from "@/components/admin-notifications";
import AdminRouteGuard from "@/components/admin-route-guard";

/* ─── Nav item with optional permission gate ─── */
type NavItem = { href: string; label: string; icon: React.ComponentType<any>; permKey?: string };

/* ─── All nav groups (used in sidebar) ─── */
function useNavGroups(ta: (k: string) => string, isRtl: boolean, perms: Record<string, boolean> | null) {
  const show = (key?: string) => !key || !perms || perms[key] !== false;

  const all = [
    {
      label: isRtl ? "الرئيسية" : "Overview",
      items: [
        { href: "/admin",             label: ta("nav.dashboard"),    icon: LayoutDashboard, permKey: "viewDashboard" },
      ],
    },
    {
      label: isRtl ? "إدارة العمل" : "Management",
      items: [
        { href: "/admin/clients",      label: ta("nav.clients"),      icon: Users,          permKey: "viewClients" },
        { href: "/admin/cases",        label: ta("nav.cases"),        icon: Briefcase,      permKey: "viewCases" },
        { href: "/admin/appointments", label: ta("nav.appointments"), icon: CalendarDays,   permKey: "viewAppointments" },
        { href: "/admin/chat",         label: ta("nav.chat"),         icon: MessageSquare,  permKey: "viewChat" },
        { href: "/admin/inquiries",    label: ta("nav.inquiries"),    icon: FileQuestion,   permKey: "viewInquiries" },
      ],
    },
    {
      label: isRtl ? "المالية" : "Finance",
      items: [
        { href: "/admin/invoices",   label: ta("nav.invoices"),                                      icon: FileText, permKey: "viewInvoices" },
        { href: "/admin/payments",   label: ta("nav.payments"),                                      icon: Receipt,  permKey: "viewPayments" },
        { href: "/admin/statements", label: isRtl ? "كشف حساب العملاء" : "Customer Statements",     icon: Wallet,   permKey: "viewInvoices" },
      ],
    },
    {
      label: isRtl ? "المحتوى" : "Content",
      items: [
        { href: "/admin/services",       label: ta("nav.services"),     icon: Settings,  permKey: "manageServices" },
        { href: "/admin/lawyers",        label: ta("nav.lawyers"),      icon: Scale,     permKey: "manageLawyers" },
        { href: "/admin/legal-articles", label: ta("nav.legalLibrary"), icon: BookOpen,  permKey: "manageContent" },
        { href: "/admin/blog-posts",     label: ta("nav.blogPosts"),    icon: FileText,  permKey: "manageContent" },
      ],
    },
    {
      label: isRtl ? "النظام" : "System",
      items: [
        { href: "/admin/settings", label: ta("nav.settings"), icon: SlidersHorizontal, permKey: "manageSettings" },
        { href: "/admin/users",    label: isRtl ? "المستخدمون والصلاحيات" : "Users & Permissions", icon: ShieldCheck, permKey: "manageUsers" },
      ],
    },
  ];

  /* Filter by both per-user permissions AND active-tenant module flags
     so disabling a module from the Super Admin Control Plane immediately
     hides it from this firm's sidebar. */
  return all.map(group => ({
    ...group,
    items: group.items
      .filter(item => show(item.permKey))
      .filter(item => isModuleEnabled(moduleForPath(item.href))),
  })).filter(group => group.items.length > 0);
}

/* ─── Mobile bottom tabs — 5 most used ─── */
function useBottomTabs(ta: (k: string) => string, perms: Record<string, boolean> | null) {
  const show = (key: string) => !perms || perms[key] !== false;
  return [
    { href: "/admin",              label: ta("nav.dashboard"),    icon: LayoutDashboard, permKey: "viewDashboard" },
    { href: "/admin/clients",      label: ta("nav.clients"),      icon: Users,           permKey: "viewClients" },
    { href: "/admin/cases",        label: ta("nav.cases"),        icon: Briefcase,       permKey: "viewCases" },
    { href: "/admin/appointments", label: ta("nav.appointments"), icon: CalendarDays,    permKey: "viewAppointments" },
    { href: "/admin/chat",         label: ta("nav.chat"),         icon: MessageSquare,   permKey: "viewChat" },
  ]
    .filter(t => show(t.permKey))
    .filter(t => isModuleEnabled(moduleForPath(t.href)));
}

/* ─────────────────────────────────────────────── */

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { ta, lang, setLang, isRtl } = useAdminI18n();

  const { data: user, isLoading, isError } = useAdminMe({
    query: { retry: false, queryKey: [] as const } as any,
  });
  const logout = useAdminLogout();

  /* Subscribe to view-as / lockdown updates so the layout reflects them. */
  const [viewAs, setViewAsState] = useState<ViewAsState | null>(() =>
    typeof window !== "undefined" ? getViewAs() : null,
  );
  const [lockdown, setLockdown] = useState<LockdownState>(() =>
    typeof window !== "undefined" ? loadLockdown() : { enabled: false },
  );
  useEffect(() => {
    const refreshVA = () => setViewAsState(getViewAs());
    const refreshLD = () => setLockdown(loadLockdown());
    window.addEventListener("admin-view-as-updated", refreshVA);
    window.addEventListener("admin-lockdown-updated", refreshLD);
    window.addEventListener("storage", () => { refreshVA(); refreshLD(); });
    return () => {
      window.removeEventListener("admin-view-as-updated", refreshVA);
      window.removeEventListener("admin-lockdown-updated", refreshLD);
    };
  }, []);

  /**
   * Resolved permissions:
   *   - super_admin (and view-as off): unrestricted
   *   - everyone else (admin/lawyer/support, or super_admin while view-as'ing):
   *       restricted by their stored permission map
   */
  const superAdmin = user && isSuperAdmin(user.role) && !viewAs;
  const perms = !user || superAdmin
    ? null
    : resolvePermissions(user.email, user.role);

  useEffect(() => {
    if (isError) setLocation("/admin/login");
  }, [isError]);

  /* Lockdown — bounce non-super-admins to a blank screen. */
  if (user && lockdown.enabled && !isSuperAdmin(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "hsl(220,40%,8%)" }}>
        <div className="max-w-md text-center text-white/80 space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
            <Lock className="w-7 h-7 text-amber-400" />
          </div>
          <h1 className="text-2xl font-serif font-bold">{isRtl ? "النظام في وضع الصيانة" : "System under maintenance"}</h1>
          <p className="text-sm text-white/60 leading-relaxed">
            {isRtl
              ? lockdown.reasonAr || "لوحة التحكم متوقفة مؤقتاً من قبل المشرف العام. حاول لاحقاً."
              : lockdown.reasonEn || "The admin panel is temporarily paused by the super admin. Please try again later."}
          </p>
          <button
            onClick={() => { logout.mutate(undefined as any); setLocation("/admin/login"); }}
            className="text-xs text-white/60 hover:text-white underline"
          >
            {isRtl ? "تسجيل خروج" : "Sign out"}
          </button>
        </div>
      </div>
    );
  }

  if (isError) return null;
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(220,40%,6%)" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-[hsl(40,80%,50%)] border-t-transparent animate-spin" />
          <p className="text-sm text-white/40">Loading…</p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    try { await logout.mutateAsync(); } catch {}
    setLocation("/admin/login");
  };

  const navGroups = useNavGroups(ta, isRtl, perms);
  const bottomTabs = useBottomTabs(ta, perms);

  const isActive = (href: string) =>
    href === "/admin" ? location === "/admin" : location.startsWith(href);

  const dir = isRtl ? "rtl" : "ltr";
  const sidebarSide = isRtl ? "right-0" : "left-0";
  const sidebarHidden = isRtl ? "translate-x-full" : "-translate-x-full";
  const borderSide = isRtl ? "border-l" : "border-r";

  return (
    <div className="min-h-dvh flex" dir={dir} style={{ background: "hsl(220,30%,96%)" }}>

      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ══════════════════════════════
          SIDEBAR (desktop always visible,
          mobile: slides in as drawer)
         ══════════════════════════════ */}
      <aside
        className={`
          fixed inset-y-0 ${sidebarSide} z-50 w-[260px] flex flex-col
          ${borderSide} border-white/5
          transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static
          ${sidebarOpen ? "translate-x-0" : sidebarHidden}
        `}
        style={{ background: "hsl(220,40%,8%)" }}
      >
        {/* Gold accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-linear-to-r from-transparent via-[hsl(40,80%,50%)] to-transparent" />

        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 shrink-0" dir="ltr">
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-[hsl(40,80%,50%)]/40 shrink-0">
            <img src="/logo.png" alt="Egypt Advocates" className="w-full h-full object-cover" />
          </div>
          <Link href="/admin" className="flex-1 min-w-0">
            <p className="font-serif font-bold text-white text-sm leading-tight truncate">Egypt Advocates</p>
            <p className="text-[10px] text-white/30 leading-none mt-0.5 truncate">Admin Portal</p>
          </Link>
          <button
            className="lg:hidden text-white/40 hover:text-white shrink-0 ms-auto"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav groups */}
        <div className="flex-1 overflow-y-auto py-3 scrollbar-thin" dir={dir}>
          {navGroups.map(group => (
            <div key={group.label} className="mb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 px-5 py-2">
                {group.label}
              </p>
              <div className="space-y-0.5 px-3">
                {group.items.map(item => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                        transition-all duration-150 group relative
                        ${active
                          ? "bg-[hsl(40,80%,50%)]/15 text-[hsl(40,80%,65%)]"
                          : "text-white/50 hover:bg-white/5 hover:text-white/80"
                        }
                      `}
                    >
                      {active && (
                        <span className={`absolute ${isRtl ? "right-0" : "left-0"} inset-y-1 w-0.5 rounded-full bg-[hsl(40,80%,50%)]`} />
                      )}
                      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-[hsl(40,80%,60%)]" : ""}`} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {active && <ChevronRight className={`w-3 h-3 opacity-50 shrink-0 ${isRtl ? "rotate-180" : ""}`} />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar footer */}
        <div className="p-4 border-t border-white/5 shrink-0 space-y-2" dir={dir}>
          <button
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
          >
            <Languages className="h-4 w-4 shrink-0" />
            <span>{lang === "ar" ? "Switch to English" : "التبديل للعربية"}</span>
            <span className="ms-auto text-[10px] bg-white/10 px-2 py-0.5 rounded-full font-mono">
              {lang === "ar" ? "EN" : "AR"}
            </span>
          </button>

          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5">
            <div className={`h-7 w-7 rounded-full flex items-center justify-center font-bold shrink-0 text-xs border ${
              isSuperAdmin(user?.role)
                ? "bg-purple-500/25 border-purple-400/40 text-purple-300"
                : "bg-[hsl(40,80%,50%)]/20 border-[hsl(40,80%,50%)]/30 text-[hsl(40,80%,60%)]"
            }`}>
              {isSuperAdmin(user?.role) ? <Crown className="w-3.5 h-3.5" /> : (user?.name?.charAt(0) ?? "A")}
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-xs font-medium text-white/70 truncate flex items-center gap-1">
                {user?.name}
                {isSuperAdmin(user?.role) && <Crown className="w-3 h-3 text-purple-300" />}
              </p>
              <p className="text-[10px] text-white/30 truncate capitalize">
                {isSuperAdmin(user?.role) ? (isRtl ? "مشرف عام" : "Super Admin") : user?.role?.replace("_", " ")}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {ta("nav.logout")}
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════
          MAIN CONTENT
         ══════════════════════════════ */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile top bar */}
        <header
          dir={dir}
          className="h-14 flex items-center px-4 shrink-0 lg:hidden border-b border-border/50 bg-card/90 backdrop-blur-sm gap-3"
        >
          <button
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-md"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-full overflow-hidden border border-border shrink-0">
              <img src="/logo.png" alt="Egypt Advocates" className="w-full h-full object-cover" />
            </div>
            <span className="font-serif font-semibold text-sm truncate">{ta("nav.adminPortal")}</span>
          </div>
          <AdminNotificationsBell
            className="w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-muted/50"
            iconClassName="w-4.5 h-4.5"
          />
          <button
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-full px-2.5 py-1 transition-colors"
          >
            <Languages className="h-3 w-3" />
            {lang === "ar" ? "EN" : "AR"}
          </button>
        </header>

        {/* Desktop top bar — slim header with notifications */}
        <header
          dir={dir}
          className="hidden lg:flex h-12 items-center justify-end gap-2 px-6 shrink-0 border-b border-border/50 bg-card/70 backdrop-blur-sm"
        >
          <AdminNotificationsBell
            className="w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-muted/50"
            iconClassName="w-4.5 h-4.5"
          />
        </header>

        {/* View-As banner — only when super admin is impersonating */}
        {viewAs && isSuperAdmin(user?.role) && (
          <div dir={dir} className="px-4 py-2 bg-purple-600 text-white text-xs flex items-center justify-between gap-3 shrink-0 border-b border-purple-500">
            <div className="flex items-center gap-2 min-w-0">
              <Eye className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {isRtl
                  ? `أنت تشاهد كـ "${viewAs.name || viewAs.email || viewAs.role}" — لن ترى أي شيء ممنوع عليه.`
                  : `Viewing as "${viewAs.name || viewAs.email || viewAs.role}" — restricted to what they can see.`}
              </span>
            </div>
            <button
              onClick={() => setViewAs(null)}
              className="text-[10px] font-semibold bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded shrink-0 transition-colors"
            >
              {isRtl ? "إنهاء المعاينة" : "Exit preview"}
            </button>
          </div>
        )}

        {/* Page content — pb-20 on mobile so bottom nav doesn't cover it */}
        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
          <AdminRouteGuard>{children}</AdminRouteGuard>
        </div>
      </main>

      {/* ══════════════════════════════
          MOBILE BOTTOM TAB BAR
         ══════════════════════════════ */}
      <nav
        dir={dir}
        className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-card border-t border-border/60"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-stretch h-16">
          {bottomTabs.map(tab => {
            const Icon = tab.icon;
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex-1 flex flex-col items-center justify-center gap-1 text-[9px] font-medium transition-colors relative ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {active && (
                  <span className="absolute top-0 inset-x-2 h-0.5 rounded-full bg-primary" />
                )}
                <Icon className={`h-5 w-5 ${active ? "text-primary" : ""}`} />
                <span className="leading-none truncate max-w-[48px] text-center">{tab.label}</span>
              </Link>
            );
          })}

          {/* More button — opens sidebar drawer */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1 text-[9px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="leading-none">{isRtl ? "المزيد" : "More"}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
