import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import {
  ArrowLeft, Building2, Trash2, Copy, ExternalLink,
  Save, Check, AlertTriangle, Eye, RotateCcw, Sparkles,
  Layers, Palette, Settings as SettingsIcon, FileText,
  Globe, Mail, Phone, Crown, ChevronDown,
} from "lucide-react";
import SuperAdminLayout, { SuperHeader, SuperPanel } from "@/components/super-admin-layout";
import {
  ALL_FEATURES_ENABLED, ALL_MODULES_ENABLED, applyTenantBranding,
  deleteTenant, duplicateTenant, getTenant, MODULE_FEATURES,
  onTenantsChanged, saveTenant, slugify, TENANT_MODULES,
  type Tenant, type TenantBranding, type TenantModule,
  type TenantPlan, type TenantStatus,
} from "@/lib/tenants";
import { useAdminI18n } from "@/lib/admin-i18n";
import { toast } from "sonner";

const MODULE_LABELS: Record<TenantModule, { en: string; ar: string }> = {
  dashboard:    { en: "Dashboard",         ar: "اللوحة الرئيسية" },
  clients:      { en: "Clients",           ar: "العملاء" },
  cases:        { en: "Cases",             ar: "القضايا" },
  appointments: { en: "Appointments",      ar: "المواعيد" },
  chat:         { en: "Chat & Support",    ar: "الدردشة" },
  inquiries:    { en: "Inquiries",         ar: "الطلبات" },
  invoices:     { en: "Invoices",          ar: "الفواتير" },
  payments:     { en: "Payments",          ar: "المدفوعات" },
  statements:   { en: "Statements",        ar: "كشوف الحسابات" },
  services:     { en: "Services",          ar: "الخدمات" },
  lawyers:      { en: "Lawyers",           ar: "المحامون" },
  legalLibrary: { en: "Legal library",     ar: "المكتبة القانونية" },
  blog:         { en: "Blog posts",        ar: "المدوّنة" },
  settings:     { en: "Settings",          ar: "الإعدادات" },
  users:        { en: "Users & Permissions", ar: "المستخدمون والصلاحيات" },
};

const STATUS_OPTS: TenantStatus[] = ["active", "trial", "suspended"];
const PLAN_OPTS:   TenantPlan[]   = ["free", "pro", "enterprise"];

/* ────────────────────────────────────────────── */

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <label className="block text-xs text-slate-300 font-medium mb-1.5">
      {children}
      {hint && <span className="text-slate-500 font-normal ms-1">— {hint}</span>}
    </label>
  );
}

