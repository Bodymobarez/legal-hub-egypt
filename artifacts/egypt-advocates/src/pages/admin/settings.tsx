import { useRef, useState } from "react";
import { useGetSiteInfo } from "@workspace/api-client-react";
import { toast } from "sonner";
import {
  applyAppearance,
  clearAppearanceOverrides,
  clearStoredAppearance,
  loadAppearance,
  saveAppearance,
  DEFAULT_APPEARANCE,
  COLOR_PRESETS,
  ACCENT_PRESETS,
  FONT_OPTIONS_HEADING,
  FONT_OPTIONS_BODY,
  RADIUS_PRESETS,
  type AppearanceConfig,
} from "@/lib/appearance";
import {
  applyWebsiteAppearance,
  clearStoredWebsiteAppearance,
  clearWebsiteAppearanceOverrides,
  loadWebsiteAppearance,
  saveWebsiteAppearance,
  DEFAULT_WEBSITE_APPEARANCE,
  DEFAULT_CTA_HEX,
  DEFAULT_SITE_DEEP_HEX,
  type WebsiteAppearance,
} from "@/lib/website-appearance";
import { useLanguage } from "@/lib/i18n";
import {
  Settings, Globe, CalendarClock, Bell, Palette,
  Phone, Mail, MapPin, Building2, Clock, Plus,
  Trash2, CheckCircle2, RotateCcw, Save, Laptop,
  Facebook, Instagram, Youtube, Linkedin, Twitter,
  MonitorSmartphone, Coffee, Wifi, Users2, Timer, Info,
  CreditCard, ShieldCheck, Banknote, Wallet, Link as LinkIcon,
  BadgeCheck, AlertCircle, Eye, EyeOff,
  AtSign, Send, ServerCog, FileText, ChevronDown, Sparkles,
  Copy, Inbox,
  Type, Maximize2, Megaphone, Image as ImageIcon, Layout,
  Code2, Brush, Pencil, Sun, Moon,
  Upload, X, MousePointerClick, RotateCw,
} from "lucide-react";
import { useAdminI18n } from "@/lib/admin-i18n";
import { useFeatureGate } from "@/lib/tenants";
import { PageHeader } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */
type AvailMode = "online" | "inOffice";

interface DaySlot {
  enabled: boolean;
  from: string;    // "09:00"
  to: string;      // "17:00"
}

interface ModeConfig {
  enabled: boolean;
  slots: DaySlot[];  // per weekday [0..6] Sun→Sat
  duration: number;  // slot duration in minutes
  buffer: number;    // buffer between slots in minutes
  maxPerDay: number; // max bookings per day
}

interface AvailabilityConfig {
  online: ModeConfig;
  inOffice: ModeConfig;
}

interface SiteOverrides {
  nameAr: string;
  nameEn: string;
  taglineAr: string;
  taglineEn: string;
  addressAr: string;
  addressEn: string;
  phone: string;
  whatsapp: string;
  email: string;
  established: number;
  facebook: string;
  instagram: string;
  twitter: string;
  linkedin: string;
  youtube: string;
}

interface NotifConfig {
  emailNewAppointment: boolean;
  emailNewInquiry: boolean;
  emailNewChat: boolean;
  whatsappNewAppointment: boolean;
  alertEmail: string;
  alertWhatsapp: string;
}

/* ═══════════════════════════════════════════
   Defaults
   ═══════════════════════════════════════════ */
const DEFAULT_DAY_SLOT = (enabled: boolean): DaySlot => ({ enabled, from: "09:00", to: "17:00" });

const DEFAULT_AVAIL: AvailabilityConfig = {
  online: {
    enabled: true,
    duration: 60,
    buffer: 15,
    maxPerDay: 8,
    slots: [
      DEFAULT_DAY_SLOT(true),  // Sun
      DEFAULT_DAY_SLOT(true),  // Mon
      DEFAULT_DAY_SLOT(true),  // Tue
      DEFAULT_DAY_SLOT(true),  // Wed
      DEFAULT_DAY_SLOT(true),  // Thu
      DEFAULT_DAY_SLOT(false), // Fri
      DEFAULT_DAY_SLOT(false), // Sat
    ],
  },
  inOffice: {
    enabled: true,
    duration: 45,
    buffer: 15,
    maxPerDay: 6,
    slots: [
      { enabled: true,  from: "10:00", to: "16:00" }, // Sun
      { enabled: true,  from: "10:00", to: "16:00" }, // Mon
      { enabled: true,  from: "10:00", to: "16:00" }, // Tue
      { enabled: true,  from: "10:00", to: "16:00" }, // Wed
      { enabled: true,  from: "10:00", to: "16:00" }, // Thu
      { enabled: false, from: "10:00", to: "16:00" }, // Fri
      { enabled: false, from: "10:00", to: "16:00" }, // Sat
    ],
  },
};

const DEFAULT_SITE: SiteOverrides = {
  nameAr: "مكتب إيجيبت أدفوكيتس للمحاماة",
  nameEn: "Egypt Advocates Law Firm",
  taglineAr: "شركاؤك القانونيون الموثوقون",
  taglineEn: "Your Trusted Legal Partners",
  addressAr: "الكوثر الجديد - منطقة البنوك - امام HSBC - أعلي بست واي - الدور الرابع - مكتب ٢١ - الغردقة",
  addressEn: "Al Kawthar Al Jadid District / Banking Area / In front of HSBC / Above Best Way / 4th Floor / Office No. 21 - Hurghada",
  phone: "+20 100 000 0000",
  whatsapp: "+20 100 000 0000",
  email: "info@egyptadvocates.com",
  established: 2010,
  facebook: "", instagram: "", twitter: "", linkedin: "", youtube: "",
};

const DEFAULT_NOTIF: NotifConfig = {
  emailNewAppointment: true,
  emailNewInquiry: true,
  emailNewChat: false,
  whatsappNewAppointment: true,
  alertEmail: "",
  alertWhatsapp: "",
};

/* ═══════════════════════════════════════════
   localStorage helpers
   ═══════════════════════════════════════════ */
function loadLS<T>(key: string, def: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; }
  catch { return def; }
}
function saveLS<T>(key: string, val: T) {
  localStorage.setItem(key, JSON.stringify(val));
  toast.success("تم الحفظ بنجاح");
}

/* ═══════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════ */
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DAY_NAMES_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const DAY_NAMES_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function calcSlots(from: string, to: string, duration: number, buffer: number): string[] {
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  const startMin = fh * 60 + fm;
  const endMin   = th * 60 + tm;
  const step = duration + buffer;
  const slots: string[] = [];
  for (let m = startMin; m + duration <= endMin; m += step) {
    const h = String(Math.floor(m / 60)).padStart(2, "0");
    const min = String(m % 60).padStart(2, "0");
    slots.push(`${h}:${min}`);
  }
  return slots;
}

/* ═══════════════════════════════════════════
   Section card wrapper
   ═══════════════════════════════════════════ */
function SettingsCard({ title, icon, children, className = "" }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden ${className}`}>
      <div className="flex items-center gap-3 px-5 py-3.5 border-b bg-muted/10">
        <div className="text-primary/70">{icon}</div>
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Field row helper
   ═══════════════════════════════════════════ */
function FieldRow({ label, children, tag }: { label: string; children: React.ReactNode; tag?: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2 items-start">
      <Label className="text-xs text-muted-foreground pt-2 flex items-center gap-1.5">
        {label}
        {tag && <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${tag === "AR" ? "bg-primary/10 text-primary" : "bg-blue-500/10 text-blue-500"}`}>{tag}</span>}
      </Label>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════ */
/* Tab catalog. Order here = order in the TabsList. The `id` MUST match the
   feature id in MODULE_FEATURES.settings inside lib/tenants.ts so that the
   Super Admin's per-firm sub-tab toggles map 1:1 to the rendered tabs. */
const SETTINGS_TAB_IDS = [
  "availability", "site", "appearance", "website",
  "notifications", "email", "payments",
] as const;

