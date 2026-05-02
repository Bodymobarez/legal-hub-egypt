import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  Building2, Plus, Search, Globe, Mail, ExternalLink,
  ChevronRight, Filter, Sparkles,
} from "lucide-react";
import SuperAdminLayout, { SuperHeader, SuperPanel } from "@/components/super-admin-layout";
import {
  applyTenantBranding, listTenants, onTenantsChanged,
  type Tenant, type TenantStatus, type TenantPlan,
} from "@/lib/tenants";
import { useAdminI18n } from "@/lib/admin-i18n";
import { toast } from "sonner";

const STATUS_FILTERS: ({ id: "all" | TenantStatus; label: string; labelAr: string })[] = [
  { id: "all",       label: "All",       labelAr: "الكل" },
  { id: "active",    label: "Active",    labelAr: "نشطة" },
  { id: "trial",     label: "Trial",     labelAr: "تجريبية" },
  { id: "suspended", label: "Suspended", labelAr: "موقوفة" },
];

const PLAN_FILTERS: ({ id: "all" | TenantPlan; label: string })[] = [
  { id: "all",        label: "All plans" },
  { id: "free",       label: "Free" },
  { id: "pro",        label: "Pro" },
  { id: "enterprise", label: "Enterprise" },
];

function StatusPill({ status }: { status: Tenant["status"] }) {
  const map: Record<Tenant["status"], string> = {
    active:    "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    trial:     "bg-amber-500/15  text-amber-300  border-amber-500/30",
    suspended: "bg-rose-500/15   text-rose-300   border-rose-500/30",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${map[status]}`}>
      {status === "active" ? "Active" : status === "trial" ? "Trial" : "Suspended"}
    </span>
  );
}

function PlanBadge({ plan }: { plan: Tenant["plan"] }) {
  const map: Record<Tenant["plan"], string> = {
    free:       "text-slate-300 border-slate-700 bg-slate-800/40",
    pro:        "text-sky-300   border-sky-500/30 bg-sky-500/10",
    enterprise: "text-amber-200 border-amber-500/30 bg-amber-500/10",
  };
  const label = plan.charAt(0).toUpperCase() + plan.slice(1);
  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border uppercase tracking-wider ${map[plan]}`}>
      {label}
    </span>
  );
}

