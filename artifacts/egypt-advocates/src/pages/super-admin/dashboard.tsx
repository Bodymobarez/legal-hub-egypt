import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  Building2, CheckCircle2, Clock, Ban, TrendingUp,
  ArrowRight, Plus, Sparkles, Activity, Crown, Globe,
} from "lucide-react";
import SuperAdminLayout, { SuperHeader, SuperPanel } from "@/components/super-admin-layout";
import {
  applyTenantBranding, getActiveTenant, getTenantStats,
  listTenants, onTenantsChanged, type Tenant, type TenantStats,
} from "@/lib/tenants";
import { useAdminI18n } from "@/lib/admin-i18n";
import { toast } from "sonner";

/* ──────────────────────────────────────────────
   Tiny KPI / status helpers
   ────────────────────────────────────────────── */

function StatusPill({ status }: { status: Tenant["status"] }) {
  const map: Record<Tenant["status"], { label: string; className: string }> = {
    active:    { label: "Active",    className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
    trial:     { label: "Trial",     className: "bg-amber-500/15  text-amber-300  border-amber-500/30"   },
    suspended: { label: "Suspended", className: "bg-rose-500/15   text-rose-300   border-rose-500/30"    },
  };
  const m = map[status];
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${m.className}`}>
      {m.label}
    </span>
  );
}

function PlanBadge({ plan }: { plan: Tenant["plan"] }) {
  const map: Record<Tenant["plan"], { label: string; className: string }> = {
    free:       { label: "Free",       className: "text-slate-300 border-slate-700 bg-slate-800/40" },
    pro:        { label: "Pro",        className: "text-sky-300   border-sky-500/30 bg-sky-500/10"   },
    enterprise: { label: "Enterprise", className: "text-amber-200 border-amber-500/30 bg-amber-500/10" },
  };
  const m = map[plan];
  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border uppercase tracking-wider ${m.className}`}>
      {m.label}
    </span>
  );
}

