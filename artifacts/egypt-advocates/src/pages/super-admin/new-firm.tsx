import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  ChevronLeft, ChevronRight, Check, Building2, Palette,
  Layers, CreditCard, ListChecks, Sparkles, Globe, Mail, Phone,
} from "lucide-react";
import SuperAdminLayout, { SuperHeader, SuperPanel } from "@/components/super-admin-layout";
import {
  ALL_MODULES_ENABLED, applyTenantBranding, createTenant,
  DEFAULT_TENANT_BRANDING, slugify, TENANT_MODULES,
  type TenantBranding, type TenantModule, type TenantPlan, type TenantStatus,
} from "@/lib/tenants";
import { useAdminI18n } from "@/lib/admin-i18n";
import { toast } from "sonner";

const MODULE_LABELS: Record<TenantModule, { en: string; ar: string }> = {
  dashboard:    { en: "Dashboard",          ar: "اللوحة الرئيسية" },
  clients:      { en: "Clients",            ar: "العملاء" },
  cases:        { en: "Cases",              ar: "القضايا" },
  appointments: { en: "Appointments",       ar: "المواعيد" },
  chat:         { en: "Chat & Support",     ar: "الدردشة والدعم" },
  inquiries:    { en: "Contact inquiries",  ar: "طلبات التواصل" },
  invoices:     { en: "Invoices",           ar: "الفواتير" },
  payments:     { en: "Payments",           ar: "المدفوعات" },
  statements:   { en: "Customer statements", ar: "كشوف الحسابات" },
  services:     { en: "Services",           ar: "الخدمات" },
  lawyers:      { en: "Lawyers",            ar: "المحامون" },
  legalLibrary: { en: "Legal library",      ar: "المكتبة القانونية" },
  blog:         { en: "Blog posts",         ar: "المدوّنة" },
  settings:     { en: "Settings",           ar: "الإعدادات" },
};

interface FormState {
  nameAr: string;
  nameEn: string;
  slug: string;
  domain: string;
  contactEmail: string;
  contactPhone: string;
  status: TenantStatus;
  plan: TenantPlan;
  branding: TenantBranding;
  modules: Record<TenantModule, boolean>;
  notes: string;
}

const INITIAL: FormState = {
  nameAr: "",
  nameEn: "",
  slug: "",
  domain: "",
  contactEmail: "",
  contactPhone: "",
  status: "trial",
  plan: "pro",
  branding: { ...DEFAULT_TENANT_BRANDING },
  modules: { ...ALL_MODULES_ENABLED },
  notes: "",
};

const STEPS = [
  { id: 1, icon: Building2,  labelEn: "Identity",  labelAr: "الهوية" },
  { id: 2, icon: Palette,    labelEn: "Branding",  labelAr: "العلامة" },
  { id: 3, icon: Layers,     labelEn: "Modules",   labelAr: "الوحدات" },
  { id: 4, icon: CreditCard, labelEn: "Plan",      labelAr: "الباقة" },
  { id: 5, icon: ListChecks, labelEn: "Review",    labelAr: "المراجعة" },
] as const;

/* ────────────────────────────────────────────── */

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <label className="block text-xs text-slate-300 font-medium mb-1.5">
      {children}
      {hint && <span className="text-slate-500 font-normal ms-1">— {hint}</span>}
    </label>
  );
}