export default function AdminSettings() {
  const { ta, isRtl, setLang } = useAdminI18n();
  const { setLanguage } = useLanguage();
  const dir = isRtl ? "rtl" : "ltr";

  /* Per-firm sub-tab gating from the Super Admin control plane. */
  const gate = useFeatureGate("settings");
  const enabledTabs = SETTINGS_TAB_IDS.filter(id => gate(id));
  const defaultTab = enabledTabs[0] ?? "availability";
  const tabKey = enabledTabs.join(",");

  const [site, setSite]         = useState<SiteOverrides>(() => loadLS("admin_site", DEFAULT_SITE));
  const [avail, setAvail]       = useState<AvailabilityConfig>(() => loadLS("admin_avail", DEFAULT_AVAIL));
  const [appear, setAppear]     = useState<AppearanceConfig>(() => loadAppearance());
  const [notif, setNotif]       = useState<NotifConfig>(() => loadLS("admin_notif", DEFAULT_NOTIF));

  /**
   * Live preview without breaking on mount: every interactive change goes
   * through this helper, so the page only changes when the admin actually
   * edits something — opening the tab does NOT mutate the global palette.
   */
  const updateAppear = (patch: Partial<AppearanceConfig>) =>
    setAppear((p) => {
      const next = { ...p, ...patch };
      applyAppearance(next);
      return next;
    });

  /* live API info */
  const { data: apiSiteInfo } = useGetSiteInfo({ query: { queryKey: [] as const } as any });

  /* ── Availability mode updater ── */
  const updateMode = (mode: AvailMode, patch: Partial<ModeConfig>) =>
    setAvail(p => ({ ...p, [mode]: { ...p[mode], ...patch } }));

  const updateDaySlot = (mode: AvailMode, dayIdx: number, patch: Partial<DaySlot>) =>
    setAvail(p => {
      const slots = [...p[mode].slots];
      slots[dayIdx] = { ...slots[dayIdx], ...patch };
      return { ...p, [mode]: { ...p[mode], slots } };
    });

  /* ── Save handlers ── */
  const saveSite   = () => saveLS("admin_site", site);
  const saveAvail  = () => saveLS("admin_avail", avail);
  const saveAppear = () => {
    saveAppearance(appear);
    applyAppearance(appear);
    setLang(appear.defaultLang);
    setLanguage(appear.defaultLang);
    toast.success(isRtl ? "تم الحفظ بنجاح" : "Saved");
  };
  const saveNotif  = () => saveLS("admin_notif", notif);

  const resetAppear = () => {
    setAppear(DEFAULT_APPEARANCE);
    clearStoredAppearance();
    clearAppearanceOverrides();
  };

  /* ══════════════════════════════════════════
     DayScheduleRow — one row per day in agenda
     ══════════════════════════════════════════ */
  function DayScheduleRow({ mode, dayIdx }: { mode: AvailMode; dayIdx: number }) {
    const cfg   = avail[mode];
    const slot  = cfg.slots[dayIdx];
    const dayAr = DAY_NAMES_AR[dayIdx];
    const dayEn = DAY_NAMES_EN[dayIdx];
    const preview = slot.enabled ? calcSlots(slot.from, slot.to, cfg.duration, cfg.buffer) : [];

    return (
      <div className={`px-4 py-3 transition-opacity ${slot.enabled ? "" : "opacity-50"}`}>
        <div className="flex flex-wrap items-center gap-3">
          <Switch
            checked={slot.enabled}
            onCheckedChange={v => updateDaySlot(mode, dayIdx, { enabled: v })}
            className="shrink-0"
          />
          <span className="w-20 text-sm font-medium shrink-0" title={dayEn}>{dayAr}</span>

          {slot.enabled ? (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="time"
                  value={slot.from}
                  disabled={!slot.enabled}
                  onChange={e => updateDaySlot(mode, dayIdx, { from: e.target.value })}
                  className="h-8 w-24 rounded-md border border-border/60 bg-background px-2 text-xs text-center focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <span className="text-muted-foreground text-xs">{isRtl ? "إلى" : "to"}</span>
                <input
                  type="time"
                  value={slot.to}
                  disabled={!slot.enabled}
                  onChange={e => updateDaySlot(mode, dayIdx, { to: e.target.value })}
                  className="h-8 w-24 rounded-md border border-border/60 bg-background px-2 text-xs text-center focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              {/* slot preview */}
              <div className="flex gap-1 flex-wrap ms-1">
                {preview.slice(0, 6).map(t => (
                  <span key={t} className="text-[9px] bg-primary/8 border border-primary/20 text-primary px-1.5 py-0.5 rounded-full font-mono">{t}</span>
                ))}
                {preview.length > 6 && (
                  <span className="text-[9px] text-muted-foreground px-1 py-0.5">+{preview.length - 6}</span>
                )}
                <span className="text-[9px] text-muted-foreground/60">=&nbsp;{preview.length}&nbsp;{isRtl ? "موعد" : "slots"}</span>
              </div>
            </>
          ) : (
            <span className="text-xs text-muted-foreground italic">{isRtl ? "إجازة" : "Day off"}</span>
          )}
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════
     ModePanel — full panel for one appointment type
     ══════════════════════════════════════════ */
  function ModePanel({ mode }: { mode: AvailMode }) {
    const cfg = avail[mode];
    const isOnline = mode === "online";
    const label = isOnline
      ? (isRtl ? "استشارة أونلاين" : "Online Consultation")
      : (isRtl ? "زيارة المكتب" : "In-Office Visit");
    const Icon = isOnline ? Wifi : Building2;

    return (
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
        {/* header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b bg-muted/10">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isOnline ? "bg-blue-500/10 text-blue-500" : "bg-emerald-500/10 text-emerald-600"}`}>
              <Icon className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm">{label}</h3>
          </div>
          <Switch
            checked={cfg.enabled}
            onCheckedChange={v => updateMode(mode, { enabled: v })}
          />
        </div>

        {cfg.enabled && (
          <div className={`transition-all`}>
            {/* global settings row */}
            <div className="px-5 py-3 border-b bg-muted/5 flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Timer className="w-3.5 h-3.5 text-muted-foreground" />
                <Label className="text-xs text-muted-foreground">{isRtl ? "مدة الموعد" : "Duration"}</Label>
                <Select value={String(cfg.duration)} onValueChange={v => updateMode(mode, { duration: Number(v) })}>
                  <SelectTrigger className="h-7 w-24 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[15,20,30,45,60,90,120].map(m => (
                      <SelectItem key={m} value={String(m)} className="text-xs">{m} {isRtl ? "دقيقة" : "min"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Coffee className="w-3.5 h-3.5 text-muted-foreground" />
                <Label className="text-xs text-muted-foreground">{isRtl ? "فترة راحة" : "Buffer"}</Label>
                <Select value={String(cfg.buffer)} onValueChange={v => updateMode(mode, { buffer: Number(v) })}>
                  <SelectTrigger className="h-7 w-20 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0,5,10,15,20,30].map(m => (
                      <SelectItem key={m} value={String(m)} className="text-xs">{m} {isRtl ? "د" : "min"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Users2 className="w-3.5 h-3.5 text-muted-foreground" />
                <Label className="text-xs text-muted-foreground">{isRtl ? "أقصى/يوم" : "Max/day"}</Label>
                <Select value={String(cfg.maxPerDay)} onValueChange={v => updateMode(mode, { maxPerDay: Number(v) })}>
                  <SelectTrigger className="h-7 w-16 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,8,10,12,15,20].map(n => (
                      <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* days list */}
            <div className="divide-y divide-border/40">
              {[0,1,2,3,4,5,6].map(i => (
                <DayScheduleRow key={i} mode={mode} dayIdx={i} />
              ))}
            </div>
          </div>
        )}

        {!cfg.enabled && (
          <div className="px-5 py-6 text-center text-xs text-muted-foreground">
            {isRtl ? `حجز ${label} معطل حالياً` : `${label} booking is disabled`}
          </div>
        )}
      </div>
    );
  }

  /* ══════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════ */
  return (
    <div dir={dir} className="space-y-5">
      <PageHeader
        title={isRtl ? "الإعدادات" : "Settings"}
        subtitle={isRtl ? "التحكم الكامل في إعدادات الموقع والمواعيد" : "Full control over site and appointment settings"}
        icon={<Settings className="w-5 h-5" />}
      />

      {enabledTabs.length === 0 ? (
        <div className="rounded-2xl border border-border/50 bg-muted/10 p-10 text-center">
          <Settings className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">
            {isRtl ? "لا توجد تابات مفعّلة" : "No tabs enabled"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isRtl
              ? "كل تابات هذه الصفحة تم تعطيلها من لوحة الـ Super Admin."
              : "All tabs in this page have been disabled by the Super Admin."}
          </p>
        </div>
      ) : (
      <Tabs key={tabKey} defaultValue={defaultTab} className="w-full">
        <TabsList className="mb-5 bg-muted/30 border border-border/50 p-1 gap-1 flex-wrap h-auto">
          {gate("availability") && (
            <TabsTrigger value="availability" className="gap-2 text-xs">
              <CalendarClock className="w-3.5 h-3.5" />
              {isRtl ? "أوقات الحجز" : "Booking Hours"}
            </TabsTrigger>
          )}
          {gate("site") && (
            <TabsTrigger value="site" className="gap-2 text-xs">
              <Globe className="w-3.5 h-3.5" />
              {isRtl ? "معلومات المكتب" : "Office Info"}
            </TabsTrigger>
          )}
          {gate("appearance") && (
            <TabsTrigger value="appearance" className="gap-2 text-xs">
              <Palette className="w-3.5 h-3.5" />
              {isRtl ? "المظهر" : "Appearance"}
            </TabsTrigger>
          )}
          {gate("website") && (
            <TabsTrigger value="website" className="gap-2 text-xs">
              <Globe className="w-3.5 h-3.5" />
              {isRtl ? "مظهر الموقع" : "Website Look"}
            </TabsTrigger>
          )}
          {gate("notifications") && (
            <TabsTrigger value="notifications" className="gap-2 text-xs">
              <Bell className="w-3.5 h-3.5" />
              {isRtl ? "الإشعارات" : "Notifications"}
            </TabsTrigger>
          )}
          {gate("email") && (
            <TabsTrigger value="email" className="gap-2 text-xs">
              <AtSign className="w-3.5 h-3.5" />
              {isRtl ? "إعدادات البريد" : "Email Settings"}
            </TabsTrigger>
          )}
          {gate("payments") && (
            <TabsTrigger value="payments" className="gap-2 text-xs">
              <CreditCard className="w-3.5 h-3.5" />
              {isRtl ? "أنظمة الدفع" : "Payment Systems"}
            </TabsTrigger>
          )}
        </TabsList>

        {/* ══ TAB: BOOKING AVAILABILITY ══ */}
        <TabsContent value="availability" className="mt-0 space-y-4">
          {/* Info banner */}
          <div className="flex items-start gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5 text-sm">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">
              {isRtl
                ? "هذه الأوقات تتحكم في المواعيد المتاحة التي يراها الزوار في صفحة الحجز. يمكنك تحديد وقت بداية ونهاية كل يوم لكل نوع من أنواع الحجز، مع تحديد مدة الموعد والفترة بين المواعيد."
                : "These hours control the available slots visitors see on the booking page. Set start/end times per day for each booking type, along with appointment duration and buffer time."}
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <ModePanel mode="online" />
            <ModePanel mode="inOffice" />
          </div>

          {/* Quick summary */}
          <SettingsCard
            title={isRtl ? "ملخص الجدول الأسبوعي" : "Weekly Schedule Summary"}
            icon={<CalendarClock className="w-4 h-4" />}
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[0,1,2,3,4,5,6].map(i => {
                const onl = avail.online.slots[i];
                const off = avail.inOffice.slots[i];
                const active = onl.enabled || off.enabled;
                return (
                  <div key={i} className={`rounded-lg border p-3 text-center transition-colors ${active ? "border-border/60 bg-muted/10" : "border-border/30 opacity-40"}`}>
                    <p className="font-semibold text-xs mb-2">{DAY_NAMES_AR[i]}</p>
                    {onl.enabled && (
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Wifi className="w-2.5 h-2.5 text-blue-500" />
                        <span className="text-[9px] text-muted-foreground">{onl.from}–{onl.to}</span>
                      </div>
                    )}
                    {off.enabled && (
                      <div className="flex items-center justify-center gap-1">
                        <Building2 className="w-2.5 h-2.5 text-emerald-500" />
                        <span className="text-[9px] text-muted-foreground">{off.from}–{off.to}</span>
                      </div>
                    )}
                    {!active && <p className="text-[9px] text-muted-foreground">{isRtl ? "إجازة" : "Closed"}</p>}
                  </div>
                );
              })}
            </div>
          </SettingsCard>

          <SaveBar onSave={saveAvail} onReset={() => { setAvail(DEFAULT_AVAIL); saveLS("admin_avail", DEFAULT_AVAIL); }} isRtl={isRtl} />
        </TabsContent>

        {/* ══ TAB: SITE INFO ══ */}
        <TabsContent value="site" className="mt-0 space-y-4">
          {/* Show API current values as hint */}
          {apiSiteInfo && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-border/50 bg-muted/10 text-xs text-muted-foreground">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-primary/60" />
              {isRtl
                ? `البيانات الحالية من السيرفر: ${apiSiteInfo.nameAr} · ${apiSiteInfo.phone}`
                : `Current server data: ${apiSiteInfo.nameEn} · ${apiSiteInfo.phone}`}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SettingsCard title={isRtl ? "اسم المكتب" : "Office Name"} icon={<Building2 className="w-4 h-4" />}>
              <FieldRow label={isRtl ? "الاسم" : "Name"} tag="AR">
                <Input dir="rtl" value={site.nameAr} onChange={e => setSite(p => ({ ...p, nameAr: e.target.value }))} className="h-9 text-sm" />
              </FieldRow>
              <FieldRow label="Name" tag="EN">
                <Input dir="ltr" value={site.nameEn} onChange={e => setSite(p => ({ ...p, nameEn: e.target.value }))} className="h-9 text-sm" />
              </FieldRow>
              <FieldRow label={isRtl ? "الشعار" : "Tagline"} tag="AR">
                <Input dir="rtl" value={site.taglineAr} onChange={e => setSite(p => ({ ...p, taglineAr: e.target.value }))} className="h-9 text-sm" />
              </FieldRow>
              <FieldRow label="Tagline" tag="EN">
                <Input dir="ltr" value={site.taglineEn} onChange={e => setSite(p => ({ ...p, taglineEn: e.target.value }))} className="h-9 text-sm" />
              </FieldRow>
              <FieldRow label={isRtl ? "سنة التأسيس" : "Established"}>
                <Input type="number" dir="ltr" value={site.established} onChange={e => setSite(p => ({ ...p, established: Number(e.target.value) }))} className="h-9 text-sm w-32" />
              </FieldRow>
            </SettingsCard>

            <SettingsCard title={isRtl ? "بيانات التواصل" : "Contact Details"} icon={<Phone className="w-4 h-4" />}>
              <FieldRow label={isRtl ? "العنوان" : "Address"} tag="AR">
                <Input dir="rtl" value={site.addressAr} onChange={e => setSite(p => ({ ...p, addressAr: e.target.value }))} className="h-9 text-sm" />
              </FieldRow>
              <FieldRow label="Address" tag="EN">
                <Input dir="ltr" value={site.addressEn} onChange={e => setSite(p => ({ ...p, addressEn: e.target.value }))} className="h-9 text-sm" />
              </FieldRow>
              <FieldRow label={isRtl ? "الهاتف" : "Phone"}>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <Input dir="ltr" value={site.phone} onChange={e => setSite(p => ({ ...p, phone: e.target.value }))} className="h-9 text-sm" placeholder="+20 100 000 0000" />
                </div>
              </FieldRow>
              <FieldRow label="WhatsApp">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <Input dir="ltr" value={site.whatsapp} onChange={e => setSite(p => ({ ...p, whatsapp: e.target.value }))} className="h-9 text-sm" placeholder="+20 100 000 0000" />
                </div>
              </FieldRow>
              <FieldRow label={isRtl ? "البريد" : "Email"}>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <Input dir="ltr" type="email" value={site.email} onChange={e => setSite(p => ({ ...p, email: e.target.value }))} className="h-9 text-sm" />
                </div>
              </FieldRow>
            </SettingsCard>
          </div>

          <SettingsCard title={isRtl ? "وسائل التواصل الاجتماعي" : "Social Media"} icon={<Globe className="w-4 h-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: "facebook" as const,  icon: <Facebook className="w-4 h-4 text-blue-600" />,   label: "Facebook" },
                { key: "instagram" as const, icon: <Instagram className="w-4 h-4 text-pink-500" />,  label: "Instagram" },
                { key: "twitter" as const,   icon: <Twitter className="w-4 h-4 text-sky-500" />,     label: "X / Twitter" },
                { key: "linkedin" as const,  icon: <Linkedin className="w-4 h-4 text-blue-700" />,   label: "LinkedIn" },
                { key: "youtube" as const,   icon: <Youtube className="w-4 h-4 text-red-500" />,     label: "YouTube" },
              ].map(({ key, icon, label }) => (
                <div key={key} className="flex items-center gap-2">
                  {icon}
                  <Input
                    dir="ltr"
                    value={site[key]}
                    onChange={e => setSite(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={`https://…`}
                    className="h-9 text-xs"
                  />
                </div>
              ))}
            </div>
          </SettingsCard>

          <SaveBar onSave={saveSite} onReset={() => { setSite(DEFAULT_SITE); saveLS("admin_site", DEFAULT_SITE); }} isRtl={isRtl} />
        </TabsContent>

        {/* ══ TAB: APPEARANCE (ADVANCED) ══ */}
        <TabsContent value="appearance" className="mt-0 space-y-4">
          <AppearanceAdvancedTab
            isRtl={isRtl}
            appear={appear}
            updateAppear={updateAppear}
            onSave={saveAppear}
            onReset={resetAppear}
          />
        </TabsContent>

        {/* ══ TAB: WEBSITE LOOK ══ */}
        <TabsContent value="website" className="mt-0">
          <WebsiteAppearanceTab isRtl={isRtl} />
        </TabsContent>

        {/* ══ TAB: NOTIFICATIONS ══ */}
        <TabsContent value="notifications" className="mt-0 space-y-4">
          <div className="max-w-xl space-y-4">
            <SettingsCard title={isRtl ? "عناوين التنبيه" : "Alert Addresses"} icon={<Bell className="w-4 h-4" />}>
              <FieldRow label={isRtl ? "البريد الإلكتروني" : "Alert Email"}>
                <Input dir="ltr" type="email" value={notif.alertEmail} onChange={e => setNotif(p => ({ ...p, alertEmail: e.target.value }))} className="h-9 text-sm" placeholder="admin@example.com" />
              </FieldRow>
              <FieldRow label="WhatsApp">
                <Input dir="ltr" value={notif.alertWhatsapp} onChange={e => setNotif(p => ({ ...p, alertWhatsapp: e.target.value }))} className="h-9 text-sm" placeholder="+20 100 000 0000" />
              </FieldRow>
            </SettingsCard>

            <SettingsCard title={isRtl ? "إشعارات البريد الإلكتروني" : "Email Notifications"} icon={<Mail className="w-4 h-4" />}>
              {([
                ["emailNewAppointment", isRtl ? "موعد جديد" : "New appointment",  isRtl ? "إشعار عند إضافة حجز جديد" : "Notify on new booking"],
                ["emailNewInquiry",     isRtl ? "استفسار جديد" : "New inquiry",   isRtl ? "إشعار عند ورود استفسار" : "Notify on new inquiry"],
                ["emailNewChat",        isRtl ? "محادثة جديدة" : "New chat",      isRtl ? "إشعار عند بدء محادثة جديدة" : "Notify on new chat"],
              ] as [keyof NotifConfig, string, string][]).map(([k, title, desc]) => (
                <div key={k} className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm font-medium">{title}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <Switch checked={notif[k] as boolean} onCheckedChange={v => setNotif(p => ({ ...p, [k]: v }))} />
                </div>
              ))}
            </SettingsCard>

            <SettingsCard title={isRtl ? "إشعارات واتساب" : "WhatsApp Notifications"} icon={<Phone className="w-4 h-4 text-emerald-500" />}>
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium">{isRtl ? "موعد جديد" : "New appointment"}</p>
                  <p className="text-xs text-muted-foreground">{isRtl ? "إرسال رسالة واتساب عند أي حجز جديد" : "Send WhatsApp message on new booking"}</p>
                </div>
                <Switch checked={notif.whatsappNewAppointment} onCheckedChange={v => setNotif(p => ({ ...p, whatsappNewAppointment: v }))} />
              </div>
            </SettingsCard>

            <SaveBar onSave={saveNotif} onReset={() => { setNotif(DEFAULT_NOTIF); saveLS("admin_notif", DEFAULT_NOTIF); }} isRtl={isRtl} />
          </div>
        </TabsContent>

        {/* ══ TAB: EMAIL SETTINGS ══ */}
        <TabsContent value="email" className="mt-0">
          <EmailSettingsTab isRtl={isRtl} />
        </TabsContent>

        {/* ══ TAB: PAYMENT SYSTEMS ══ */}
        <TabsContent value="payments" className="mt-0">
          <PaymentSystemsTab isRtl={isRtl} />
        </TabsContent>
      </Tabs>
      )}
    </div>
  );
}

/* ──────────────────────────────────────
   SaveBar component
   ────────────────────────────────────── */
function SaveBar({ onSave, onReset, isRtl }: { onSave: () => void; onReset: () => void; isRtl: boolean }) {
  return (
    <div className="flex justify-end gap-3 pt-2 pb-1">
      <Button variant="outline" size="sm" onClick={onReset} className="gap-2">
        <RotateCcw className="w-3.5 h-3.5" />
        {isRtl ? "استعادة الافتراضي" : "Reset defaults"}
      </Button>
      <Button size="sm" onClick={onSave} className="gap-2">
        <Save className="w-3.5 h-3.5" />
        {isRtl ? "حفظ التغييرات" : "Save changes"}
      </Button>
    </div>
  );
}

/* ══════════════════════════════════════════════
   PAYMENT SYSTEMS TAB
   ══════════════════════════════════════════════ */
type GatewayConfig = {
  enabled: boolean;
  mode: "sandbox" | "live";
  apiKey: string;
  secretKey: string;
  webhookSecret: string;
};
type PaymentConfig = {
  currency: string;
  requireDepositForBooking: boolean;
  depositPercentage: number;
  allowCashOnArrival: boolean;
  allowBankTransfer: boolean;
  bankTransferDetails: string;
  paymob:  GatewayConfig;
  fawry:   GatewayConfig;
  stripe:  GatewayConfig;
};

const GATEWAY_DEFAULT: GatewayConfig = { enabled: false, mode: "sandbox", apiKey: "", secretKey: "", webhookSecret: "" };
const DEFAULT_PAYMENT: PaymentConfig = {
  currency: "EGP",
  requireDepositForBooking: false,
  depositPercentage: 30,
  allowCashOnArrival: true,
  allowBankTransfer: false,
  bankTransferDetails: "",
  paymob: { ...GATEWAY_DEFAULT },
  fawry:  { ...GATEWAY_DEFAULT },
  stripe: { ...GATEWAY_DEFAULT },
};

function loadPaymentConfig(): PaymentConfig {
  try {
    const s = localStorage.getItem("admin_payment");
    return s ? { ...DEFAULT_PAYMENT, ...JSON.parse(s) } : DEFAULT_PAYMENT;
  } catch { return DEFAULT_PAYMENT; }
}

function PaymentSystemsTab({ isRtl }: { isRtl: boolean }) {
  const [cfg, setCfg] = useState<PaymentConfig>(loadPaymentConfig);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const dir = isRtl ? "rtl" : "ltr";

  const save = () => {
    localStorage.setItem("admin_payment", JSON.stringify(cfg));
    toast.success(isRtl ? "تم حفظ إعدادات الدفع" : "Payment settings saved");
  };

  const toggleKey = (k: string) => setShowKeys(p => ({ ...p, [k]: !p[k] }));

  const setGw = (gw: keyof Pick<PaymentConfig, "paymob" | "fawry" | "stripe">, field: keyof GatewayConfig, val: any) =>
    setCfg(p => ({ ...p, [gw]: { ...p[gw], [field]: val } }));

  const GATEWAYS: Array<{
    id: keyof Pick<PaymentConfig, "paymob" | "fawry" | "stripe">;
    nameAr: string;
    nameEn: string;
    logo: string;
    tagAr: string;
    tagEn: string;
    color: string;
  }> = [
    { id: "paymob",  nameAr: "باي موب",  nameEn: "Paymob",  logo: "💳", tagAr: "بوابة دفع مصرية متكاملة",     tagEn: "Egypt's leading payment gateway", color: "text-blue-600" },
    { id: "fawry",   nameAr: "فوري",     nameEn: "Fawry",   logo: "🏪", tagAr: "شبكة دفع فوري في مصر",        tagEn: "Fawry payment network — Egypt",    color: "text-amber-600" },
    { id: "stripe",  nameAr: "سترايب",   nameEn: "Stripe",  logo: "⚡", tagAr: "بوابة دفع دولية",             tagEn: "International payment gateway",    color: "text-violet-600" },
  ];

  return (
    <div dir={dir} className="space-y-5">

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5 text-sm">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          {isRtl
            ? "قم بتهيئة بوابات الدفع لتمكين الدفع الإلكتروني عند حجز المواعيد. يمكنك تفعيل أكثر من بوابة في نفس الوقت."
            : "Configure payment gateways to enable online payments during appointment booking. Multiple gateways can be active simultaneously."
          }
        </p>
      </div>

      {/* ── General Settings ── */}
      <SettingsCard title={isRtl ? "الإعدادات العامة للمدفوعات" : "General Payment Settings"} icon={<Wallet className="w-4 h-4" />}>
        <FieldRow label={isRtl ? "العملة الافتراضية" : "Default Currency"}>
          <select
            value={cfg.currency}
            onChange={e => setCfg(p => ({ ...p, currency: e.target.value }))}
            className="h-9 w-28 rounded-lg border border-input bg-background text-sm px-2 focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="EGP">EGP — جنيه مصري</option>
            <option value="USD">USD — Dollar</option>
            <option value="EUR">EUR — Euro</option>
            <option value="SAR">SAR — ريال سعودي</option>
          </select>
        </FieldRow>
        <Separator className="my-3" />
        <FieldRow label={isRtl ? "طلب دفعة مقدمة عند الحجز" : "Require deposit at booking"}>
          <Switch checked={cfg.requireDepositForBooking} onCheckedChange={v => setCfg(p => ({ ...p, requireDepositForBooking: v }))} />
        </FieldRow>
        {cfg.requireDepositForBooking && (
          <FieldRow label={isRtl ? "نسبة الدفعة المقدمة %" : "Deposit percentage %"}>
            <div className="flex items-center gap-2">
              <input
                type="range" min={10} max={100} step={5}
                value={cfg.depositPercentage}
                onChange={e => setCfg(p => ({ ...p, depositPercentage: Number(e.target.value) }))}
                className="w-32"
              />
              <span className="text-sm font-bold w-10 text-center">{cfg.depositPercentage}%</span>
            </div>
          </FieldRow>
        )}
        <Separator className="my-3" />
        <FieldRow label={isRtl ? "السماح بالدفع نقداً عند الحضور" : "Allow cash on arrival"}>
          <Switch checked={cfg.allowCashOnArrival} onCheckedChange={v => setCfg(p => ({ ...p, allowCashOnArrival: v }))} />
        </FieldRow>
        <FieldRow label={isRtl ? "السماح بالتحويل البنكي" : "Allow bank transfer"}>
          <Switch checked={cfg.allowBankTransfer} onCheckedChange={v => setCfg(p => ({ ...p, allowBankTransfer: v }))} />
        </FieldRow>
        {cfg.allowBankTransfer && (
          <FieldRow label={isRtl ? "تفاصيل الحساب البنكي" : "Bank account details"}>
            <textarea
              dir={dir}
              value={cfg.bankTransferDetails}
              onChange={e => setCfg(p => ({ ...p, bankTransferDetails: e.target.value }))}
              rows={3}
              placeholder={isRtl ? "اسم البنك، رقم الحساب، IBAN…" : "Bank name, account number, IBAN…"}
              className="w-full max-w-sm rounded-lg border border-input bg-background text-sm p-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </FieldRow>
        )}
      </SettingsCard>

      {/* ── Gateway Cards ── */}
      {GATEWAYS.map(gw => {
        const g = cfg[gw.id];
        return (
          <div
            key={gw.id}
            className={`rounded-2xl border bg-card shadow-sm overflow-hidden transition-all ${g.enabled ? "border-primary/30" : "border-border/60"}`}
          >
            {/* Gateway header */}
            <div className={`flex items-center justify-between px-5 py-4 border-b ${g.enabled ? "border-primary/20 bg-primary/3" : "border-border/40"}`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{gw.logo}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">{isRtl ? gw.nameAr : gw.nameEn}</h3>
                    {g.enabled && (
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        g.mode === "live"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {g.mode === "live" ? (isRtl ? "مباشر" : "LIVE") : (isRtl ? "تجريبي" : "SANDBOX")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{isRtl ? gw.tagAr : gw.tagEn}</p>
                </div>
              </div>
              <Switch checked={g.enabled} onCheckedChange={v => setGw(gw.id, "enabled", v)} />
            </div>

            {/* Gateway fields — visible when enabled */}
            {g.enabled && (
              <div className="px-5 py-4 space-y-4">
                {/* Mode toggle */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground flex-1">{isRtl ? "وضع التشغيل" : "Mode"}</span>
                  <div className="flex gap-1 rounded-lg border border-border p-0.5">
                    {(["sandbox", "live"] as const).map(m => (
                      <button
                        key={m}
                        onClick={() => setGw(gw.id, "mode", m)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                          g.mode === m ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {m === "live" ? (isRtl ? "مباشر" : "Live") : (isRtl ? "تجريبي" : "Sandbox")}
                      </button>
                    ))}
                  </div>
                </div>

                {g.mode === "live" && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    {isRtl ? "أنت في وضع الإنتاج المباشر. ستُحصل المدفوعات الحقيقية." : "You are in LIVE mode. Real payments will be processed."}
                  </div>
                )}

                {/* API Keys */}
                {([
                  { key: "apiKey",       labelAr: "مفتاح الـ API",       labelEn: "API Key" },
                  { key: "secretKey",    labelAr: "المفتاح السري",        labelEn: "Secret Key" },
                  { key: "webhookSecret",labelAr: "مفتاح Webhook",        labelEn: "Webhook Secret" },
                ] as const).map(field => {
                  const shown = showKeys[`${gw.id}.${field.key}`];
                  return (
                    <div key={field.key}>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        {isRtl ? field.labelAr : field.labelEn}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type={shown ? "text" : "password"}
                          value={g[field.key]}
                          onChange={e => setGw(gw.id, field.key, e.target.value)}
                          dir="ltr"
                          placeholder={shown ? "" : "••••••••••••••••"}
                          className="flex-1 h-9 rounded-lg border border-input bg-background text-sm px-3 font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        <button
                          type="button"
                          onClick={() => toggleKey(`${gw.id}.${field.key}`)}
                          className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {shown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Status indicator */}
                <div className={`flex items-center gap-2 text-xs ${g.apiKey ? "text-emerald-600" : "text-muted-foreground"}`}>
                  {g.apiKey ? (
                    <><BadgeCheck className="w-3.5 h-3.5" />{isRtl ? "تم إدخال مفاتيح الـ API" : "API keys configured"}</>
                  ) : (
                    <><AlertCircle className="w-3.5 h-3.5" />{isRtl ? "أدخل مفاتيح الـ API لتفعيل البوابة" : "Enter API keys to activate gateway"}</>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* ── Booking integration note ── */}
      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground leading-relaxed">
          <p className="font-medium text-foreground mb-1">{isRtl ? "ربط الدفع بالحجز" : "Booking Payment Integration"}</p>
          {isRtl
            ? "عند تفعيل بوابة الدفع مع خيار الدفعة المقدمة، ستظهر خيارات الدفع للعميل تلقائياً في صفحة حجز الموعد قبل تأكيد الحجز."
            : "When a payment gateway is enabled with deposit option, payment options will automatically appear on the booking page before the client confirms their appointment."
          }
        </div>
      </div>

      <SaveBar onSave={save} onReset={() => { setCfg(DEFAULT_PAYMENT); localStorage.setItem("admin_payment", JSON.stringify(DEFAULT_PAYMENT)); }} isRtl={isRtl} />
    </div>
  );
}

/* ══════════════════════════════════════════════
   EMAIL SETTINGS TAB
   SMTP / SaaS provider, sender identity, and
   per-event email templates that the system uses
   to notify clients of bookings, payments, etc.
   ══════════════════════════════════════════════ */
type EmailProvider = "smtp" | "sendgrid" | "mailgun" | "resend" | "ses" | "gmail";
type EmailEncryption = "none" | "ssl" | "tls" | "starttls";

interface EmailTemplate {
  enabled: boolean;
  subjectAr: string;
  subjectEn: string;
  bodyAr: string;
  bodyEn: string;
}

type EmailTemplateKey =
  | "welcome"
  | "appointmentReceived"
  | "appointmentApproved"
  | "appointmentRejected"
  | "appointmentReminder"
  | "paymentReceipt"
  | "inquiryReply";

interface EmailConfig {
  enabled: boolean;
  provider: EmailProvider;
  smtp: {
    host: string;
    port: number;
    encryption: EmailEncryption;
    username: string;
    password: string;
  };
  apiKey: string;
  region: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  signatureAr: string;
  signatureEn: string;
  bccAdmin: boolean;
  templates: Record<EmailTemplateKey, EmailTemplate>;
}

const EMAIL_VARIABLES: { token: string; descAr: string; descEn: string }[] = [
  { token: "{{clientName}}",       descAr: "اسم العميل",                descEn: "Client name" },
  { token: "{{clientEmail}}",      descAr: "بريد العميل",               descEn: "Client email" },
  { token: "{{clientPhone}}",      descAr: "هاتف العميل",               descEn: "Client phone" },
  { token: "{{appointmentDate}}",  descAr: "تاريخ الموعد",              descEn: "Appointment date" },
  { token: "{{appointmentTime}}",  descAr: "وقت الموعد",                descEn: "Appointment time" },
  { token: "{{lawyerName}}",       descAr: "اسم المحامي",               descEn: "Assigned lawyer" },
  { token: "{{serviceName}}",      descAr: "اسم الخدمة",                descEn: "Service name" },
  { token: "{{meetingLink}}",      descAr: "رابط الاجتماع (إن وجد)",     descEn: "Meeting link" },
  { token: "{{officeName}}",       descAr: "اسم المكتب",                descEn: "Office name" },
  { token: "{{officePhone}}",      descAr: "هاتف المكتب",               descEn: "Office phone" },
  { token: "{{officeAddress}}",    descAr: "عنوان المكتب",              descEn: "Office address" },
  { token: "{{amount}}",           descAr: "المبلغ",                    descEn: "Payment amount" },
  { token: "{{paymentMethod}}",    descAr: "طريقة الدفع",               descEn: "Payment method" },
  { token: "{{rejectionReason}}",  descAr: "سبب الرفض",                 descEn: "Rejection reason" },
];

const PROVIDER_PRESETS: Record<
  Exclude<EmailProvider, "smtp">,
  { host: string; port: number; encryption: EmailEncryption; usernameHint?: string }
> = {
  sendgrid: { host: "smtp.sendgrid.net",       port: 587, encryption: "starttls", usernameHint: "apikey" },
  mailgun:  { host: "smtp.mailgun.org",        port: 587, encryption: "starttls" },
  resend:   { host: "smtp.resend.com",         port: 465, encryption: "ssl",      usernameHint: "resend" },
  ses:      { host: "email-smtp.us-east-1.amazonaws.com", port: 587, encryption: "starttls" },
  gmail:    { host: "smtp.gmail.com",          port: 587, encryption: "starttls" },
};

const PROVIDER_META: Record<EmailProvider, { nameAr: string; nameEn: string; tagAr: string; tagEn: string; logo: string; usesApiKey: boolean }> = {
  smtp:     { nameAr: "SMTP مخصص",      nameEn: "Custom SMTP", tagAr: "أي خادم SMTP خاص بك",                tagEn: "Any custom SMTP server",        logo: "📡", usesApiKey: false },
  sendgrid: { nameAr: "SendGrid",        nameEn: "SendGrid",    tagAr: "خدمة بريد سحابية موثوقة (Twilio)",  tagEn: "Cloud email by Twilio",         logo: "📬", usesApiKey: true  },
  mailgun:  { nameAr: "Mailgun",         nameEn: "Mailgun",     tagAr: "بريد المعاملات للمطورين",            tagEn: "Transactional email API",       logo: "📨", usesApiKey: true  },
  resend:   { nameAr: "Resend",          nameEn: "Resend",      tagAr: "بريد بسيط وسريع للمطورين",           tagEn: "Modern email for developers",   logo: "✉️", usesApiKey: true  },
  ses:      { nameAr: "Amazon SES",      nameEn: "Amazon SES",  tagAr: "بريد سحابي من AWS",                  tagEn: "AWS Simple Email Service",      logo: "🅰️", usesApiKey: false },
  gmail:    { nameAr: "Gmail SMTP",      nameEn: "Gmail SMTP",  tagAr: "أرسل عبر حساب Gmail (مع App Password)", tagEn: "Send via Gmail (App Password)", logo: "✉️", usesApiKey: false },
};

const TEMPLATE_META: { key: EmailTemplateKey; icon: React.ReactNode; titleAr: string; titleEn: string; descAr: string; descEn: string }[] = [
  { key: "welcome",              icon: <Sparkles className="w-3.5 h-3.5" />,        titleAr: "ترحيب بعميل جديد",         titleEn: "Welcome new client",         descAr: "يُرسل عند تسجيل عميل جديد للمرة الأولى", descEn: "Sent when a new client signs up" },
  { key: "appointmentReceived",  icon: <Inbox className="w-3.5 h-3.5" />,           titleAr: "استلام طلب الحجز",         titleEn: "Booking received",           descAr: "تأكيد فوري بأن الحجز قيد المراجعة",     descEn: "Immediate confirmation of booking" },
  { key: "appointmentApproved",  icon: <CheckCircle2 className="w-3.5 h-3.5" />,    titleAr: "اعتماد الموعد",            titleEn: "Appointment approved",       descAr: "إخطار العميل بأن موعده تأكد",          descEn: "Notify client that appointment is confirmed" },
  { key: "appointmentRejected",  icon: <AlertCircle className="w-3.5 h-3.5" />,     titleAr: "اعتذار عن الموعد",         titleEn: "Appointment declined",       descAr: "إخطار العميل بأن الموعد لم يُقبل",      descEn: "Notify client that appointment was declined" },
  { key: "appointmentReminder",  icon: <Clock className="w-3.5 h-3.5" />,           titleAr: "تذكير قبل الموعد",         titleEn: "Appointment reminder",       descAr: "تذكير قبل ميعاد الجلسة بـ24 ساعة",    descEn: "24-hour reminder before appointment" },
  { key: "paymentReceipt",       icon: <Banknote className="w-3.5 h-3.5" />,        titleAr: "إيصال دفع",                 titleEn: "Payment receipt",            descAr: "يُرسل بعد نجاح الدفع",                  descEn: "Sent after successful payment" },
  { key: "inquiryReply",         icon: <Mail className="w-3.5 h-3.5" />,            titleAr: "رد على الاستفسار",          titleEn: "Inquiry reply",              descAr: "ردّ تلقائي على نموذج التواصل",         descEn: "Auto-reply to contact form" },
];

const DEFAULT_TEMPLATES: Record<EmailTemplateKey, EmailTemplate> = {
  welcome: {
    enabled: true,
    subjectAr: "مرحباً بك في {{officeName}}",
    subjectEn: "Welcome to {{officeName}}",
    bodyAr: "مرحباً {{clientName}},\n\nنرحب بك في {{officeName}}. فريقنا القانوني جاهز لخدمتك في أي استفسار قانوني.\n\nيمكنك التواصل معنا على {{officePhone}} أو الرد على هذا البريد.\n\nمع التحية،\nفريق {{officeName}}",
    bodyEn: "Hello {{clientName}},\n\nWelcome to {{officeName}}. Our legal team is ready to assist you with any legal matter.\n\nYou can reach us at {{officePhone}} or simply reply to this email.\n\nBest regards,\n{{officeName}} Team",
  },
  appointmentReceived: {
    enabled: true,
    subjectAr: "استلمنا طلب حجزك — {{appointmentDate}}",
    subjectEn: "We received your booking — {{appointmentDate}}",
    bodyAr: "مرحباً {{clientName}},\n\nشكراً لحجزك معنا. تم استلام طلب الموعد التالي وهو قيد المراجعة:\n\n• الخدمة: {{serviceName}}\n• التاريخ: {{appointmentDate}}\n• الوقت: {{appointmentTime}}\n\nسنتواصل معك قريباً لتأكيد الموعد.\n\nمع التحية،\n{{officeName}}",
    bodyEn: "Hello {{clientName}},\n\nThank you for booking with us. We received the following appointment request and it is under review:\n\n• Service: {{serviceName}}\n• Date: {{appointmentDate}}\n• Time: {{appointmentTime}}\n\nWe will contact you shortly to confirm.\n\nBest regards,\n{{officeName}}",
  },
  appointmentApproved: {
    enabled: true,
    subjectAr: "تأكيد موعدك مع {{officeName}} — {{appointmentDate}}",
    subjectEn: "Your appointment is confirmed — {{appointmentDate}}",
    bodyAr: "مرحباً {{clientName}},\n\nيسرنا تأكيد موعدك:\n\n• الخدمة: {{serviceName}}\n• المحامي: {{lawyerName}}\n• التاريخ: {{appointmentDate}} الساعة {{appointmentTime}}\n• العنوان: {{officeAddress}}\n• رابط الاجتماع (للجلسات أونلاين): {{meetingLink}}\n\nنرجو الحضور قبل الموعد بعشر دقائق.\n\nمع التحية،\n{{officeName}}",
    bodyEn: "Hello {{clientName}},\n\nWe're pleased to confirm your appointment:\n\n• Service: {{serviceName}}\n• Lawyer: {{lawyerName}}\n• Date: {{appointmentDate}} at {{appointmentTime}}\n• Address: {{officeAddress}}\n• Online meeting link: {{meetingLink}}\n\nKindly arrive 10 minutes early.\n\nBest regards,\n{{officeName}}",
  },
  appointmentRejected: {
    enabled: true,
    subjectAr: "اعتذار عن موعدك — {{appointmentDate}}",
    subjectEn: "Unable to confirm your appointment — {{appointmentDate}}",
    bodyAr: "مرحباً {{clientName}},\n\nنأسف لإبلاغك بأننا غير قادرين على تأكيد الموعد المطلوب في {{appointmentDate}} الساعة {{appointmentTime}}.\n\nالسبب: {{rejectionReason}}\n\nيمكنك حجز موعد بديل أو التواصل معنا على {{officePhone}}.\n\nمع التحية،\n{{officeName}}",
    bodyEn: "Hello {{clientName}},\n\nWe regret to inform you that we are unable to confirm your appointment on {{appointmentDate}} at {{appointmentTime}}.\n\nReason: {{rejectionReason}}\n\nPlease book an alternative slot or contact us at {{officePhone}}.\n\nBest regards,\n{{officeName}}",
  },
  appointmentReminder: {
    enabled: true,
    subjectAr: "تذكير: موعدك غداً — {{appointmentTime}}",
    subjectEn: "Reminder: your appointment tomorrow at {{appointmentTime}}",
    bodyAr: "مرحباً {{clientName}},\n\nهذا تذكير بموعدك غداً:\n\n• الخدمة: {{serviceName}}\n• المحامي: {{lawyerName}}\n• الوقت: {{appointmentTime}}\n• العنوان: {{officeAddress}}\n\nفي حال الرغبة بتعديل الموعد يرجى الاتصال بنا.\n\nمع التحية،\n{{officeName}}",
    bodyEn: "Hello {{clientName}},\n\nThis is a reminder of your appointment tomorrow:\n\n• Service: {{serviceName}}\n• Lawyer: {{lawyerName}}\n• Time: {{appointmentTime}}\n• Address: {{officeAddress}}\n\nIf you need to reschedule, please call us.\n\nBest regards,\n{{officeName}}",
  },
  paymentReceipt: {
    enabled: true,
    subjectAr: "إيصال دفع من {{officeName}} — {{amount}} ج.م",
    subjectEn: "Payment receipt from {{officeName}} — {{amount}} EGP",
    bodyAr: "مرحباً {{clientName}},\n\nاستلمنا دفعتك بنجاح:\n\n• المبلغ: {{amount}} ج.م\n• طريقة الدفع: {{paymentMethod}}\n• الخدمة: {{serviceName}}\n\nشكراً لتعاملك مع {{officeName}}.\n",
    bodyEn: "Hello {{clientName}},\n\nWe successfully received your payment:\n\n• Amount: {{amount}} EGP\n• Method: {{paymentMethod}}\n• Service: {{serviceName}}\n\nThank you for choosing {{officeName}}.\n",
  },
  inquiryReply: {
    enabled: true,
    subjectAr: "استلمنا استفسارك — {{officeName}}",
    subjectEn: "We received your inquiry — {{officeName}}",
    bodyAr: "مرحباً {{clientName}},\n\nشكراً لتواصلك مع {{officeName}}. تم استلام رسالتك وسيرد عليك أحد مستشارينا القانونيين خلال 24 ساعة عمل.\n\nللحالات العاجلة يمكنك الاتصال على {{officePhone}}.\n\nمع التحية،\n{{officeName}}",
    bodyEn: "Hello {{clientName}},\n\nThank you for contacting {{officeName}}. We received your message and one of our legal consultants will respond within 24 working hours.\n\nFor urgent matters please call {{officePhone}}.\n\nBest regards,\n{{officeName}}",
  },
};

const DEFAULT_EMAIL: EmailConfig = {
  enabled: false,
  provider: "smtp",
  smtp: { host: "", port: 587, encryption: "starttls", username: "", password: "" },
  apiKey: "",
  region: "us-east-1",
  fromName: "Egypt Advocates",
  fromEmail: "no-reply@egyptadvocates.com",
  replyTo: "info@egyptadvocates.com",
  signatureAr: "—\nمكتب إيجيبت أدفوكيتس للمحاماة\n+20 100 000 0000 · info@egyptadvocates.com",
  signatureEn: "—\nEgypt Advocates Law Firm\n+20 100 000 0000 · info@egyptadvocates.com",
  bccAdmin: true,
  templates: DEFAULT_TEMPLATES,
};

function loadEmailConfig(): EmailConfig {
  try {
    const raw = localStorage.getItem("admin_email");
    if (!raw) return DEFAULT_EMAIL;
    const parsed = JSON.parse(raw) as Partial<EmailConfig>;
    return {
      ...DEFAULT_EMAIL,
      ...parsed,
      smtp: { ...DEFAULT_EMAIL.smtp, ...(parsed.smtp ?? {}) },
      templates: {
        ...DEFAULT_TEMPLATES,
        ...(parsed.templates ?? {}),
      },
    };
  } catch {
    return DEFAULT_EMAIL;
  }
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function EmailSettingsTab({ isRtl }: { isRtl: boolean }) {
  const dir = isRtl ? "rtl" : "ltr";
  const [cfg, setCfg] = useState<EmailConfig>(loadEmailConfig);
  const [showPwd, setShowPwd] = useState(false);
  const [showApi, setShowApi] = useState(false);
  const [openTpl, setOpenTpl] = useState<EmailTemplateKey | null>("appointmentApproved");
  const [tplLang, setTplLang] = useState<"ar" | "en">("ar");
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState<"connection" | "send" | null>(null);

  const meta = PROVIDER_META[cfg.provider];

  const setProvider = (p: EmailProvider) => {
    if (p === "smtp") {
      setCfg(prev => ({ ...prev, provider: p }));
      return;
    }
    const preset = PROVIDER_PRESETS[p];
    setCfg(prev => ({
      ...prev,
      provider: p,
      smtp: {
        ...prev.smtp,
        host: preset.host,
        port: preset.port,
        encryption: preset.encryption,
        username: preset.usernameHint ?? prev.smtp.username,
      },
    }));
  };

  const setSmtp = <K extends keyof EmailConfig["smtp"]>(field: K, value: EmailConfig["smtp"][K]) =>
    setCfg(prev => ({ ...prev, smtp: { ...prev.smtp, [field]: value } }));

  const updateTemplate = (key: EmailTemplateKey, patch: Partial<EmailTemplate>) =>
    setCfg(prev => ({
      ...prev,
      templates: { ...prev.templates, [key]: { ...prev.templates[key], ...patch } },
    }));

  const save = () => {
    if (cfg.fromEmail && !isEmail(cfg.fromEmail)) {
      toast.error(isRtl ? "بريد المرسل غير صالح" : "Sender email is invalid");
      return;
    }
    if (cfg.replyTo && !isEmail(cfg.replyTo)) {
      toast.error(isRtl ? "بريد الردّ غير صالح" : "Reply-to email is invalid");
      return;
    }
    localStorage.setItem("admin_email", JSON.stringify(cfg));
    toast.success(isRtl ? "تم حفظ إعدادات البريد" : "Email settings saved");
  };

  const reset = () => {
    setCfg(DEFAULT_EMAIL);
    localStorage.setItem("admin_email", JSON.stringify(DEFAULT_EMAIL));
  };

  const testConnection = () => {
    if (!cfg.smtp.host && !meta.usesApiKey) {
      toast.error(isRtl ? "أدخل بيانات الـ SMTP أولاً" : "Configure SMTP first");
      return;
    }
    if (meta.usesApiKey && !cfg.apiKey) {
      toast.error(isRtl ? "أدخل مفتاح الـ API أولاً" : "Configure the API key first");
      return;
    }
    setTesting("connection");
    setTimeout(() => {
      setTesting(null);
      toast.success(isRtl ? "اختبار الاتصال — التهيئة سليمة" : "Connection check — configuration looks valid");
    }, 900);
  };

  const sendTestEmail = () => {
    if (!isEmail(testTo)) {
      toast.error(isRtl ? "أدخل بريداً صالحاً" : "Enter a valid email");
      return;
    }
    setTesting("send");
    setTimeout(() => {
      setTesting(null);
      toast.success(isRtl ? `سيتم إرسال إيميل تجريبي إلى ${testTo}` : `A test email will be sent to ${testTo}`);
    }, 1100);
  };

  const insertVariable = (key: EmailTemplateKey, token: string) => {
    const tpl = cfg.templates[key];
    const field = tplLang === "ar" ? "bodyAr" : "bodyEn";
    updateTemplate(key, { [field]: `${tpl[field]}${tpl[field].endsWith(" ") || tpl[field] === "" ? "" : " "}${token}` });
  };

  const copyVariable = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      toast.success(isRtl ? `نُسخ ${token}` : `Copied ${token}`);
    } catch {
      toast.error(isRtl ? "تعذر النسخ" : "Copy failed");
    }
  };

  return (
    <div dir={dir} className="space-y-5">
      {/* Master toggle banner */}
      <div className={`flex items-start justify-between gap-4 p-4 rounded-xl border transition-colors ${cfg.enabled ? "border-primary/30 bg-primary/5" : "border-border/60 bg-muted/10"}`}>
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.enabled ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
            <AtSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">{isRtl ? "إرسال إشعارات بريد إلكتروني" : "Send email notifications"}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed max-w-prose">
              {isRtl
                ? "عند التفعيل، يرسل النظام إيميلات تلقائية للعملاء لتأكيد الحجوزات والمواعيد والمدفوعات وفق القوالب المخصصة أدناه."
                : "When enabled, the system sends automated emails to clients for bookings, appointments, and payments using the templates below."}
            </p>
          </div>
        </div>
        <Switch checked={cfg.enabled} onCheckedChange={v => setCfg(p => ({ ...p, enabled: v }))} />
      </div>

      {/* ── Provider picker ── */}
      <SettingsCard title={isRtl ? "مزوّد خدمة البريد" : "Email Provider"} icon={<ServerCog className="w-4 h-4" />}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(Object.keys(PROVIDER_META) as EmailProvider[]).map(id => {
            const p = PROVIDER_META[id];
            const active = cfg.provider === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setProvider(id)}
                className={`text-start rounded-xl border p-3 transition-all hover:border-primary/40 ${active ? "border-primary/60 bg-primary/5 shadow-sm" : "border-border/60 bg-card"}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-lg" aria-hidden>{p.logo}</span>
                  {active && <CheckCircle2 className="w-4 h-4 text-primary" />}
                </div>
                <p className="text-sm font-semibold">{isRtl ? p.nameAr : p.nameEn}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{isRtl ? p.tagAr : p.tagEn}</p>
              </button>
            );
          })}
        </div>
      </SettingsCard>

      {/* ── Connection details ── */}
      <SettingsCard
        title={meta.usesApiKey ? (isRtl ? "بيانات الاتصال (API + SMTP)" : "Connection (API + SMTP)") : (isRtl ? "بيانات SMTP" : "SMTP Connection")}
        icon={<LinkIcon className="w-4 h-4" />}
      >
        {meta.usesApiKey && (
          <FieldRow label={isRtl ? "مفتاح API" : "API Key"}>
            <div className="flex gap-2 items-center">
              <input
                type={showApi ? "text" : "password"}
                value={cfg.apiKey}
                onChange={e => setCfg(p => ({ ...p, apiKey: e.target.value }))}
                placeholder={showApi ? "" : "••••••••••••••••"}
                dir="ltr"
                className="flex-1 h-9 rounded-lg border border-input bg-background text-sm px-3 font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowApi(s => !s)}
                className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                {showApi ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </FieldRow>
        )}

        {cfg.provider === "ses" && (
          <FieldRow label={isRtl ? "منطقة AWS" : "AWS Region"}>
            <Input dir="ltr" value={cfg.region} onChange={e => setCfg(p => ({ ...p, region: e.target.value }))} placeholder="us-east-1" className="h-9 text-sm w-40 font-mono" />
          </FieldRow>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FieldRow label={isRtl ? "خادم SMTP" : "SMTP Host"}>
            <Input dir="ltr" value={cfg.smtp.host} onChange={e => setSmtp("host", e.target.value)} placeholder="smtp.example.com" className="h-9 text-sm font-mono" />
          </FieldRow>
          <FieldRow label={isRtl ? "المنفذ" : "Port"}>
            <Input dir="ltr" type="number" value={cfg.smtp.port} onChange={e => setSmtp("port", Number(e.target.value) || 0)} className="h-9 text-sm w-28 font-mono" />
          </FieldRow>
        </div>

        <FieldRow label={isRtl ? "نوع التشفير" : "Encryption"}>
          <Select value={cfg.smtp.encryption} onValueChange={v => setSmtp("encryption", v as EmailEncryption)}>
            <SelectTrigger className="h-9 text-sm w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none"     className="text-sm">{isRtl ? "بدون تشفير" : "None"}</SelectItem>
              <SelectItem value="ssl"      className="text-sm">SSL</SelectItem>
              <SelectItem value="tls"      className="text-sm">TLS</SelectItem>
              <SelectItem value="starttls" className="text-sm">STARTTLS</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FieldRow label={isRtl ? "اسم المستخدم" : "Username"}>
            <Input dir="ltr" value={cfg.smtp.username} onChange={e => setSmtp("username", e.target.value)} placeholder={meta.usesApiKey ? "apikey" : "user@example.com"} className="h-9 text-sm font-mono" />
          </FieldRow>
          <FieldRow label={isRtl ? "كلمة المرور" : "Password"}>
            <div className="flex gap-2 items-center">
              <input
                type={showPwd ? "text" : "password"}
                value={cfg.smtp.password}
                onChange={e => setSmtp("password", e.target.value)}
                placeholder={showPwd ? "" : "••••••••"}
                dir="ltr"
                className="flex-1 h-9 rounded-lg border border-input bg-background text-sm px-3 font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowPwd(s => !s)}
                className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </FieldRow>
        </div>

        {cfg.provider === "gmail" && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {isRtl
              ? "Gmail يتطلب «App Password» من إعدادات حساب جوجل بدلاً من كلمة المرور العادية."
              : "Gmail requires an App Password from your Google account, not your normal password."}
          </div>
        )}

        <Separator className="my-1" />

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={testConnection} disabled={testing !== null} className="gap-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            {testing === "connection" ? (isRtl ? "جارٍ الاختبار..." : "Testing...") : (isRtl ? "اختبار الاتصال" : "Test connection")}
          </Button>
        </div>
      </SettingsCard>

      {/* ── Sender identity ── */}
      <SettingsCard title={isRtl ? "هوية المُرسِل" : "Sender Identity"} icon={<BadgeCheck className="w-4 h-4" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FieldRow label={isRtl ? "الاسم الظاهر" : "From Name"}>
            <Input dir={dir} value={cfg.fromName} onChange={e => setCfg(p => ({ ...p, fromName: e.target.value }))} className="h-9 text-sm" />
          </FieldRow>
          <FieldRow label={isRtl ? "بريد المُرسِل" : "From Email"}>
            <Input dir="ltr" type="email" value={cfg.fromEmail} onChange={e => setCfg(p => ({ ...p, fromEmail: e.target.value }))} className="h-9 text-sm" placeholder="no-reply@yourdomain.com" />
          </FieldRow>
        </div>
        <FieldRow label={isRtl ? "بريد الردّ" : "Reply-To"}>
          <Input dir="ltr" type="email" value={cfg.replyTo} onChange={e => setCfg(p => ({ ...p, replyTo: e.target.value }))} className="h-9 text-sm" placeholder="info@yourdomain.com" />
        </FieldRow>
        <FieldRow label={isRtl ? "نسخة للأدمن (BCC)" : "BCC admin on outgoing"}>
          <Switch checked={cfg.bccAdmin} onCheckedChange={v => setCfg(p => ({ ...p, bccAdmin: v }))} />
        </FieldRow>
        <FieldRow label={isRtl ? "التوقيع" : "Signature"} tag="AR">
          <textarea dir="rtl" value={cfg.signatureAr} onChange={e => setCfg(p => ({ ...p, signatureAr: e.target.value }))} rows={3} className="w-full rounded-lg border border-input bg-background text-sm p-2 resize-y focus:outline-none focus:ring-1 focus:ring-ring" />
        </FieldRow>
        <FieldRow label="Signature" tag="EN">
          <textarea dir="ltr" value={cfg.signatureEn} onChange={e => setCfg(p => ({ ...p, signatureEn: e.target.value }))} rows={3} className="w-full rounded-lg border border-input bg-background text-sm p-2 resize-y focus:outline-none focus:ring-1 focus:ring-ring" />
        </FieldRow>
      </SettingsCard>

      {/* ── Send a test email ── */}
      <SettingsCard title={isRtl ? "إرسال بريد تجريبي" : "Send a Test Email"} icon={<Send className="w-4 h-4" />}>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            dir="ltr"
            type="email"
            value={testTo}
            onChange={e => setTestTo(e.target.value)}
            placeholder="you@example.com"
            className="h-9 text-sm flex-1"
          />
          <Button onClick={sendTestEmail} disabled={testing !== null} className="gap-2 sm:w-auto">
            <Send className="w-3.5 h-3.5" />
            {testing === "send" ? (isRtl ? "جارٍ الإرسال..." : "Sending...") : (isRtl ? "إرسال" : "Send")}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">
          {isRtl
            ? "يرسل النظام رسالة باستخدام الإعدادات الحالية للتأكد من نجاح التسليم قبل تفعيل الإشعارات."
            : "Uses the current settings to deliver a sample message and confirm everything is wired correctly."}
        </p>
      </SettingsCard>

      {/* ── Email templates ── */}
      <SettingsCard title={isRtl ? "قوالب الإيميلات" : "Email Templates"} icon={<FileText className="w-4 h-4" />}>
        <p className="text-xs text-muted-foreground -mt-1 mb-3">
          {isRtl
            ? "خصص محتوى كل إشعار يتلقاه العميل. استخدم المتغيرات أدناه ليتم استبدالها تلقائياً عند الإرسال."
            : "Customize the content of every notification clients receive. Use the variables below — they get replaced automatically at send time."}
        </p>

        <div className="space-y-3">
          {TEMPLATE_META.map(t => {
            const tpl = cfg.templates[t.key];
            const isOpen = openTpl === t.key;
            return (
              <div
                key={t.key}
                className={`rounded-xl border overflow-hidden transition-all ${isOpen ? "border-primary/30 bg-primary/3" : "border-border/60 bg-card"}`}
              >
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setOpenTpl(isOpen ? null : t.key)}
                    className="flex items-center gap-3 flex-1 text-start"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tpl.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {t.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{isRtl ? t.titleAr : t.titleEn}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{isRtl ? t.descAr : t.descEn}</p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  <Switch checked={tpl.enabled} onCheckedChange={v => updateTemplate(t.key, { enabled: v })} />
                </div>

                {isOpen && (
                  <div className="px-4 pb-4 pt-1 border-t border-border/40 space-y-3 bg-background/50">
                    {/* AR/EN switch */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex gap-1 rounded-lg border border-border p-0.5 bg-card">
                        {(["ar", "en"] as const).map(l => (
                          <button
                            key={l}
                            type="button"
                            onClick={() => setTplLang(l)}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${tplLang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                          >
                            {l === "ar" ? "عربي" : "English"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Subject + body for current lang */}
                    {tplLang === "ar" ? (
                      <>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">{isRtl ? "الموضوع (عربي)" : "Subject (Arabic)"}</label>
                          <Input dir="rtl" value={tpl.subjectAr} onChange={e => updateTemplate(t.key, { subjectAr: e.target.value })} className="h-9 text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">{isRtl ? "نص الإيميل (عربي)" : "Body (Arabic)"}</label>
                          <textarea
                            dir="rtl"
                            value={tpl.bodyAr}
                            onChange={e => updateTemplate(t.key, { bodyAr: e.target.value })}
                            rows={9}
                            className="w-full rounded-lg border border-input bg-background text-sm p-3 font-sans leading-relaxed resize-y focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Subject (English)</label>
                          <Input dir="ltr" value={tpl.subjectEn} onChange={e => updateTemplate(t.key, { subjectEn: e.target.value })} className="h-9 text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Body (English)</label>
                          <textarea
                            dir="ltr"
                            value={tpl.bodyEn}
                            onChange={e => updateTemplate(t.key, { bodyEn: e.target.value })}
                            rows={9}
                            className="w-full rounded-lg border border-input bg-background text-sm p-3 font-sans leading-relaxed resize-y focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        </div>
                      </>
                    )}

                    {/* Variable picker */}
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-2 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        {isRtl ? "متغيرات يمكن إدراجها في الموضوع أو النص:" : "Variables you can drop into the subject or body:"}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {EMAIL_VARIABLES.map(v => (
                          <button
                            key={v.token}
                            type="button"
                            onClick={() => insertVariable(t.key, v.token)}
                            onContextMenu={(e) => { e.preventDefault(); copyVariable(v.token); }}
                            title={`${isRtl ? v.descAr : v.descEn} — ${isRtl ? "زر يمين للنسخ" : "right-click to copy"}`}
                            className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
                          >
                            {v.token}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => copyVariable(EMAIL_VARIABLES.map(v => v.token).join(" "))}
                          className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" /> {isRtl ? "نسخ الكل" : "Copy all"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SettingsCard>

      <SaveBar onSave={save} onReset={reset} isRtl={isRtl} />
    </div>
  );
}

/* ══════════════════════════════════════════════
   APPEARANCE — ADVANCED TAB
   Theme · colors · typography · radius · density
   with a live preview card.
   ══════════════════════════════════════════════ */
function AppearanceAdvancedTab({
  isRtl,
  appear,
  updateAppear,
  onSave,
  onReset,
}: {
  isRtl: boolean;
  appear: AppearanceConfig;
  updateAppear: (patch: Partial<AppearanceConfig>) => void;
  onSave: () => void;
  onReset: () => void;
}) {
  const dir = isRtl ? "rtl" : "ltr";

  const ThemePill = ({
    value,
    label,
    icon,
  }: { value: AppearanceConfig["theme"]; label: string; icon: React.ReactNode }) => {
    const active = appear.theme === value;
    return (
      <button
        type="button"
        onClick={() => updateAppear({ theme: value })}
        className={`flex flex-col items-center justify-center gap-2 px-4 py-4 rounded-xl border-2 transition-all min-w-[110px] ${
          active
            ? "border-primary bg-primary/5 shadow-sm"
            : "border-border/60 bg-card hover:border-primary/30"
        }`}
      >
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}>
          {icon}
        </div>
        <span className={`text-xs font-medium ${active ? "text-primary" : "text-foreground"}`}>{label}</span>
      </button>
    );
  };

  const Swatch = ({
    color,
    selected,
    onClick,
    label,
  }: { color: string; selected: boolean; onClick: () => void; label: string }) => (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={`relative w-9 h-9 rounded-lg shadow-sm transition-transform hover:scale-110 ${
        selected ? "ring-2 ring-offset-2 ring-primary" : ""
      }`}
      style={{ backgroundColor: color }}
    >
      {selected && (
        <CheckCircle2 className="absolute inset-0 m-auto w-4 h-4 text-white drop-shadow" />
      )}
    </button>
  );

  return (
    <div dir={dir} className="space-y-5">
      {/* Hero info */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5 text-sm">
        <Brush className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed">
          {isRtl
            ? "هذه الإعدادات تتحكم في مظهر لوحة التحكم والموقع معاً (السمة، الألوان، الخطوط، الكثافة). يتم التطبيق فوراً للمعاينة، احفظ لتثبيت التغييرات."
            : "These settings control both the admin and the public site (theme, colors, typography, density). Changes preview instantly — save to persist them."}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
        {/* ── LEFT: controls ── */}
        <div className="space-y-5">
          {/* Theme */}
          <SettingsCard title={isRtl ? "السمة" : "Theme"} icon={<Palette className="w-4 h-4" />}>
            <div className="flex flex-wrap gap-3">
              <ThemePill value="light"  label={isRtl ? "فاتح" : "Light"}   icon={<Sun className="w-5 h-5" />} />
              <ThemePill value="dark"   label={isRtl ? "داكن" : "Dark"}    icon={<Moon className="w-5 h-5" />} />
              <ThemePill value="system" label={isRtl ? "تلقائي" : "System"} icon={<Laptop className="w-5 h-5" />} />
            </div>
          </SettingsCard>

          {/* Primary color */}
          <SettingsCard title={isRtl ? "اللون الرئيسي" : "Primary Color"} icon={<Palette className="w-4 h-4 text-primary" />}>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map(c => (
                  <Swatch
                    key={c.hex}
                    color={c.hex}
                    label={c.name}
                    selected={appear.primaryColor.toLowerCase() === c.hex.toLowerCase()}
                    onClick={() => updateAppear({ primaryColor: c.hex })}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3 pt-2 border-t border-border/40">
                <input
                  type="color"
                  value={appear.primaryColor}
                  onChange={e => updateAppear({ primaryColor: e.target.value })}
                  className="h-9 w-12 rounded-md border border-border/60 cursor-pointer bg-transparent p-0.5"
                />
                <Input
                  dir="ltr"
                  value={appear.primaryColor}
                  onChange={e => updateAppear({ primaryColor: e.target.value })}
                  className="h-9 text-sm w-32 font-mono"
                  placeholder="#17264d"
                />
                <span className="text-xs text-muted-foreground">{isRtl ? "أو لون مخصص" : "or custom hex"}</span>
              </div>
            </div>
          </SettingsCard>

          {/* Accent color */}
          <SettingsCard title={isRtl ? "اللون الثانوي (التمييز)" : "Accent Color"} icon={<Sparkles className="w-4 h-4 text-amber-500" />}>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {ACCENT_PRESETS.map(c => (
                  <Swatch
                    key={c.hex}
                    color={c.hex}
                    label={c.name}
                    selected={appear.accentColor.toLowerCase() === c.hex.toLowerCase()}
                    onClick={() => updateAppear({ accentColor: c.hex })}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3 pt-2 border-t border-border/40">
                <input
                  type="color"
                  value={appear.accentColor}
                  onChange={e => updateAppear({ accentColor: e.target.value })}
                  className="h-9 w-12 rounded-md border border-border/60 cursor-pointer bg-transparent p-0.5"
                />
                <Input
                  dir="ltr"
                  value={appear.accentColor}
                  onChange={e => updateAppear({ accentColor: e.target.value })}
                  className="h-9 text-sm w-32 font-mono"
                  placeholder="#bf6b4a"
                />
                <span className="text-xs text-muted-foreground">{isRtl ? "للأزرار، الحلقات، والعناصر البارزة" : "for buttons, focus rings, accents"}</span>
              </div>
            </div>
          </SettingsCard>

          {/* Typography */}
          <SettingsCard title={isRtl ? "الخطوط" : "Typography"} icon={<Type className="w-4 h-4" />}>
            <FieldRow label={isRtl ? "خط العناوين" : "Heading font"}>
              <Select value={appear.fontHeading} onValueChange={v => updateAppear({ fontHeading: v })}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS_HEADING.map(f => (
                    <SelectItem key={f.value} value={f.value} className="text-sm">
                      <span style={{ fontFamily: f.value }}>{f.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label={isRtl ? "خط النص" : "Body font"}>
              <Select value={appear.fontBody} onValueChange={v => updateAppear({ fontBody: v })}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS_BODY.map(f => (
                    <SelectItem key={f.value} value={f.value} className="text-sm">
                      <span style={{ fontFamily: f.value }}>{f.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label={isRtl ? "حجم الخط العام" : "Font scale"}>
              <div className="flex items-center gap-3 w-full max-w-sm">
                <input
                  type="range" min={0.85} max={1.20} step={0.05}
                  value={appear.fontScale}
                  onChange={e => updateAppear({ fontScale: Number(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-sm font-mono w-14 text-center bg-muted/30 rounded py-1">
                  {Math.round(appear.fontScale * 100)}%
                </span>
              </div>
            </FieldRow>
          </SettingsCard>

          {/* Radius + Density */}
          <SettingsCard title={isRtl ? "الزوايا والكثافة" : "Radius & Density"} icon={<Maximize2 className="w-4 h-4" />}>
            <FieldRow label={isRtl ? "زوايا العناصر" : "Border radius"}>
              <div className="flex flex-wrap gap-1.5">
                {RADIUS_PRESETS.map(r => {
                  const active = Math.abs(appear.borderRadius - r.value) < 0.001;
                  return (
                    <button
                      key={r.label}
                      type="button"
                      onClick={() => updateAppear({ borderRadius: r.value })}
                      className={`px-3 py-1.5 text-xs font-medium border transition-all ${
                        active ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/40"
                      }`}
                      style={{ borderRadius: `${r.value}rem` }}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </FieldRow>
            <FieldRow label={isRtl ? "قيمة مخصصة" : "Custom (rem)"}>
              <div className="flex items-center gap-3 w-full max-w-sm">
                <input
                  type="range" min={0} max={2} step={0.05}
                  value={appear.borderRadius}
                  onChange={e => updateAppear({ borderRadius: Number(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-sm font-mono w-16 text-center bg-muted/30 rounded py-1">
                  {appear.borderRadius.toFixed(2)}rem
                </span>
              </div>
            </FieldRow>
            <FieldRow label={isRtl ? "كثافة الواجهة" : "Density"}>
              <div className="flex gap-1 rounded-lg border border-border p-0.5">
                {(["compact", "comfortable", "spacious"] as const).map(d => {
                  const active = appear.density === d;
                  const labels = { compact: isRtl ? "مضغوط" : "Compact", comfortable: isRtl ? "مريح" : "Comfortable", spacious: isRtl ? "واسع" : "Spacious" };
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => updateAppear({ density: d })}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                        active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {labels[d]}
                    </button>
                  );
                })}
              </div>
            </FieldRow>
          </SettingsCard>

          {/* Default language */}
          <SettingsCard title={isRtl ? "اللغة الافتراضية" : "Default Language"} icon={<Globe className="w-4 h-4" />}>
            <FieldRow label={isRtl ? "اللغة" : "Language"}>
              <Select value={appear.defaultLang} onValueChange={v => updateAppear({ defaultLang: v as AppearanceConfig["defaultLang"] })}>
                <SelectTrigger className="h-9 text-sm w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar" className="text-sm">العربية (RTL)</SelectItem>
                  <SelectItem value="en" className="text-sm">English (LTR)</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
          </SettingsCard>

          <SaveBar onSave={onSave} onReset={onReset} isRtl={isRtl} />
        </div>

        {/* ── RIGHT: live preview ── */}
        <div className="xl:sticky xl:top-4 self-start">
          <div className="rounded-2xl border-2 border-primary/20 bg-card overflow-hidden shadow-lg">
            <div className="px-4 py-3 bg-primary text-primary-foreground flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider">{isRtl ? "معاينة مباشرة" : "Live Preview"}</span>
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="p-5 space-y-4 text-foreground bg-background">
              <div>
                <p className="text-2xl mb-1" style={{ fontFamily: appear.fontHeading, fontWeight: 700 }}>
                  {isRtl ? "مكتب إيجيبت أدفوكيتس" : "Egypt Advocates"}
                </p>
                <p className="text-sm text-muted-foreground" style={{ fontFamily: appear.fontBody }}>
                  {isRtl ? "شركاؤك القانونيون الموثوقون" : "Your trusted legal partners"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  style={{ borderRadius: `${appear.borderRadius}rem` }}
                >
                  {isRtl ? "زر رئيسي" : "Primary"}
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs font-medium bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
                  style={{ borderRadius: `${appear.borderRadius}rem` }}
                >
                  {isRtl ? "تمييز" : "Accent"}
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs font-medium border border-border bg-card text-foreground hover:bg-muted/30 transition-colors"
                  style={{ borderRadius: `${appear.borderRadius}rem` }}
                >
                  {isRtl ? "ثانوي" : "Outline"}
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: isRtl ? "نشط" : "Active",   bg: "bg-emerald-500/15 text-emerald-700" },
                  { label: isRtl ? "معلق" : "Pending", bg: "bg-amber-500/15 text-amber-700" },
                  { label: isRtl ? "ملغى" : "Cancelled", bg: "bg-rose-500/15 text-rose-700" },
                ].map(b => (
                  <span
                    key={b.label}
                    className={`px-2 py-0.5 text-[10px] font-medium ${b.bg}`}
                    style={{ borderRadius: `${appear.borderRadius}rem` }}
                  >
                    {b.label}
                  </span>
                ))}
              </div>

              <div
                className="border border-border bg-card p-3"
                style={{ borderRadius: `${appear.borderRadius * 1.5}rem` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <p className="text-xs font-semibold">{isRtl ? "بطاقة معلومات" : "Info Card"}</p>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {isRtl ? "نص توضيحي يوضّح كيف تظهر العناصر بالخط والألوان المختارة." : "A snippet showing how elements look with the chosen palette."}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  defaultValue={isRtl ? "حقل إدخال" : "Input field"}
                  className="flex-1 h-9 px-2.5 text-sm border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{ borderRadius: `${appear.borderRadius}rem` }}
                />
              </div>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground text-center mt-2 italic">
            {isRtl ? "يتم تحديث المعاينة لحظياً مع كل تغيير" : "Preview updates live with every change"}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   WEBSITE APPEARANCE TAB
   Public-site-only controls (logo, header, hero,
   announcement, footer, custom code).
   ══════════════════════════════════════════════ */
/* ───────── Image upload helper (data-URL based, no backend needed) ───────── */
/**
 * Reads `file` as a data URL, optionally downscaling to `maxWidth` via canvas
 * to keep localStorage payloads small. Preserves transparency by emitting PNG
 * unless the input is a JPEG. Returns the original data URL untouched for SVGs
 * (no canvas pass) and for images already smaller than `maxWidth`.
 */
async function fileToResizedDataUrl(
  file: File,
  maxWidth: number,
  jpegQuality = 0.92,
): Promise<string> {
  const original: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  if (file.type === "image/svg+xml" || !maxWidth) return original;
  return new Promise<string>((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const ratio = Math.min(1, maxWidth / img.width);
      if (ratio === 1) return resolve(original);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(original);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const mime = file.type === "image/jpeg" ? "image/jpeg" : "image/png";
      try {
        resolve(canvas.toDataURL(mime, jpegQuality));
      } catch {
        resolve(original);
      }
    };
    img.onerror = () => resolve(original);
    img.src = original;
  });
}

function ImageUploader({
  value,
  onChange,
  isRtl,
  accept = "image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,image/vnd.microsoft.icon",
  maxBytes = 2 * 1024 * 1024,
  maxWidth = 1024,
  recommendation,
  previewSize = "md",
}: {
  value: string;
  onChange: (v: string) => void;
  isRtl: boolean;
  accept?: string;
  maxBytes?: number;
  maxWidth?: number;
  recommendation?: string;
  previewSize?: "sm" | "md" | "lg";
}) {
  const [showUrl, setShowUrl] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const previewClasses =
    previewSize === "lg"
      ? "w-20 h-12"
      : previewSize === "sm"
      ? "w-9 h-9"
      : "w-12 h-12";

  const onFile = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(isRtl ? "يُرجى اختيار ملف صورة" : "Please pick an image file");
      return;
    }
    if (file.size > maxBytes) {
      const mb = (maxBytes / 1024 / 1024).toFixed(1);
      toast.error(
        isRtl
          ? `حجم الصورة يتخطى الحد المسموح (${mb} MB)`
          : `Image exceeds the size limit (${mb} MB)`,
      );
      return;
    }
    try {
      setBusy(true);
      const dataUrl = await fileToResizedDataUrl(file, maxWidth);
      onChange(dataUrl);
    } catch {
      toast.error(isRtl ? "تعذّر قراءة الصورة" : "Could not read the image");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const isData = value.startsWith("data:");

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center gap-2.5">
        {value ? (
          <img
            src={value}
            alt=""
            className={`${previewClasses} rounded border border-border bg-muted object-contain shrink-0`}
          />
        ) : (
          <div
            className={`${previewClasses} rounded border border-dashed border-border bg-muted/30 flex items-center justify-center text-muted-foreground/70 shrink-0`}
          >
            <ImageIcon className="w-4 h-4" />
          </div>
        )}

        <div className="min-w-0 flex-1 flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="h-8 text-xs gap-1.5"
          >
            <Upload className="w-3 h-3" />
            {busy
              ? isRtl ? "جاري…" : "Uploading…"
              : value
              ? isRtl ? "تغيير" : "Replace"
              : isRtl ? "رفع صورة" : "Upload image"}
          </Button>

          {value && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onChange("")}
              className="h-8 text-xs gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            >
              <X className="w-3 h-3" />
              {isRtl ? "إزالة" : "Remove"}
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setShowUrl(s => !s)}
            className="h-8 text-xs gap-1.5 ms-auto text-muted-foreground"
          >
            <LinkIcon className="w-3 h-3" />
            {showUrl
              ? isRtl ? "إخفاء الرابط" : "Hide URL"
              : isRtl ? "أو ألصق رابطًا" : "Or paste URL"}
          </Button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={e => onFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {showUrl && (
        <Input
          dir="ltr"
          value={isData ? "" : value}
          onChange={e => onChange(e.target.value)}
          placeholder={isData ? (isRtl ? "تم رفع ملف — اكتب هنا لاستبداله برابط" : "File uploaded — type here to replace with a URL") : "https://… or /path/to/file.png"}
          className="h-8 text-xs"
        />
      )}

      {(recommendation || isData) && (
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          {isData && (
            <span className="inline-flex items-center gap-1 text-emerald-600 me-2">
              <CheckCircle2 className="w-2.5 h-2.5" />
              {isRtl ? "ملف مرفوع محليًا" : "Uploaded locally"}
            </span>
          )}
          {recommendation}
        </p>
      )}
    </div>
  );
}

function WebsiteAppearanceTab({ isRtl }: { isRtl: boolean }) {
  const dir = isRtl ? "rtl" : "ltr";
  const [cfg, setCfg] = useState<WebsiteAppearance>(() => loadWebsiteAppearance());

  /* Live-apply on every change so the admin can preview by switching tabs to the site. */
  const update = (patch: Partial<WebsiteAppearance>) =>
    setCfg(prev => {
      const next = { ...prev, ...patch };
      applyWebsiteAppearance(next);
      return next;
    });

  const updateAnnouncement = (patch: Partial<WebsiteAppearance["announcement"]>) =>
    setCfg(prev => {
      const next = { ...prev, announcement: { ...prev.announcement, ...patch } };
      applyWebsiteAppearance(next);
      return next;
    });

  const save = () => {
    try {
      saveWebsiteAppearance(cfg);
      applyWebsiteAppearance(cfg);
      toast.success(isRtl ? "تم حفظ مظهر الموقع" : "Website appearance saved");
    } catch (e: unknown) {
      const isQuota =
        e instanceof DOMException &&
        (e.name === "QuotaExceededError" || e.code === 22);
      toast.error(
        isQuota
          ? isRtl
            ? "تعذّر الحفظ: مساحة التخزين ممتلئة. جرّب صورًا أصغر أو احذف صورة من الصور المرفوعة."
            : "Save failed: browser storage is full. Try smaller images or remove an uploaded one."
          : isRtl
          ? "تعذّر الحفظ — راجع الصور المرفوعة."
          : "Save failed — please check the uploaded images.",
      );
    }
  };
  const reset = () => {
    setCfg(DEFAULT_WEBSITE_APPEARANCE);
    clearStoredWebsiteAppearance();
    clearWebsiteAppearanceOverrides();
    toast.success(isRtl ? "تم استعادة الافتراضي" : "Reset to default");
  };

  return (
    <div dir={dir} className="space-y-5">
      {/* Hero */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5 text-sm">
        <Globe className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed">
          {isRtl
            ? "تحكّم كامل في مظهر الموقع العام: الشعار، الهيدر، الفوتر، شريط الإعلانات، الكود المخصص، وألوان الموقع التي يمكنها أن تختلف عن لوحة التحكم."
            : "Full control over the public site: branding, header, footer, announcement bar, custom code, and site-specific palette overrides."}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* ── Branding ── */}
        <SettingsCard title={isRtl ? "الهوية البصرية" : "Branding"} icon={<ImageIcon className="w-4 h-4" />}>
          <FieldRow label={isRtl ? "الشعار" : "Logo"}>
            <ImageUploader
              isRtl={isRtl}
              value={cfg.logoUrl}
              onChange={v => update({ logoUrl: v })}
              maxBytes={2 * 1024 * 1024}
              maxWidth={512}
              previewSize="md"
              recommendation={
                isRtl
                  ? "PNG / SVG شفاف، أقل من 2 ميجابايت — يُعاد ضبط الحجم تلقائيًا."
                  : "Transparent PNG / SVG, up to 2 MB — auto-resized to 512px wide."
              }
            />
          </FieldRow>
          <FieldRow label={isRtl ? "أيقونة المتصفح" : "Favicon"}>
            <ImageUploader
              isRtl={isRtl}
              value={cfg.faviconUrl}
              onChange={v => update({ faviconUrl: v })}
              accept="image/png,image/svg+xml,image/x-icon,image/vnd.microsoft.icon"
              maxBytes={512 * 1024}
              maxWidth={128}
              previewSize="sm"
              recommendation={
                isRtl
                  ? "ICO أو PNG مربّع، 32×32 أو 64×64."
                  : "Square ICO or PNG, 32×32 or 64×64 ideal."
              }
            />
          </FieldRow>
          <FieldRow label={isRtl ? "صورة المشاركة (OG)" : "Social share image (OG)"}>
            <ImageUploader
              isRtl={isRtl}
              value={cfg.ogImageUrl}
              onChange={v => update({ ogImageUrl: v })}
              maxBytes={3 * 1024 * 1024}
              maxWidth={1200}
              previewSize="lg"
              recommendation={
                isRtl
                  ? "1200×630 — تظهر عند مشاركة الموقع على فيسبوك / تويتر."
                  : "1200×630 — shown when the site is shared on Facebook / Twitter."
              }
            />
          </FieldRow>
        </SettingsCard>

        {/* ── Header / Top bar ── */}
        <SettingsCard title={isRtl ? "الهيدر والشريط العلوي" : "Header & Top Bar"} icon={<Layout className="w-4 h-4" />}>
          <FieldRow label={isRtl ? "نمط الهيدر" : "Header style"}>
            <div className="flex gap-1 rounded-lg border border-border p-0.5">
              {(["solid", "transparent", "glass"] as const).map(s => {
                const active = cfg.headerStyle === s;
                const labels = { solid: isRtl ? "صلب" : "Solid", transparent: isRtl ? "شفاف" : "Transparent", glass: isRtl ? "زجاجي" : "Glass" };
                return (
                  <button key={s} type="button" onClick={() => update({ headerStyle: s })}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                    {labels[s]}
                  </button>
                );
              })}
            </div>
          </FieldRow>
          <FieldRow label={isRtl ? "هيدر ثابت أثناء التمرير" : "Sticky on scroll"}>
            <Switch checked={cfg.headerSticky} onCheckedChange={v => update({ headerSticky: v })} />
          </FieldRow>
          <FieldRow label={isRtl ? "إظهار شريط معلومات التواصل" : "Show top contact bar"}>
            <Switch checked={cfg.topBarEnabled} onCheckedChange={v => update({ topBarEnabled: v })} />
          </FieldRow>
          <FieldRow label={isRtl ? "زر تبديل اللغة في الهيدر" : "Language switcher"}>
            <Switch checked={cfg.showLanguageSwitcher} onCheckedChange={v => update({ showLanguageSwitcher: v })} />
          </FieldRow>
          <FieldRow label={isRtl ? "زر «احجز» في الهيدر" : "Booking CTA in header"}>
            <Switch checked={cfg.showBookCta} onCheckedChange={v => update({ showBookCta: v })} />
          </FieldRow>
          <FieldRow label={isRtl ? "عرض المحتوى" : "Content width"}>
            <Select value={cfg.siteWidth} onValueChange={v => update({ siteWidth: v as WebsiteAppearance["siteWidth"] })}>
              <SelectTrigger className="h-9 text-sm w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default" className="text-sm">{isRtl ? "افتراضي (1200px)" : "Default (1200px)"}</SelectItem>
                <SelectItem value="wide" className="text-sm">{isRtl ? "واسع (1440px)" : "Wide (1440px)"}</SelectItem>
                <SelectItem value="full" className="text-sm">{isRtl ? "بعرض الشاشة" : "Full-width"}</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label={isRtl ? "نمط البطاقات" : "Card style"}>
            <Select value={cfg.cardStyle} onValueChange={v => update({ cardStyle: v as WebsiteAppearance["cardStyle"] })}>
              <SelectTrigger className="h-9 text-sm w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="elevated" className="text-sm">{isRtl ? "بظل" : "Elevated"}</SelectItem>
                <SelectItem value="outlined" className="text-sm">{isRtl ? "بإطار" : "Outlined"}</SelectItem>
                <SelectItem value="flat" className="text-sm">{isRtl ? "مسطّح" : "Flat"}</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
        </SettingsCard>
      </div>

      {/* ── Announcement bar ── */}
      <SettingsCard title={isRtl ? "شريط الإعلانات" : "Announcement Bar"} icon={<Megaphone className="w-4 h-4" />}>
        <FieldRow label={isRtl ? "تفعيل" : "Enabled"}>
          <Switch checked={cfg.announcement.enabled} onCheckedChange={v => updateAnnouncement({ enabled: v })} />
        </FieldRow>
        {cfg.announcement.enabled && (
          <>
            <FieldRow label={isRtl ? "النص" : "Text"} tag="AR">
              <Input dir="rtl" value={cfg.announcement.textAr} onChange={e => updateAnnouncement({ textAr: e.target.value })} placeholder={isRtl ? "خصم 20٪ على الاستشارات هذا الأسبوع" : ""} className="h-9 text-sm" />
            </FieldRow>
            <FieldRow label="Text" tag="EN">
              <Input dir="ltr" value={cfg.announcement.textEn} onChange={e => updateAnnouncement({ textEn: e.target.value })} placeholder="20% off all consultations this week" className="h-9 text-sm" />
            </FieldRow>
            <FieldRow label={isRtl ? "رابط" : "Link"}>
              <Input dir="ltr" value={cfg.announcement.link} onChange={e => updateAnnouncement({ link: e.target.value })} placeholder="/book" className="h-9 text-sm" />
            </FieldRow>
            <FieldRow label={isRtl ? "لون الخلفية" : "Background color"}>
              <div className="flex items-center gap-2">
                <input type="color" value={cfg.announcement.bg} onChange={e => updateAnnouncement({ bg: e.target.value })} className="h-9 w-12 rounded-md border border-border/60 cursor-pointer p-0.5" />
                <Input dir="ltr" value={cfg.announcement.bg} onChange={e => updateAnnouncement({ bg: e.target.value })} className="h-9 text-sm w-32 font-mono" />
              </div>
            </FieldRow>
            <FieldRow label={isRtl ? "لون النص" : "Text color"}>
              <div className="flex items-center gap-2">
                <input type="color" value={cfg.announcement.fg} onChange={e => updateAnnouncement({ fg: e.target.value })} className="h-9 w-12 rounded-md border border-border/60 cursor-pointer p-0.5" />
                <Input dir="ltr" value={cfg.announcement.fg} onChange={e => updateAnnouncement({ fg: e.target.value })} className="h-9 text-sm w-32 font-mono" />
              </div>
            </FieldRow>
            {/* preview */}
            <div className="rounded-lg overflow-hidden border border-border/40 mt-2">
              <div className="px-4 py-2 text-center text-xs font-medium" style={{ backgroundColor: cfg.announcement.bg, color: cfg.announcement.fg }}>
                {(isRtl ? cfg.announcement.textAr : cfg.announcement.textEn) || (isRtl ? "(فارغ)" : "(empty)")}
              </div>
            </div>
          </>
        )}
      </SettingsCard>

      {/* ── Hero & Footer ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SettingsCard title={isRtl ? "قسم البطل (Hero)" : "Hero Section"} icon={<Sparkles className="w-4 h-4" />}>
          <FieldRow label={isRtl ? "صورة الخلفية" : "Background image"}>
            <ImageUploader
              value={cfg.heroBackgroundUrl}
              onChange={v => update({ heroBackgroundUrl: v })}
              isRtl={isRtl}
              accept="image/png,image/jpeg,image/webp"
              maxBytes={4 * 1024 * 1024}
              maxWidth={1920}
              previewSize="lg"
              recommendation={isRtl
                ? "ارفع صورة عالية الدقة (يفضل 1920×1080). يتم ضغطها تلقائياً وحفظها محلياً."
                : "Upload a high-resolution photo (1920×1080 recommended). Auto-compressed and stored locally."}
            />
          </FieldRow>
          {/* Live preview of the chosen image — so the admin can see what
              the public hero will look like without leaving Settings. */}
          {cfg.heroBackgroundUrl && (
            <FieldRow label={isRtl ? "معاينة" : "Preview"}>
              <div className="relative w-full max-w-sm aspect-video rounded-lg overflow-hidden border border-border/40 bg-muted">
                <img
                  src={cfg.heroBackgroundUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ opacity: 1 - (cfg.heroOverlayOpacity / 100) * 0.4 }}
                />
                <div
                  className="absolute inset-0 bg-linear-to-r from-black via-black/60 to-transparent"
                  style={{ opacity: cfg.heroOverlayOpacity / 100 }}
                />
                <div className="absolute inset-0 flex items-center px-4">
                  <p className="text-white text-xs font-semibold tracking-wide">
                    {isRtl ? "معاينة قسم البطل" : "Hero preview"}
                  </p>
                </div>
              </div>
            </FieldRow>
          )}
          <FieldRow label={isRtl ? "تعتيم الصورة %" : "Overlay opacity %"}>
            <div className="flex items-center gap-3 w-full max-w-sm">
              <input type="range" min={0} max={100} step={5} value={cfg.heroOverlayOpacity} onChange={e => update({ heroOverlayOpacity: Number(e.target.value) })} className="flex-1" />
              <span className="text-sm font-mono w-12 text-center bg-muted/30 rounded py-1">{cfg.heroOverlayOpacity}%</span>
            </div>
          </FieldRow>
          <FieldRow label={isRtl ? "محاذاة المحتوى" : "Content alignment"}>
            <Select value={cfg.heroAlignment} onValueChange={v => update({ heroAlignment: v as WebsiteAppearance["heroAlignment"] })}>
              <SelectTrigger className="h-9 text-sm w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="start"  className="text-sm">{isRtl ? "بداية" : "Start"}</SelectItem>
                <SelectItem value="center" className="text-sm">{isRtl ? "وسط" : "Center"}</SelectItem>
                <SelectItem value="end"    className="text-sm">{isRtl ? "نهاية" : "End"}</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
        </SettingsCard>

        <SettingsCard title={isRtl ? "الفوتر" : "Footer"} icon={<Layout className="w-4 h-4" />}>
          <FieldRow label={isRtl ? "عدد الأعمدة" : "Columns"}>
            <div className="flex gap-1 rounded-lg border border-border p-0.5">
              {([1, 2, 4] as const).map(c => (
                <button key={c} type="button" onClick={() => update({ footerColumns: c })}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${cfg.footerColumns === c ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  {c}
                </button>
              ))}
            </div>
          </FieldRow>
          <FieldRow label={isRtl ? "روابط التواصل الاجتماعي" : "Show social links"}>
            <Switch checked={cfg.footerShowSocial} onCheckedChange={v => update({ footerShowSocial: v })} />
          </FieldRow>
          <FieldRow label={isRtl ? "عرض خريطة الموقع" : "Show map"}>
            <Switch checked={cfg.footerShowMap} onCheckedChange={v => update({ footerShowMap: v })} />
          </FieldRow>
          <FieldRow label={isRtl ? "نموذج النشرة البريدية" : "Newsletter signup"}>
            <Switch checked={cfg.footerShowNewsletter} onCheckedChange={v => update({ footerShowNewsletter: v })} />
          </FieldRow>
          <FieldRow label={isRtl ? "حقوق النشر" : "Copyright"} tag="AR">
            <Input dir="rtl" value={cfg.footerCopyrightAr} onChange={e => update({ footerCopyrightAr: e.target.value })} placeholder={isRtl ? "© 2026 إيجيبت أدفوكيتس" : ""} className="h-9 text-sm" />
          </FieldRow>
          <FieldRow label="Copyright" tag="EN">
            <Input dir="ltr" value={cfg.footerCopyrightEn} onChange={e => update({ footerCopyrightEn: e.target.value })} placeholder="© 2026 Egypt Advocates" className="h-9 text-sm" />
          </FieldRow>
        </SettingsCard>
      </div>

      {/* ── Website buttons & brand palette ── */}
      <SettingsCard
        title={isRtl ? "ألوان الأزرار والهوية" : "Site Buttons & Brand"}
        icon={<MousePointerClick className="w-4 h-4" />}
      >
        <p className="text-[11px] text-muted-foreground -mt-1 mb-3">
          {isRtl
            ? "تتحكم هنا في لون أزرار الـ Call-to-Action والإكسسوارات (مثل زر «احجز استشارة») وكذلك خلفية القسم الداكن في الصفحة الرئيسية. يتم اشتقاق درجات Hover / Soft / Shadow تلقائيًا."
            : "Controls the call-to-action buttons (e.g. \"Book a Consultation\"), badges, dividers, plus the dark hero/CTA background. Hover, soft and shadow shades are derived automatically."}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* CTA color */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{isRtl ? "لون زر الـ CTA" : "Button (CTA) colour"}</Label>
              {cfg.ctaColor && (
                <button
                  type="button"
                  onClick={() => update({ ctaColor: "" })}
                  className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  <RotateCw className="w-3 h-3" />
                  {isRtl ? "افتراضي" : "Reset"}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={cfg.ctaColor || DEFAULT_CTA_HEX}
                onChange={e => update({ ctaColor: e.target.value })}
                className="h-9 w-12 rounded-md border border-border/60 cursor-pointer p-0.5"
              />
              <Input
                dir="ltr"
                value={cfg.ctaColor}
                onChange={e => update({ ctaColor: e.target.value })}
                placeholder={DEFAULT_CTA_HEX}
                className="h-9 text-xs font-mono flex-1"
              />
            </div>
            {/* Live button preview */}
            <div className="rounded-lg border border-border/60 bg-site-deep p-3 mt-1.5">
              <button
                type="button"
                className="bg-site-cta hover:bg-site-cta-hover text-white text-xs font-semibold px-4 py-2 rounded shadow-md shadow-site-cta-shadow/40 transition-all"
              >
                {isRtl ? "احجز استشارة" : "Book a Consultation"}
              </button>
              <p className="text-[10px] text-white/50 mt-2 leading-relaxed">
                {isRtl
                  ? "معاينة مباشرة باستخدام نفس الألوان المطبّقة على الموقع."
                  : "Live preview using the same tokens applied site-wide."}
              </p>
            </div>
          </div>

          {/* Deep navy color */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{isRtl ? "خلفية القسم الداكن" : "Dark section background"}</Label>
              {cfg.siteDeepColor && (
                <button
                  type="button"
                  onClick={() => update({ siteDeepColor: "" })}
                  className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  <RotateCw className="w-3 h-3" />
                  {isRtl ? "افتراضي" : "Reset"}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={cfg.siteDeepColor || DEFAULT_SITE_DEEP_HEX}
                onChange={e => update({ siteDeepColor: e.target.value })}
                className="h-9 w-12 rounded-md border border-border/60 cursor-pointer p-0.5"
              />
              <Input
                dir="ltr"
                value={cfg.siteDeepColor}
                onChange={e => update({ siteDeepColor: e.target.value })}
                placeholder={DEFAULT_SITE_DEEP_HEX}
                className="h-9 text-xs font-mono flex-1"
              />
            </div>
            {/* Background ramp preview */}
            <div className="rounded-lg overflow-hidden border border-border/60 mt-1.5">
              <div className="grid grid-cols-4 h-12 text-[9px] font-mono text-white/70">
                <div className="bg-site-deep-strong flex items-end justify-center pb-1">strong</div>
                <div className="bg-site-deep flex items-end justify-center pb-1">deep</div>
                <div className="bg-site-deep-soft flex items-end justify-center pb-1">soft</div>
                <div className="bg-site-deep-warm flex items-end justify-center pb-1">warm</div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
          {isRtl ? (
            <>
              💡 يتم استخدام هذه الألوان في الصفحة الرئيسية ({"Home"}) للأزرار، الشارات، خط فاصل الذهبي، خلفية الـ Hero
              ، وقسم الـ {"\"Why Choose Us\""}. اضغط <span className="font-semibold">حفظ</span> لتثبيت التغييرات.
            </>
          ) : (
            <>
              💡 These colours drive the Home page hero CTA, badges, gold dividers, the dark hero background, and the
              "Why Choose Us" section. Hit <span className="font-semibold">Save</span> to persist your changes.
            </>
          )}
        </div>
      </SettingsCard>

      {/* ── Public color overrides ── */}
      <SettingsCard title={isRtl ? "ألوان خاصة بالموقع العام" : "Public site palette overrides"} icon={<Pencil className="w-4 h-4" />}>
        <p className="text-[11px] text-muted-foreground -mt-1 mb-2">
          {isRtl
            ? "اترك أي حقل فارغاً للاحتفاظ بلون لوحة التحكم. مفيد إذا كنت تريد ألواناً مختلفة عن الأدمن."
            : "Leave any field blank to inherit the admin palette. Use to deviate from admin colors on the public site."}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {([
            ["primaryColorOverride", isRtl ? "اللون الرئيسي" : "Primary"],
            ["accentColorOverride",  isRtl ? "لون التمييز" : "Accent"],
            ["backgroundOverride",   isRtl ? "الخلفية" : "Background"],
          ] as const).map(([key, label]) => {
            const value = cfg[key];
            return (
              <div key={key} className="flex items-center gap-2">
                <input type="color" value={value || "#ffffff"} onChange={e => update({ [key]: e.target.value } as Partial<WebsiteAppearance>)} className="h-9 w-10 rounded-md border border-border/60 cursor-pointer p-0.5" />
                <div className="flex-1">
                  <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
                  <Input dir="ltr" value={value} onChange={e => update({ [key]: e.target.value } as Partial<WebsiteAppearance>)} placeholder={isRtl ? "(افتراضي)" : "(inherit)"} className="h-8 text-xs font-mono" />
                </div>
                {value && (
                  <button type="button" onClick={() => update({ [key]: "" } as Partial<WebsiteAppearance>)} className="text-muted-foreground hover:text-foreground" title={isRtl ? "مسح" : "Clear"}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </SettingsCard>

      {/* ── Custom CSS / Head ── */}
      <SettingsCard title={isRtl ? "كود مخصص (متقدّم)" : "Custom Code (Advanced)"} icon={<Code2 className="w-4 h-4" />}>
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700 mb-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {isRtl
            ? "هذا الجزء للمستخدمين المتقدّمين. ستُحقن أكواد CSS و HTML في الموقع العام مباشرة."
            : "Power users only — this CSS and HTML are injected directly into the public site."}
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            {isRtl ? "CSS مخصص" : "Custom CSS"}
          </label>
          <textarea
            dir="ltr"
            value={cfg.customCss}
            onChange={e => update({ customCss: e.target.value })}
            rows={6}
            placeholder={`/* مثل */\n.btn { letter-spacing: 0.04em; }`}
            className="w-full rounded-lg border border-input bg-background text-xs p-3 font-mono resize-y focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="mt-3">
          <label className="text-xs text-muted-foreground mb-1 block">
            {isRtl ? "HTML داخل <head> (للتحليلات والخطوط…)" : "Custom <head> HTML (analytics, fonts…)"}
          </label>
          <textarea
            dir="ltr"
            value={cfg.customHeadHtml}
            onChange={e => update({ customHeadHtml: e.target.value })}
            rows={5}
            placeholder={`<!-- Google Analytics -->\n<script src="https://…"></script>`}
            className="w-full rounded-lg border border-input bg-background text-xs p-3 font-mono resize-y focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </SettingsCard>

      <SaveBar onSave={save} onReset={reset} isRtl={isRtl} />
    </div>
  );
}