function TextField(props: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; dir?: "ltr" | "rtl"; hint?: string;
  prefix?: React.ReactNode;
}) {
  const { label, value, onChange, placeholder, type = "text", dir, hint, prefix } = props;
  return (
    <div>
      <FieldLabel hint={hint}>{label}</FieldLabel>
      <div className="relative">
        {prefix && (
          <span className="absolute inset-y-0 start-0 flex items-center ps-3 text-slate-500 pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          type={type}
          dir={dir}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-slate-800/60 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 rounded-lg py-2 ${prefix ? "ps-9 pe-3" : "px-3"} focus:outline-none focus:border-amber-500/50`}
        />
      </div>
    </div>
  );
}

function ColorField({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || placeholder}
          onChange={e => onChange(e.target.value)}
          className="h-9 w-11 rounded-md border border-slate-700 bg-slate-800 cursor-pointer p-0.5"
        />
        <input
          type="text"
          dir="ltr"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-slate-800/60 border border-slate-700 text-xs font-mono text-slate-100 placeholder:text-slate-500 rounded-md py-2 px-2.5 focus:outline-none focus:border-amber-500/50"
        />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────── */

export default function SuperAdminFirmDetail() {
  const { isRtl } = useAdminI18n();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/super-admin/firms/:id");
  const id = params?.id ?? "";

  const [tenant, setTenant] = useState<Tenant | null>(() => getTenant(id));
  const [draft,  setDraft]  = useState<Tenant | null>(tenant);
  const [confirmDelete, setConfirmDelete] = useState(false);
  /* Which module cards are showing their sub-feature list.
     Default: settings is expanded (largest tab set, where this matters most). */
  const [expanded, setExpanded] = useState<Set<TenantModule>>(
    () => new Set(["settings"]),
  );

  /* Refresh when localStorage changes elsewhere. */
  useEffect(() => {
    return onTenantsChanged(() => {
      const fresh = getTenant(id);
      setTenant(fresh);
      setDraft(prev => prev ?? fresh);
    });
  }, [id]);

  const dirty = useMemo(() => {
    if (!tenant || !draft) return false;
    return JSON.stringify(tenant) !== JSON.stringify(draft);
  }, [tenant, draft]);

  if (!tenant || !draft) {
    return (
      <SuperAdminLayout>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-10 text-center">
          <Building2 className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-200 font-medium mb-1">{isRtl ? "المكتب غير موجود" : "Firm not found"}</p>
          <p className="text-xs text-slate-500 mb-5">
            {isRtl
              ? "ربما تم حذفه أو تغيّر معرّفه. عُد إلى قائمة المكاتب."
              : "It may have been deleted or its ID may have changed. Head back to the firms list."}
          </p>
          <Link
            href="/super-admin/firms"
            className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-semibold px-3.5 py-2 rounded-md transition-colors"
          >
            <ArrowLeft className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} />
            {isRtl ? "كل المكاتب" : "All firms"}
          </Link>
        </div>
      </SuperAdminLayout>
    );
  }

  function patch<K extends keyof Tenant>(key: K, value: Tenant[K]) {
    setDraft(d => d ? { ...d, [key]: value } : d);
  }

  function patchBrand<K extends keyof TenantBranding>(key: K, value: TenantBranding[K]) {
    setDraft(d => d ? { ...d, branding: { ...d.branding, [key]: value } } : d);
  }

  /* ──────────────────────────────────────────────
     Module / feature toggles auto-persist immediately so the platform
     admin never wonders why a refresh wiped their click. Each helper
     mutates `draft`, persists to localStorage, and updates the
     committed `tenant` in one shot. Other fields (branding, name, …)
     still go through the explicit Save button.
     ────────────────────────────────────────────── */
  function persistDraft(updater: (d: Tenant) => Tenant) {
    setDraft(d => {
      if (!d) return d;
      const next = updater(d);
      const saved = saveTenant(next);
      setTenant(saved);
      return saved;
    });
  }

  function toggleModule(m: TenantModule) {
    persistDraft(d => ({ ...d, modules: { ...d.modules, [m]: !d.modules[m] } }));
  }

  function toggleFeature(m: TenantModule, fid: string) {
    persistDraft(d => {
      const current = d.moduleFeatures?.[m] ?? {};
      const nextFlag = current[fid] === false ? true : false;
      return {
        ...d,
        moduleFeatures: {
          ...d.moduleFeatures,
          [m]: { ...current, [fid]: nextFlag },
        },
      };
    });
  }

  function setAllFeatures(m: TenantModule, on: boolean) {
    persistDraft(d => {
      const feats = MODULE_FEATURES[m] ?? [];
      const next = feats.reduce(
        (acc, f) => ({ ...acc, [f.id]: on }),
        {} as Record<string, boolean>,
      );
      return {
        ...d,
        moduleFeatures: { ...d.moduleFeatures, [m]: next },
      };
    });
  }

  function save() {
    if (!draft) return;
    const saved = saveTenant(draft);
    setTenant(saved);
    setDraft(saved);
    toast.success(isRtl ? "تم حفظ التغييرات" : "Changes saved");
  }

  function reset() { setDraft(tenant); }

  function openAsTenant() {
    applyTenantBranding(tenant!);
    toast.success(isRtl ? `تم التبديل إلى ${tenant!.nameAr || tenant!.nameEn}` : `Switched to ${tenant!.nameEn || tenant!.nameAr}`);
    setTimeout(() => { window.location.assign("/admin"); }, 200);
  }

  function previewSite() {
    applyTenantBranding(tenant!);
    setTimeout(() => { window.location.assign("/"); }, 200);
  }

  function doDuplicate() {
    const clone = duplicateTenant(tenant!.id);
    if (clone) {
      toast.success(isRtl ? "تم النسخ" : "Firm duplicated");
      navigate(`/super-admin/firms/${clone.id}`);
    }
  }

  function doDelete() {
    deleteTenant(tenant!.id);
    toast.success(isRtl ? "تم حذف المكتب" : "Firm deleted");
    navigate("/super-admin/firms");
  }

  const moduleEnabledCount = Object.values(draft.modules).filter(Boolean).length;

  /* Total / on counts across modules + sub-features so the panel header can
     show e.g. "21 / 32" when several tabs are also disabled. */
  const { featureTotal, featureOn } = useMemo(() => {
    let total = 0;
    let on = 0;
    for (const m of TENANT_MODULES) {
      const feats = MODULE_FEATURES[m] ?? [];
      total += feats.length;
      const flags = draft.moduleFeatures?.[m] ?? {};
      for (const f of feats) {
        if (flags[f.id] !== false) on += 1;
      }
    }
    return { featureTotal: total, featureOn: on };
  }, [draft.moduleFeatures]);

  const totalToggles = TENANT_MODULES.length + featureTotal;
  const onToggles    = moduleEnabledCount + featureOn;

  const initials = (draft.nameEn || draft.nameAr || "?").trim().slice(0, 2).toUpperCase();

  return (
    <SuperAdminLayout>
      <SuperHeader
        title={
          <span className="flex items-center gap-3">
            <span
              className="w-9 h-9 rounded-lg grid place-items-center text-sm font-bold text-white border border-slate-700"
              style={{ background: draft.branding.ctaHex || "#c4734a" }}
            >
              {draft.branding.logoUrl
                ? <img src={draft.branding.logoUrl} alt="" className="w-full h-full object-contain rounded-lg p-1" />
                : initials}
            </span>
            {isRtl ? (draft.nameAr || draft.nameEn) : (draft.nameEn || draft.nameAr)}
          </span>
        }
        subtitle={
          <span className="font-mono text-[11px]">{draft.slug}{draft.domain ? ` · ${draft.domain}` : ""}</span>
        }
        action={
          <>
            <button
              onClick={previewSite}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              {isRtl ? "معاينة الموقع" : "Preview site"}
            </button>
            <button
              onClick={openAsTenant}
              className="inline-flex items-center gap-1.5 bg-linear-to-br from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-900 text-sm font-semibold px-4 py-2 rounded-lg shadow-lg shadow-amber-500/20 transition-all"
            >
              <Crown className="w-4 h-4" />
              {isRtl ? "افتح إدارة المكتب" : "Open admin as firm"}
            </button>
          </>
        }
      />

      {/* Sticky save bar when dirty */}
      {dirty && (
        <div className="sticky top-0 z-20 -mx-4 md:-mx-6 lg:-mx-8 mb-5 px-4 md:px-6 lg:px-8">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-md px-4 py-2.5 flex items-center justify-between gap-3">
            <p className="text-xs text-amber-100 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              {isRtl ? "لديك تغييرات غير محفوظة" : "You have unsaved changes"}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={reset}
                className="text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded-md border border-slate-700 hover:border-slate-500 transition-colors inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                {isRtl ? "تجاهل" : "Discard"}
              </button>
              <button
                onClick={save}
                className="text-xs bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-3 py-1.5 rounded-md transition-colors inline-flex items-center gap-1"
              >
                <Save className="w-3 h-3" />
                {isRtl ? "حفظ" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ───── Left column: identity + branding + modules ───── */}
        <div className="lg:col-span-2 space-y-5">
          <SuperPanel title={isRtl ? "الهوية" : "Identity"} icon={<Building2 className="w-4 h-4" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField label={isRtl ? "الاسم بالإنجليزية" : "English name"} value={draft.nameEn} onChange={v => patch("nameEn", v)} dir="ltr" />
              <TextField label={isRtl ? "الاسم بالعربية" : "Arabic name"} value={draft.nameAr} onChange={v => patch("nameAr", v)} dir="rtl" />
              <TextField label="Slug" value={draft.slug} onChange={v => patch("slug", slugify(v))} dir="ltr" hint={isRtl ? "حروف صغيرة وشُرَط" : "lowercase, dashes only"} />
              <TextField label={isRtl ? "النطاق" : "Domain"} value={draft.domain} onChange={v => patch("domain", v)} dir="ltr" prefix={<Globe className="w-3.5 h-3.5" />} />
              <TextField label={isRtl ? "البريد" : "Email"} value={draft.contactEmail} onChange={v => patch("contactEmail", v)} dir="ltr" prefix={<Mail className="w-3.5 h-3.5" />} />
              <TextField label={isRtl ? "الهاتف" : "Phone"} value={draft.contactPhone} onChange={v => patch("contactPhone", v)} dir="ltr" prefix={<Phone className="w-3.5 h-3.5" />} />
            </div>
            <div className="mt-4">
              <FieldLabel>{isRtl ? "ملاحظات داخلية" : "Internal notes"}</FieldLabel>
              <textarea
                value={draft.notes}
                onChange={e => patch("notes", e.target.value)}
                rows={3}
                placeholder={isRtl ? "أي ملاحظات تخص هذا المكتب..." : "Anything you want to remember…"}
                className="w-full bg-slate-800/60 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500/50 resize-y"
              />
            </div>
          </SuperPanel>

          <SuperPanel title={isRtl ? "العلامة التجارية" : "Brand identity"} icon={<Palette className="w-4 h-4" />}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-3">
                <TextField label={isRtl ? "رابط الشعار" : "Logo URL"} value={draft.branding.logoUrl} onChange={v => patchBrand("logoUrl", v)} dir="ltr" />
                <TextField label={isRtl ? "أيقونة المتصفح" : "Favicon URL"} value={draft.branding.faviconUrl} onChange={v => patchBrand("faviconUrl", v)} dir="ltr" />
                <div className="grid grid-cols-2 gap-3">
                  <ColorField label={isRtl ? "الرئيسي" : "Primary"} value={draft.branding.primaryHex} onChange={v => patchBrand("primaryHex", v)} placeholder="#17264d" />
                  <ColorField label={isRtl ? "التمييز" : "Accent"} value={draft.branding.accentHex} onChange={v => patchBrand("accentHex", v)} placeholder="#c4734a" />
                  <ColorField label={isRtl ? "زر CTA" : "CTA"} value={draft.branding.ctaHex} onChange={v => patchBrand("ctaHex", v)} placeholder="#c4734a" />
                  <ColorField label={isRtl ? "خلفية داكنة" : "Dark bg"} value={draft.branding.deepHex} onChange={v => patchBrand("deepHex", v)} placeholder="#0d152a" />
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-2">{isRtl ? "معاينة" : "Preview"}</p>
                <div
                  className="rounded-2xl overflow-hidden border border-slate-700"
                  style={{ background: draft.branding.deepHex || "#0d152a" }}
                >
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div
                        className="w-12 h-12 rounded-xl grid place-items-center font-bold text-white shrink-0"
                        style={{ background: draft.branding.ctaHex || "#c4734a" }}
                      >
                        {draft.branding.logoUrl
                          ? <img src={draft.branding.logoUrl} alt="" className="w-full h-full object-contain rounded-xl p-1" />
                          : initials}
                      </div>
                      <div>
                        <p className="text-white font-semibold">
                          {isRtl ? (draft.nameAr || draft.nameEn) : (draft.nameEn || draft.nameAr)}
                        </p>
                        <p className="text-white/50 text-[11px] font-mono">{draft.slug}</p>
                      </div>
                    </div>
                    <p className="text-white/70 text-sm mb-5 leading-relaxed">
                      {isRtl
                        ? "حلول قانونية موثوقة. خبرة متجدّدة، نتائج فعلية."
                        : "Trusted legal solutions. Proven experience, real-world results."}
                    </p>
                    <button
                      type="button"
                      className="text-white text-sm font-semibold px-5 py-2.5 rounded-md"
                      style={{ background: draft.branding.ctaHex || "#c4734a" }}
                    >
                      {isRtl ? "احجز استشارة" : "Book a Consultation"}
                    </button>
                  </div>
                  <div className="h-1.5" style={{ background: draft.branding.primaryHex || "#17264d" }} />
                </div>
              </div>
            </div>
          </SuperPanel>

          <SuperPanel
            title={isRtl ? "الوحدات المفعّلة" : "Enabled modules"}
            subtitle={
              <span className="flex items-center gap-2">
                <span>{onToggles}/{totalToggles} {isRtl ? "مفعّل" : "enabled"}</span>
                <span className="text-slate-700">·</span>
                <span className="text-slate-500">
                  {moduleEnabledCount}/{TENANT_MODULES.length} {isRtl ? "وحدة" : "modules"} ·{" "}
                  {featureOn}/{featureTotal} {isRtl ? "تاب فرعي" : "sub-tabs"}
                </span>
              </span>
            }
            icon={<Layers className="w-4 h-4" />}
            action={
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  onClick={() => persistDraft(d => ({
                    ...d,
                    modules: { ...ALL_MODULES_ENABLED },
                    moduleFeatures: structuredClone(ALL_FEATURES_ENABLED),
                  }))}
                  className="text-amber-300 hover:text-amber-200"
                >
                  {isRtl ? "فعّل الكل" : "Enable all"}
                </button>
                <span className="text-slate-700">·</span>
                <button
                  onClick={() => persistDraft(d => ({
                    ...d,
                    modules: TENANT_MODULES.reduce((acc, m) => ({ ...acc, [m]: false }), {} as Record<TenantModule, boolean>),
                  }))}
                  className="text-slate-400 hover:text-rose-300"
                >
                  {isRtl ? "عطّل الكل" : "Disable all"}
                </button>
              </div>
            }
          >
            <div className="space-y-2">
              {TENANT_MODULES.map(m => {
                const on = draft.modules[m] !== false;
                const feats = MODULE_FEATURES[m] ?? [];
                const hasFeats = feats.length > 0;
                const isOpen = expanded.has(m);
                const flags = draft.moduleFeatures?.[m] ?? {};
                const featOn = feats.filter(f => flags[f.id] !== false).length;
                const allOn  = featOn === feats.length;
                const noneOn = featOn === 0;

                return (
                  <div
                    key={m}
                    className={`rounded-xl border overflow-hidden transition-colors ${
                      on
                        ? "bg-emerald-500/4 border-emerald-500/25"
                        : "bg-slate-800/20 border-slate-700"
                    }`}
                  >
                    {/* ── module header row ── */}
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => toggleModule(m)}
                        className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                        title={isRtl ? "تبديل الوحدة" : "Toggle module"}
                      >
                        <div
                          className={`w-4 h-4 rounded grid place-items-center shrink-0 ${
                            on ? "bg-emerald-500 text-slate-900" : "border border-slate-600"
                          }`}
                        >
                          {on && <Check className="w-3 h-3" />}
                        </div>
                        <span className={`text-xs font-semibold truncate ${on ? "text-emerald-100" : "text-slate-400"}`}>
                          {isRtl ? MODULE_LABELS[m].ar : MODULE_LABELS[m].en}
                        </span>
                        {hasFeats && (
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                              !on
                                ? "bg-slate-800 text-slate-600"
                                : allOn
                                ? "bg-emerald-500/15 text-emerald-300"
                                : noneOn
                                ? "bg-rose-500/15 text-rose-300"
                                : "bg-amber-500/15 text-amber-300"
                            }`}
                          >
                            {featOn}/{feats.length}
                          </span>
                        )}
                      </button>
                      {hasFeats && (
                        <button
                          type="button"
                          onClick={() => setExpanded(prev => {
                            const next = new Set(prev);
                            if (next.has(m)) next.delete(m); else next.add(m);
                            return next;
                          })}
                          className="text-slate-400 hover:text-white p-1 rounded transition-colors shrink-0"
                          title={isOpen
                            ? (isRtl ? "طيّ التابات" : "Collapse tabs")
                            : (isRtl ? "اعرض التابات" : "Show tabs")}
                          aria-expanded={isOpen}
                        >
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        </button>
                      )}
                    </div>

                    {/* ── sub-features panel ── */}
                    {hasFeats && isOpen && (
                      <div className={`border-t px-3 py-2.5 space-y-1.5 ${on ? "border-emerald-500/15 bg-slate-950/30" : "border-slate-700/60 bg-slate-900/40"}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-[10.5px] uppercase tracking-wider text-slate-500 font-semibold">
                            {isRtl ? "التابات الفرعية" : "Sub-tabs"}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <button
                              type="button"
                              disabled={!on}
                              onClick={() => setAllFeatures(m, true)}
                              className="text-emerald-300/80 hover:text-emerald-200 disabled:text-slate-600 disabled:cursor-not-allowed"
                            >
                              {isRtl ? "الكل" : "All on"}
                            </button>
                            <span className="text-slate-700">·</span>
                            <button
                              type="button"
                              disabled={!on}
                              onClick={() => setAllFeatures(m, false)}
                              className="text-slate-400 hover:text-rose-300 disabled:text-slate-600 disabled:cursor-not-allowed"
                            >
                              {isRtl ? "لا شيء" : "All off"}
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {feats.map(f => {
                            const fOn = flags[f.id] !== false;
                            const effective = on && fOn;
                            return (
                              <button
                                key={f.id}
                                type="button"
                                disabled={!on}
                                onClick={() => toggleFeature(m, f.id)}
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-left transition-colors ${
                                  !on
                                    ? "border-slate-800 bg-slate-900/40 text-slate-600 cursor-not-allowed"
                                    : effective
                                    ? "border-emerald-500/25 bg-emerald-500/6 text-emerald-100 hover:border-emerald-500/40"
                                    : "border-slate-700 bg-slate-800/40 text-slate-500 hover:border-slate-600"
                                }`}
                              >
                                <div
                                  className={`w-3 h-3 rounded grid place-items-center shrink-0 ${
                                    effective
                                      ? "bg-emerald-500 text-slate-900"
                                      : "border border-slate-600"
                                  }`}
                                >
                                  {effective && <Check className="w-2 h-2" strokeWidth={4} />}
                                </div>
                                <span className="text-[11px] font-medium truncate">
                                  {isRtl ? f.ar : f.en}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        {!on && (
                          <p className="text-[10px] text-slate-500 italic pt-1">
                            {isRtl
                              ? "فعّل الوحدة أولاً ليعمل التحكم في تاباتها."
                              : "Enable the module to control its sub-tabs."}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </SuperPanel>
        </div>

        {/* ───── Right column: status, plan, danger zone ───── */}
        <div className="space-y-5">
          <SuperPanel title={isRtl ? "الحالة" : "Status"} icon={<Sparkles className="w-4 h-4" />}>
            <div className="space-y-1.5">
              {STATUS_OPTS.map(s => {
                const sel = draft.status === s;
                const meta = {
                  active:    { en: "Active",    ar: "نشطة",   color: "emerald" },
                  trial:     { en: "Trial",     ar: "تجريبية", color: "amber"   },
                  suspended: { en: "Suspended", ar: "موقوفة", color: "rose"    },
                }[s];
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => patch("status", s)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${
                      sel
                        ? `border-${meta.color}-500/50 bg-${meta.color}-500/10`
                        : "border-slate-700 hover:border-slate-500"
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full bg-${meta.color}-400 shrink-0`} />
                    <span className={`text-xs font-medium ${sel ? "text-white" : "text-slate-300"}`}>
                      {isRtl ? meta.ar : meta.en}
                    </span>
                  </button>
                );
              })}
            </div>
          </SuperPanel>

          <SuperPanel title={isRtl ? "الباقة" : "Plan"} icon={<SettingsIcon className="w-4 h-4" />}>
            <div className="space-y-1.5">
              {PLAN_OPTS.map(p => {
                const sel = draft.plan === p;
                const meta = {
                  free:       { en: "Free",       ar: "مجانية" },
                  pro:        { en: "Pro",        ar: "احترافية" },
                  enterprise: { en: "Enterprise", ar: "مؤسسات" },
                }[p];
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => patch("plan", p)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-colors ${
                      sel ? "border-amber-500/40 bg-amber-500/10" : "border-slate-700 hover:border-slate-500"
                    }`}
                  >
                    <span className={`text-xs font-medium ${sel ? "text-white" : "text-slate-300"}`}>
                      {isRtl ? meta.ar : meta.en}
                    </span>
                    {sel && <Check className="w-3.5 h-3.5 text-amber-300" />}
                  </button>
                );
              })}
            </div>
          </SuperPanel>

          <SuperPanel title={isRtl ? "البيانات الوصفية" : "Metadata"} icon={<FileText className="w-4 h-4" />}>
            <dl className="text-[11.5px] space-y-1.5">
              <div className="flex justify-between">
                <dt className="text-slate-500">{isRtl ? "أنشئ" : "Created"}</dt>
                <dd className="text-slate-300">{new Date(tenant.createdAt).toLocaleDateString(isRtl ? "ar-EG" : "en-GB")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">{isRtl ? "آخر تعديل" : "Updated"}</dt>
                <dd className="text-slate-300">{new Date(tenant.updatedAt).toLocaleDateString(isRtl ? "ar-EG" : "en-GB")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">ID</dt>
                <dd className="text-slate-400 font-mono truncate max-w-[150px]">{tenant.id}</dd>
              </div>
            </dl>
          </SuperPanel>

          <SuperPanel title={isRtl ? "إجراءات" : "Actions"}>
            <div className="space-y-1.5">
              <button
                onClick={doDuplicate}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-xs transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                {isRtl ? "ضاعف هذا المكتب" : "Duplicate firm"}
              </button>
              <button
                onClick={openAsTenant}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/15 text-amber-200 hover:text-white text-xs transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {isRtl ? "افتح إدارة هذا المكتب" : "Open admin as firm"}
              </button>
            </div>
          </SuperPanel>

          {/* Danger zone */}
          <SuperPanel title={<span className="text-rose-300">{isRtl ? "منطقة خطر" : "Danger zone"}</span>}>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/15 text-rose-300 hover:text-rose-200 text-xs font-medium transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isRtl ? "حذف هذا المكتب نهائياً" : "Delete this firm permanently"}
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-rose-200">
                  {isRtl
                    ? "هل أنت متأكد؟ هذا الإجراء لا يمكن التراجع عنه."
                    : "Are you sure? This cannot be undone."}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 text-xs text-slate-300 hover:text-white px-3 py-2 rounded-md border border-slate-700 hover:border-slate-500 transition-colors"
                  >
                    {isRtl ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    onClick={doDelete}
                    className="flex-1 text-xs bg-rose-500 hover:bg-rose-400 text-white font-semibold px-3 py-2 rounded-md transition-colors"
                  >
                    {isRtl ? "نعم، احذف" : "Yes, delete"}
                  </button>
                </div>
              </div>
            )}
          </SuperPanel>

          <Link
            href="/super-admin/firms"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className={`w-3.5 h-3.5 ${isRtl ? "rotate-180" : ""}`} />
            {isRtl ? "كل المكاتب" : "All firms"}
          </Link>
        </div>
      </div>

      {/* Alias the SuperPanel "icon" prop usage above (it doesn't exist in the
          original signature) — re-render with title only when needed. */}
    </SuperAdminLayout>
  );
}