function TextField({
  label, value, onChange, placeholder, type = "text", dir, hint, prefix,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; dir?: "ltr" | "rtl"; hint?: string;
  prefix?: React.ReactNode;
}) {
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

function Stepper({ current }: { current: number }) {
  const { isRtl } = useAdminI18n();
  return (
    <div className="flex items-center gap-1 mb-6">
      {STEPS.map((s, idx) => {
        const isDone = current > s.id;
        const isCur  = current === s.id;
        const Icon   = s.icon;
        return (
          <div key={s.id} className="flex items-center flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-8 h-8 rounded-full grid place-items-center shrink-0 border transition-colors ${
                  isDone
                    ? "bg-emerald-500 border-emerald-500 text-slate-900"
                    : isCur
                    ? "bg-amber-500 border-amber-500 text-slate-900"
                    : "bg-slate-800 border-slate-700 text-slate-500"
                }`}
              >
                {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-xs hidden md:block whitespace-nowrap ${
                isCur ? "text-amber-200 font-semibold" : isDone ? "text-emerald-300" : "text-slate-500"
              }`}>
                {isRtl ? s.labelAr : s.labelEn}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-2 ${current > s.id ? "bg-emerald-500/50" : "bg-slate-700"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────── */

export default function SuperAdminNewFirm() {
  const { isRtl } = useAdminI18n();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [autoSlug, setAutoSlug] = useState(true);

  /* Auto-derive slug from English name unless the user touched it. */
  function setName(field: "nameEn" | "nameAr", v: string) {
    setForm(s => {
      const next = { ...s, [field]: v };
      if (autoSlug) next.slug = slugify(next.nameEn || next.nameAr);
      return next;
    });
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(s => ({ ...s, [key]: value }));
  }

  function updateBranding<K extends keyof TenantBranding>(key: K, value: TenantBranding[K]) {
    setForm(s => ({ ...s, branding: { ...s.branding, [key]: value } }));
  }

  function toggleModule(m: TenantModule) {
    setForm(s => ({ ...s, modules: { ...s.modules, [m]: !s.modules[m] } }));
  }

  /* Per-step validation gate. */
  const stepValid = useMemo(() => {
    switch (step) {
      case 1:
        return Boolean((form.nameEn.trim() || form.nameAr.trim()) && form.slug.trim());
      case 4:
        return Boolean(form.plan && form.status);
      default:
        return true;
    }
  }, [step, form]);

  function nextStep() {
    if (!stepValid) {
      toast.error(isRtl ? "أكمل الحقول المطلوبة أولاً." : "Please complete the required fields.");
      return;
    }
    setStep(s => Math.min(STEPS.length, s + 1));
  }

  function prevStep() {
    setStep(s => Math.max(1, s - 1));
  }

  function submit(openAfter: boolean) {
    const tenant = createTenant({
      nameAr: form.nameAr.trim(),
      nameEn: form.nameEn.trim(),
      slug: form.slug.trim() || slugify(form.nameEn || form.nameAr),
      domain: form.domain.trim(),
      contactEmail: form.contactEmail.trim(),
      contactPhone: form.contactPhone.trim(),
      status: form.status,
      plan: form.plan,
      branding: form.branding,
      modules: form.modules,
      notes: form.notes,
    });
    toast.success(isRtl ? `تم إنشاء "${tenant.nameAr || tenant.nameEn}"` : `Created "${tenant.nameEn || tenant.nameAr}"`);
    if (openAfter) {
      applyTenantBranding(tenant);
      setTimeout(() => { window.location.assign("/admin"); }, 200);
    } else {
      navigate(`/super-admin/firms/${tenant.id}`);
    }
  }

  /* ────────────────────────────────────────────── */

  return (
    <SuperAdminLayout>
      <SuperHeader
        title={isRtl ? "إنشاء مكتب جديد" : "Onboard a new firm"}
        subtitle={
          isRtl
            ? "خمس خطوات بسيطة لإطلاق مكتب محاماة جديد على المنصّة بهويّته الكاملة."
            : "Five steps to spin up a new law-firm tenant with its own white-labeled identity."
        }
      />

      <Stepper current={step} />

      {/* ───────── STEP 1 — Identity ───────── */}
      {step === 1 && (
        <SuperPanel
          title={isRtl ? "هوية المكتب" : "Firm identity"}
          subtitle={isRtl ? "الاسم، النطاق، وبيانات التواصل." : "Name, slug, domain and contact details."}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              label={isRtl ? "الاسم بالإنجليزية *" : "English name *"}
              value={form.nameEn}
              onChange={v => setName("nameEn", v)}
              placeholder="e.g. Al-Adala Law Firm"
              dir="ltr"
            />
            <TextField
              label={isRtl ? "الاسم بالعربية" : "Arabic name"}
              value={form.nameAr}
              onChange={v => setName("nameAr", v)}
              placeholder="مثال: مكتب العدالة للمحاماة"
              dir="rtl"
            />
            <TextField
              label={isRtl ? "المعرّف (Slug) *" : "Slug *"}
              value={form.slug}
              onChange={v => { setAutoSlug(false); update("slug", slugify(v)); }}
              placeholder="al-adala"
              dir="ltr"
              hint={isRtl ? "حروف صغيرة وشُرَط فقط" : "lowercase, dashes only"}
            />
            <TextField
              label={isRtl ? "النطاق المخصّص" : "Custom domain"}
              value={form.domain}
              onChange={v => update("domain", v)}
              placeholder="aladala.law"
              dir="ltr"
              prefix={<Globe className="w-3.5 h-3.5" />}
            />
            <TextField
              label={isRtl ? "بريد التواصل" : "Contact email"}
              value={form.contactEmail}
              onChange={v => update("contactEmail", v)}
              placeholder="info@aladala.law"
              dir="ltr"
              type="email"
              prefix={<Mail className="w-3.5 h-3.5" />}
            />
            <TextField
              label={isRtl ? "هاتف التواصل" : "Contact phone"}
              value={form.contactPhone}
              onChange={v => update("contactPhone", v)}
              placeholder="+20 122 0000 000"
              dir="ltr"
              prefix={<Phone className="w-3.5 h-3.5" />}
            />
          </div>
          <div className="mt-4">
            <FieldLabel hint={isRtl ? "اختياري — للاستخدام الداخلي" : "Optional — internal use only"}>
              {isRtl ? "ملاحظات" : "Notes"}
            </FieldLabel>
            <textarea
              value={form.notes}
              onChange={e => update("notes", e.target.value)}
              rows={3}
              placeholder={isRtl ? "أي تفاصيل تخصّ هذا المكتب..." : "Anything you want to remember about this firm…"}
              className="w-full bg-slate-800/60 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500/50 resize-y"
            />
          </div>
        </SuperPanel>
      )}

      {/* ───────── STEP 2 — Branding ───────── */}
      {step === 2 && (
        <SuperPanel
          title={isRtl ? "العلامة التجارية" : "Brand identity"}
          subtitle={
            isRtl
              ? "الألوان والشعار التي ستظهر للعملاء على موقع المكتب وفي لوحة الإدارة."
              : "Colours and logo that will appear on the firm's public site and admin panel."
          }
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Inputs */}
            <div className="space-y-4">
              <TextField
                label={isRtl ? "رابط الشعار" : "Logo URL"}
                value={form.branding.logoUrl}
                onChange={v => updateBranding("logoUrl", v)}
                placeholder="https://… or data:image/png;base64,…"
                dir="ltr"
                hint={isRtl ? "PNG / SVG شفاف" : "Transparent PNG / SVG"}
              />
              <TextField
                label={isRtl ? "رابط أيقونة المتصفح" : "Favicon URL"}
                value={form.branding.faviconUrl}
                onChange={v => updateBranding("faviconUrl", v)}
                placeholder="https://… (32x32)"
                dir="ltr"
              />
              <div className="grid grid-cols-2 gap-3">
                <ColorField
                  label={isRtl ? "اللون الرئيسي" : "Primary"}
                  value={form.branding.primaryHex}
                  onChange={v => updateBranding("primaryHex", v)}
                  placeholder="#17264d"
                />
                <ColorField
                  label={isRtl ? "لون التمييز" : "Accent"}
                  value={form.branding.accentHex}
                  onChange={v => updateBranding("accentHex", v)}
                  placeholder="#c4734a"
                />
                <ColorField
                  label={isRtl ? "زر CTA" : "CTA button"}
                  value={form.branding.ctaHex}
                  onChange={v => updateBranding("ctaHex", v)}
                  placeholder="#c4734a"
                />
                <ColorField
                  label={isRtl ? "الخلفية الداكنة" : "Dark section"}
                  value={form.branding.deepHex}
                  onChange={v => updateBranding("deepHex", v)}
                  placeholder="#0d152a"
                />
              </div>
            </div>

            {/* Live preview card */}
            <div>
              <p className="text-xs text-slate-400 mb-2">{isRtl ? "معاينة مباشرة" : "Live preview"}</p>
              <div
                className="rounded-2xl overflow-hidden border border-slate-700"
                style={{ background: form.branding.deepHex || "#0d152a" }}
              >
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div
                      className="w-12 h-12 rounded-xl grid place-items-center font-bold text-white shrink-0"
                      style={{ background: form.branding.ctaHex || "#c4734a" }}
                    >
                      {form.branding.logoUrl
                        ? <img src={form.branding.logoUrl} alt="" className="w-full h-full object-contain rounded-xl p-1" />
                        : (form.nameEn || form.nameAr || "?").trim().slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-semibold">
                        {form.nameEn || form.nameAr || (isRtl ? "اسم المكتب" : "Firm name")}
                      </p>
                      <p className="text-white/50 text-[11px] font-mono">{form.slug || "firm-slug"}</p>
                    </div>
                  </div>
                  <p className="text-white/70 text-sm mb-5 leading-relaxed">
                    {isRtl
                      ? "حلول قانونية موثوقة. خبرة متجدّدة، نتائج فعلية."
                      : "Trusted legal solutions. Proven experience, real-world results."}
                  </p>
                  <button
                    type="button"
                    className="text-white text-sm font-semibold px-5 py-2.5 rounded-md transition-all"
                    style={{ background: form.branding.ctaHex || "#c4734a" }}
                  >
                    {isRtl ? "احجز استشارة" : "Book a Consultation"}
                  </button>
                </div>
                <div className="h-1.5" style={{ background: form.branding.primaryHex || "#17264d" }} />
              </div>
            </div>
          </div>
        </SuperPanel>
      )}

      {/* ───────── STEP 3 — Modules ───────── */}
      {step === 3 && (
        <SuperPanel
          title={isRtl ? "الوحدات المفعّلة" : "Enabled modules"}
          subtitle={
            isRtl
              ? "اختر الوحدات التي ستظهر في لوحة إدارة هذا المكتب. الوحدات المعطّلة لن يراها فريق المكتب."
              : "Pick which admin modules this firm gets. Disabled modules won't appear in their sidebar."
          }
        >
          <div className="flex items-center justify-between mb-4 text-xs">
            <span className="text-slate-400">
              {Object.values(form.modules).filter(Boolean).length} / {TENANT_MODULES.length} {isRtl ? "مفعّلة" : "enabled"}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => update("modules", { ...ALL_MODULES_ENABLED })}
                className="text-amber-300 hover:text-amber-200"
              >
                {isRtl ? "فعّل الكل" : "Enable all"}
              </button>
              <span className="text-slate-700">·</span>
              <button
                type="button"
                onClick={() => update("modules", TENANT_MODULES.reduce((acc, m) => ({ ...acc, [m]: false }), {} as Record<TenantModule, boolean>))}
                className="text-slate-400 hover:text-rose-300"
              >
                {isRtl ? "عطّل الكل" : "Disable all"}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {TENANT_MODULES.map(m => {
              const on = form.modules[m] !== false;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleModule(m)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                    on
                      ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-200"
                      : "bg-slate-800/30 border-slate-700 text-slate-500 hover:border-slate-600"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded grid place-items-center shrink-0 ${
                      on ? "bg-emerald-500 text-slate-900" : "border border-slate-600"
                    }`}
                  >
                    {on && <Check className="w-3 h-3" />}
                  </div>
                  <span className="text-xs font-medium">
                    {isRtl ? MODULE_LABELS[m].ar : MODULE_LABELS[m].en}
                  </span>
                </button>
              );
            })}
          </div>
        </SuperPanel>
      )}

      {/* ───────── STEP 4 — Plan & status ───────── */}
      {step === 4 && (
        <SuperPanel
          title={isRtl ? "الباقة والحالة" : "Plan & status"}
          subtitle={isRtl ? "حدّد باقة الاشتراك وحالة المكتب الحالية." : "Pick the subscription tier and current firm status."}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <FieldLabel>{isRtl ? "الباقة" : "Pricing tier"}</FieldLabel>
              <div className="space-y-2">
                {(["free", "pro", "enterprise"] as const).map(p => {
                  const sel = form.plan === p;
                  const meta = {
                    free:       { en: "Free",       ar: "مجانية",   desc: isRtl ? "حتى 5 موظفين، الميزات الأساسية." : "Up to 5 staff, basic features." },
                    pro:        { en: "Pro",        ar: "احترافية", desc: isRtl ? "موظفون غير محدودين، فواتير، دفع." : "Unlimited staff, invoices, payments." },
                    enterprise: { en: "Enterprise", ar: "مؤسسات",   desc: isRtl ? "كل الوحدات + دعم مخصّص."          : "All modules + dedicated support." },
                  }[p];
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => update("plan", p)}
                      className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                        sel ? "border-amber-500/50 bg-amber-500/10" : "border-slate-700 hover:border-slate-500"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full mt-0.5 grid place-items-center ${sel ? "bg-amber-500" : "border border-slate-500"}`}>
                        {sel && <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${sel ? "text-white" : "text-slate-300"}`}>
                          {isRtl ? meta.ar : meta.en}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{meta.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <FieldLabel>{isRtl ? "الحالة" : "Status"}</FieldLabel>
              <div className="space-y-2">
                {(["trial", "active", "suspended"] as const).map(s => {
                  const sel = form.status === s;
                  const meta = {
                    trial:     { en: "Trial",     ar: "تجريبية",   color: "amber"   },
                    active:    { en: "Active",    ar: "نشطة",     color: "emerald" },
                    suspended: { en: "Suspended", ar: "موقوفة",   color: "rose"    },
                  }[s];
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => update("status", s)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        sel
                          ? `border-${meta.color}-500/50 bg-${meta.color}-500/10`
                          : "border-slate-700 hover:border-slate-500"
                      }`}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full bg-${meta.color}-400 shrink-0`} />
                      <span className={`text-sm font-medium ${sel ? "text-white" : "text-slate-300"}`}>
                        {isRtl ? meta.ar : meta.en}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </SuperPanel>
      )}

      {/* ───────── STEP 5 — Review ───────── */}
      {step === 5 && (
        <SuperPanel
          title={isRtl ? "مراجعة وإطلاق" : "Review & launch"}
          subtitle={isRtl ? "راجع التفاصيل قبل إنشاء المكتب." : "Confirm everything before we provision the firm."}
        >
          <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-5 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-xl grid place-items-center text-base font-bold text-white shrink-0"
                style={{ background: form.branding.ctaHex || "#c4734a" }}
              >
                {form.branding.logoUrl
                  ? <img src={form.branding.logoUrl} alt="" className="w-full h-full object-contain rounded-xl p-1" />
                  : (form.nameEn || form.nameAr || "?").trim().slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold">{form.nameEn || form.nameAr}</p>
                <p className="text-[11px] text-slate-500 font-mono">{form.slug}</p>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-amber-300 font-bold">
                {form.plan} · {form.status}
              </span>
            </div>

            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
              <ReviewItem label={isRtl ? "الاسم العربي" : "Arabic name"} value={form.nameAr || "—"} />
              <ReviewItem label={isRtl ? "النطاق" : "Domain"}             value={form.domain || "—"} />
              <ReviewItem label={isRtl ? "البريد" : "Email"}              value={form.contactEmail || "—"} />
              <ReviewItem label={isRtl ? "الهاتف" : "Phone"}              value={form.contactPhone || "—"} />
              <ReviewItem
                label={isRtl ? "الوحدات" : "Modules"}
                value={`${Object.values(form.modules).filter(Boolean).length} / ${TENANT_MODULES.length}`}
              />
              <ReviewItem label={isRtl ? "الباقة" : "Plan"}               value={form.plan} />
            </dl>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-100/90 leading-relaxed">
            <Sparkles className="w-4 h-4 inline-block me-1.5 -mt-0.5 text-amber-300" />
            {isRtl
              ? "بمجرد الإنشاء، يمكنك فتح إدارة هذا المكتب مباشرة لتجربة الـ White-label الكامل."
              : "Once created, you can immediately open this firm's admin to test the full white-label experience."}
          </div>
        </SuperPanel>
      )}

      {/* ───────── Navigation buttons ───────── */}
      <div className="flex items-center justify-between mt-6 gap-3 flex-wrap">
        <button
          type="button"
          onClick={prevStep}
          disabled={step === 1}
          className="inline-flex items-center gap-1.5 text-sm text-slate-300 hover:text-white px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-500 transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {isRtl ? "السابق" : "Back"}
        </button>

        {step < STEPS.length ? (
          <button
            type="button"
            onClick={nextStep}
            disabled={!stepValid}
            className="inline-flex items-center gap-1.5 bg-linear-to-br from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-900 text-sm font-semibold px-5 py-2 rounded-lg shadow-lg shadow-amber-500/20 transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            {isRtl ? "التالي" : "Continue"}
            {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => submit(false)}
              className="text-sm text-slate-200 hover:text-white px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-500 transition-colors"
            >
              {isRtl ? "إنشاء فقط" : "Create only"}
            </button>
            <button
              type="button"
              onClick={() => submit(true)}
              className="inline-flex items-center gap-1.5 bg-linear-to-br from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-900 text-sm font-semibold px-5 py-2 rounded-lg shadow-lg shadow-amber-500/20 transition-all"
            >
              <Check className="w-4 h-4" />
              {isRtl ? "إنشاء وافتح" : "Create & open"}
            </button>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}

/* ────────────────────────────────────────────── */

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

function ReviewItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 py-0.5">
      <dt className="text-slate-500 min-w-[110px]">{label}</dt>
      <dd className="text-slate-200 font-mono text-[11.5px] truncate flex-1">{value}</dd>
    </div>
  );
}