function Kpi({
  icon: Icon, label, value, accent, sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  accent: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur p-5 relative overflow-hidden">
      <div className={`absolute -top-6 -inset-e-6 w-28 h-28 rounded-full opacity-15 blur-2xl ${accent}`} />
      <div className="flex items-center justify-between mb-3 relative">
        <div className={`w-10 h-10 rounded-xl border border-slate-800 grid place-items-center ${accent} bg-opacity-20`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <p className="text-[11px] uppercase tracking-widest text-slate-400 font-medium">{label}</p>
      <p className="text-3xl font-bold tracking-tight text-white mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

/* ────────────────────────────────────────────── */

function FirmRow({ tenant, onOpenAdmin }: { tenant: Tenant; onOpenAdmin: (t: Tenant) => void }) {
  const { isRtl } = useAdminI18n();
  const initials = (tenant.nameEn || tenant.nameAr || "?").trim().slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800/40 transition-colors group">
      <div
        className="w-10 h-10 rounded-lg grid place-items-center text-sm font-bold shrink-0 border border-slate-700"
        style={{ background: tenant.branding.ctaHex || "#c4734a", color: "#fff" }}
      >
        {tenant.branding.logoUrl
          ? <img src={tenant.branding.logoUrl} alt="" className="w-full h-full object-contain rounded-lg p-1" />
          : initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm text-slate-100 truncate">
            {isRtl ? (tenant.nameAr || tenant.nameEn) : (tenant.nameEn || tenant.nameAr)}
          </p>
          <StatusPill status={tenant.status} />
          <PlanBadge plan={tenant.plan} />
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
          <span className="font-mono">{tenant.slug}</span>
          {tenant.domain && (
            <span className="inline-flex items-center gap-1">
              <Globe className="w-3 h-3" />
              {tenant.domain}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onOpenAdmin(tenant)}
          className="text-[11px] px-2.5 py-1.5 rounded-md border border-amber-500/30 text-amber-300 hover:bg-amber-500/10 transition-colors"
          title={isRtl ? "افتح إدارة هذا المكتب" : "Open this firm's admin"}
        >
          {isRtl ? "افتح كـ" : "Open as"}
        </button>
        <Link
          href={`/super-admin/firms/${tenant.id}`}
          className="text-[11px] px-2.5 py-1.5 rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
        >
          {isRtl ? "إدارة" : "Manage"}
        </Link>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────── */

export default function SuperAdminDashboard() {
  const { isRtl } = useAdminI18n();
  const [stats, setStats] = useState<TenantStats>(() => getTenantStats());
  const [active, setActive] = useState(() => getActiveTenant());

  useEffect(() => {
    const refresh = () => {
      setStats(getTenantStats());
      setActive(getActiveTenant());
    };
    return onTenantsChanged(refresh);
  }, []);

  function openAsTenant(t: Tenant) {
    applyTenantBranding(t);
    toast.success(isRtl ? `تم التبديل إلى ${t.nameAr || t.nameEn}` : `Switched to ${t.nameEn || t.nameAr}`);
    setTimeout(() => { window.location.assign("/admin"); }, 200);
  }

  return (
    <SuperAdminLayout>
      <SuperHeader
        title={isRtl ? "مرحباً بك في مركز التحكم" : "Welcome to the Control Plane"}
        subtitle={
          isRtl
            ? "هنا تدير منصّة Legal Hub بالكامل: المكاتب، التراخيص، الـ White-label، والوحدات المفعّلة لكل مكتب."
            : "From here you control the entire Legal Hub platform — every law firm, its modules, its white-label brand, and its plan."
        }
        action={
          <Link
            href="/super-admin/firms/new"
            className="inline-flex items-center gap-1.5 bg-linear-to-br from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-900 text-sm font-semibold px-4 py-2 rounded-lg shadow-lg shadow-amber-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            {isRtl ? "مكتب جديد" : "New firm"}
          </Link>
        }
      />

      {/* Active-tenant ribbon */}
      {active && (
        <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-center gap-3">
          <Crown className="w-4 h-4 text-amber-300" />
          <div className="flex-1 min-w-0 text-sm">
            <span className="text-amber-200 font-semibold">
              {isRtl ? "أنت تتحكم حالياً في:" : "Currently impersonating:"}{" "}
            </span>
            <span className="text-white">{isRtl ? (active.nameAr || active.nameEn) : (active.nameEn || active.nameAr)}</span>
          </div>
          <Link
            href="/admin"
            className="text-[11px] text-amber-200 hover:text-white px-2.5 py-1 rounded-md border border-amber-500/30 hover:bg-amber-500/10 transition-colors"
          >
            {isRtl ? "افتح الإدارة" : "Open admin"}
          </Link>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi icon={Building2}    label={isRtl ? "إجمالي المكاتب" : "Total firms"}  value={stats.total}     accent="bg-amber-500"   sub={isRtl ? "تحت إدارتك" : "under your control"} />
        <Kpi icon={CheckCircle2} label={isRtl ? "نشطة" : "Active"}                 value={stats.active}    accent="bg-emerald-500" sub={`${Math.round((stats.active / Math.max(stats.total, 1)) * 100)}% ${isRtl ? "من الإجمالي" : "of total"}`} />
        <Kpi icon={Clock}        label={isRtl ? "تجريبية" : "On trial"}            value={stats.trial}     accent="bg-sky-500" />
        <Kpi icon={Ban}          label={isRtl ? "موقوفة" : "Suspended"}            value={stats.suspended} accent="bg-rose-500" />
      </div>

      {/* Two-column grid: recent firms + plan breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <SuperPanel
            title={isRtl ? "أحدث المكاتب" : "Recently added firms"}
            subtitle={isRtl ? "آخر 5 مكاتب تم إضافتها للمنصّة." : "The 5 most recently added firms on the platform."}
            action={
              <Link
                href="/super-admin/firms"
                className="text-xs text-amber-300 hover:text-amber-200 inline-flex items-center gap-1"
              >
                {isRtl ? "كل المكاتب" : "All firms"}
                <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? "rotate-180" : ""}`} />
              </Link>
            }
          >
            {stats.recentlyAdded.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center">
                <Sparkles className="w-8 h-8 text-amber-300 mx-auto mb-2" />
                <p className="text-sm text-slate-300 mb-1">
                  {isRtl ? "لا توجد مكاتب بعد" : "No firms onboarded yet"}
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  {isRtl ? "ابدأ بإضافة أول مكتب محاماة لمنصّتك." : "Start by adding your first law firm to the platform."}
                </p>
                <Link
                  href="/super-admin/firms/new"
                  className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isRtl ? "إنشاء أول مكتب" : "Create first firm"}
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                {stats.recentlyAdded.map(t => (
                  <FirmRow key={t.id} tenant={t} onOpenAdmin={openAsTenant} />
                ))}
              </div>
            )}
          </SuperPanel>
        </div>

        <div className="space-y-5">
          <SuperPanel
            title={isRtl ? "توزيع الباقات" : "Plan distribution"}
            subtitle={isRtl ? "عدد المكاتب لكل باقة." : "Firm count per pricing tier."}
          >
            {(["enterprise", "pro", "free"] as const).map(plan => {
              const n = stats.byPlan[plan];
              const pct = stats.total ? (n / stats.total) * 100 : 0;
              const label = plan === "enterprise" ? "Enterprise" : plan === "pro" ? "Pro" : "Free";
              const color = plan === "enterprise"
                ? "bg-amber-500"
                : plan === "pro"
                ? "bg-sky-500"
                : "bg-slate-500";
              return (
                <div key={plan} className="mb-3 last:mb-0">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-300">{label}</span>
                    <span className="font-mono text-slate-400">{n}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full ${color} transition-all duration-500`}
                      style={{ width: `${Math.max(2, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </SuperPanel>

          <SuperPanel
            title={isRtl ? "إجراءات سريعة" : "Quick actions"}
          >
            <div className="space-y-1.5">
              <Link
                href="/super-admin/firms/new"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-slate-800 hover:border-amber-500/40 hover:bg-amber-500/5 transition-colors group"
              >
                <Plus className="w-4 h-4 text-amber-300" />
                <span className="text-sm text-slate-200 flex-1">{isRtl ? "أضف مكتباً جديداً" : "Onboard a new firm"}</span>
                <ArrowRight className={`w-3.5 h-3.5 text-slate-500 group-hover:text-amber-300 ${isRtl ? "rotate-180" : ""}`} />
              </Link>
              <Link
                href="/super-admin/firms"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-slate-800 hover:border-amber-500/40 hover:bg-amber-500/5 transition-colors group"
              >
                <Building2 className="w-4 h-4 text-amber-300" />
                <span className="text-sm text-slate-200 flex-1">{isRtl ? "كل المكاتب" : "Browse all firms"}</span>
                <ArrowRight className={`w-3.5 h-3.5 text-slate-500 group-hover:text-amber-300 ${isRtl ? "rotate-180" : ""}`} />
              </Link>
              <Link
                href="/super-admin/audit"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-slate-800 hover:border-amber-500/40 hover:bg-amber-500/5 transition-colors group"
              >
                <Activity className="w-4 h-4 text-amber-300" />
                <span className="text-sm text-slate-200 flex-1">{isRtl ? "نشاط المنصّة" : "Platform activity"}</span>
                <ArrowRight className={`w-3.5 h-3.5 text-slate-500 group-hover:text-amber-300 ${isRtl ? "rotate-180" : ""}`} />
              </Link>
            </div>
          </SuperPanel>
        </div>
      </div>

      {/* Hint about how the system works */}
      <div className="mt-6 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 flex items-start gap-3">
        <TrendingUp className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-400 leading-relaxed">
          {isRtl ? (
            <>
              💡 <strong className="text-slate-200">كيف يعمل White-label:</strong> كل مكتب له شعار، ألوان (Primary، Accent، CTA، الخلفية الداكنة)،
              نطاق مخصّص، وحزمة الوحدات الخاصة به. عندما تضغط <em>"افتح كـ"</em> على أي مكتب، يتم تطبيق هويته الكاملة
              فوراً ثم تنتقل إلى لوحة الإدارة الخاصة به مباشرة.
            </>
          ) : (
            <>
              💡 <strong className="text-slate-200">How white-label works:</strong> each firm carries its own logo, palette
              (primary, accent, CTA button, dark background), custom domain, and module bundle. Hitting <em>"Open as"</em> on
              any firm pushes its full brand into the runtime and drops you into that firm's admin panel.
            </>
          )}
        </div>
      </div>
    </SuperAdminLayout>
  );
}