function FirmCard({ tenant, onOpenAdmin }: { tenant: Tenant; onOpenAdmin: (t: Tenant) => void }) {
  const { isRtl } = useAdminI18n();
  const initials = (tenant.nameEn || tenant.nameAr || "?").trim().slice(0, 2).toUpperCase();
  const enabledModules = Object.values(tenant.modules).filter(Boolean).length;
  const totalModules   = Object.keys(tenant.modules).length;

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur p-5 hover:border-amber-500/30 transition-all relative overflow-hidden group">
      {/* Top stripe — uses the tenant's own CTA hex as a brand glance */}
      <div
        className="absolute inset-x-0 top-0 h-0.5 opacity-80"
        style={{ background: tenant.branding.ctaHex || "#c4734a" }}
      />

      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-12 h-12 rounded-xl grid place-items-center text-base font-bold shrink-0 border border-slate-700"
          style={{ background: tenant.branding.ctaHex || "#c4734a", color: "#fff" }}
        >
          {tenant.branding.logoUrl
            ? <img src={tenant.branding.logoUrl} alt="" className="w-full h-full object-contain rounded-xl p-1.5" />
            : initials}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm truncate">
            {isRtl ? (tenant.nameAr || tenant.nameEn) : (tenant.nameEn || tenant.nameAr)}
          </h3>
          <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5">{tenant.slug}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mb-3">
        <StatusPill status={tenant.status} />
        <PlanBadge plan={tenant.plan} />
      </div>

      <div className="space-y-1.5 text-[11.5px] text-slate-400 mb-4">
        {tenant.domain && (
          <div className="flex items-center gap-2">
            <Globe className="w-3 h-3 shrink-0 text-slate-500" />
            <span className="truncate">{tenant.domain}</span>
          </div>
        )}
        {tenant.contactEmail && (
          <div className="flex items-center gap-2">
            <Mail className="w-3 h-3 shrink-0 text-slate-500" />
            <span className="truncate">{tenant.contactEmail}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Sparkles className="w-3 h-3 shrink-0 text-slate-500" />
          <span>
            {enabledModules}/{totalModules} {isRtl ? "وحدة مفعّلة" : "modules enabled"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onOpenAdmin(tenant)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-200 hover:text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          {isRtl ? "افتح كهذا المكتب" : "Open as firm"}
        </button>
        <Link
          href={`/super-admin/firms/${tenant.id}`}
          className="inline-flex items-center justify-center gap-1.5 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
        >
          {isRtl ? "تفاصيل" : "Manage"}
          <ChevronRight className={`w-3.5 h-3.5 ${isRtl ? "rotate-180" : ""}`} />
        </Link>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────── */

export default function SuperAdminFirms() {
  const { isRtl } = useAdminI18n();
  const [tenants, setTenants] = useState<Tenant[]>(() => listTenants());
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TenantStatus>("all");
  const [planFilter,   setPlanFilter]   = useState<"all" | TenantPlan>("all");

  useEffect(() => onTenantsChanged(() => setTenants(listTenants())), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tenants.filter(t => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (planFilter   !== "all" && t.plan   !== planFilter)   return false;
      if (!q) return true;
      const haystack = [t.nameAr, t.nameEn, t.slug, t.domain, t.contactEmail]
        .filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [tenants, query, statusFilter, planFilter]);

  function openAsTenant(t: Tenant) {
    applyTenantBranding(t);
    toast.success(isRtl ? `تم التبديل إلى ${t.nameAr || t.nameEn}` : `Switched to ${t.nameEn || t.nameAr}`);
    setTimeout(() => { window.location.assign("/admin"); }, 200);
  }

  return (
    <SuperAdminLayout>
      <SuperHeader
        title={isRtl ? "كل المكاتب" : "All firms"}
        subtitle={
          isRtl
            ? "كل مكتب محاماة على المنصّة. ابحث، صنّف، وافتح أيّاً منها كأنك مالكه."
            : "Every law firm on the platform. Search, filter, and impersonate any of them as if you owned it."
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

      {/* Filters */}
      <SuperPanel>
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className={`w-4 h-4 absolute top-1/2 -translate-y-1/2 ${isRtl ? "right-3" : "left-3"} text-slate-500`} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={isRtl ? "ابحث بالاسم، النطاق، أو البريد…" : "Search name, domain, email…"}
              className={`w-full bg-slate-800/60 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 rounded-lg py-2 ${isRtl ? "pr-9 pl-3" : "pl-9 pr-3"} focus:outline-none focus:border-amber-500/50`}
            />
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            {STATUS_FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`text-[11px] px-2.5 py-1.5 rounded-md border transition-colors ${
                  statusFilter === f.id
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                    : "border-slate-700 text-slate-400 hover:text-white hover:border-slate-500"
                }`}
              >
                {isRtl ? f.labelAr : f.label}
              </button>
            ))}
          </div>
          <select
            value={planFilter}
            onChange={e => setPlanFilter(e.target.value as "all" | TenantPlan)}
            className="bg-slate-800/60 border border-slate-700 text-xs text-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:border-amber-500/50"
          >
            {PLAN_FILTERS.map(p => (
              <option key={p.id} value={p.id} className="bg-slate-900">{p.label}</option>
            ))}
          </select>
        </div>
      </SuperPanel>

      {/* Grid */}
      <div className="mt-5">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-12 text-center">
            <Building2 className="w-12 h-12 text-amber-300 mx-auto mb-3" />
            <p className="text-slate-200 font-medium mb-1">
              {tenants.length === 0
                ? (isRtl ? "لا توجد مكاتب بعد" : "No firms onboarded yet")
                : (isRtl ? "لا توجد نتائج للبحث" : "No firms match those filters")}
            </p>
            <p className="text-xs text-slate-500 mb-5">
              {tenants.length === 0
                ? (isRtl ? "ابدأ بإضافة أول مكتب محاماة." : "Add your first law firm to begin.")
                : (isRtl ? "جرّب توسيع المرشّحات أو امسح البحث." : "Try widening filters or clearing your search.")}
            </p>
            <Link
              href="/super-admin/firms/new"
              className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-semibold px-3.5 py-2 rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              {isRtl ? "مكتب جديد" : "Create firm"}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(t => (
              <FirmCard key={t.id} tenant={t} onOpenAdmin={openAsTenant} />
            ))}
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}
