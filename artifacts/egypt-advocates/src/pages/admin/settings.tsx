import { useState } from "react";
import { useGetSiteInfo } from "@workspace/api-client-react";
import { toast } from "sonner";
import {
  Settings, Globe, CalendarClock, Bell, Palette,
  Phone, Mail, MapPin, Building2, Clock, Plus,
  Trash2, CheckCircle2, RotateCcw, Save, Laptop,
  Facebook, Instagram, Youtube, Linkedin, Twitter,
  MonitorSmartphone, Coffee, Wifi, Users2, Timer, Info,
  CreditCard, ShieldCheck, Banknote, Wallet, Link as LinkIcon,
  BadgeCheck, AlertCircle, Eye, EyeOff,
} from "lucide-react";
import { useAdminI18n } from "@/lib/admin-i18n";
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

interface AppearanceConfig {
  theme: "light" | "dark" | "system";
  defaultLang: "ar" | "en";
  primaryColor: string;
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
  addressAr: "الكوثر الجديد - منطقة البنوك - أمام HSBC - أعلى بست واي - الدور الرابع - مكتب 21 - الغردقة",
  addressEn: "Al Kawthar Al Jadid District, Banking Area, in front of HSBC, Above Best Way, 4th Floor, Office 21, Hurghada",
  phone: "+20 100 000 0000",
  whatsapp: "+20 100 000 0000",
  email: "info@egyptadvocates.com",
  established: 2010,
  facebook: "", instagram: "", twitter: "", linkedin: "", youtube: "",
};

const DEFAULT_APPEARANCE: AppearanceConfig = {
  theme: "system",
  defaultLang: "ar",
  primaryColor: "#c9a84c",
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
export default function AdminSettings() {
  const { ta, isRtl } = useAdminI18n();
  const dir = isRtl ? "rtl" : "ltr";

  const [site, setSite]         = useState<SiteOverrides>(() => loadLS("admin_site", DEFAULT_SITE));
  const [avail, setAvail]       = useState<AvailabilityConfig>(() => loadLS("admin_avail", DEFAULT_AVAIL));
  const [appear, setAppear]     = useState<AppearanceConfig>(() => loadLS("admin_appear", DEFAULT_APPEARANCE));
  const [notif, setNotif]       = useState<NotifConfig>(() => loadLS("admin_notif", DEFAULT_NOTIF));

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
  const saveAppear = () => saveLS("admin_appear", appear);
  const saveNotif  = () => saveLS("admin_notif", notif);

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

      <Tabs defaultValue="availability" className="w-full">
        <TabsList className="mb-5 bg-muted/30 border border-border/50 p-1 gap-1 flex-wrap h-auto">
          <TabsTrigger value="availability" className="gap-2 text-xs">
            <CalendarClock className="w-3.5 h-3.5" />
            {isRtl ? "أوقات الحجز" : "Booking Hours"}
          </TabsTrigger>
          <TabsTrigger value="site" className="gap-2 text-xs">
            <Globe className="w-3.5 h-3.5" />
            {isRtl ? "معلومات المكتب" : "Office Info"}
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2 text-xs">
            <Palette className="w-3.5 h-3.5" />
            {isRtl ? "المظهر" : "Appearance"}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2 text-xs">
            <Bell className="w-3.5 h-3.5" />
            {isRtl ? "الإشعارات" : "Notifications"}
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2 text-xs">
            <CreditCard className="w-3.5 h-3.5" />
            {isRtl ? "أنظمة الدفع" : "Payment Systems"}
          </TabsTrigger>
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

        {/* ══ TAB: APPEARANCE ══ */}
        <TabsContent value="appearance" className="mt-0 space-y-4">
          <div className="max-w-xl space-y-4">
            <SettingsCard title={isRtl ? "المظهر والألوان" : "Theme & Colors"} icon={<Palette className="w-4 h-4" />}>
              <FieldRow label={isRtl ? "المظهر" : "Theme"}>
                <Select value={appear.theme} onValueChange={v => setAppear(p => ({ ...p, theme: v as any }))}>
                  <SelectTrigger className="h-9 text-sm w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light" className="text-sm">
                      <span className="flex items-center gap-2"><Laptop className="w-3.5 h-3.5" />{isRtl ? "فاتح" : "Light"}</span>
                    </SelectItem>
                    <SelectItem value="dark" className="text-sm">
                      <span className="flex items-center gap-2"><MonitorSmartphone className="w-3.5 h-3.5" />{isRtl ? "داكن" : "Dark"}</span>
                    </SelectItem>
                    <SelectItem value="system" className="text-sm">
                      <span className="flex items-center gap-2"><Settings className="w-3.5 h-3.5" />{isRtl ? "تلقائي" : "System"}</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label={isRtl ? "اللون الرئيسي" : "Primary Color"}>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={appear.primaryColor}
                    onChange={e => setAppear(p => ({ ...p, primaryColor: e.target.value }))}
                    className="h-9 w-12 rounded-md border border-border/60 cursor-pointer bg-transparent p-0.5"
                  />
                  <Input
                    dir="ltr"
                    value={appear.primaryColor}
                    onChange={e => setAppear(p => ({ ...p, primaryColor: e.target.value }))}
                    className="h-9 text-sm w-32 font-mono"
                    placeholder="#c9a84c"
                  />
                  <div className="w-8 h-8 rounded-lg border border-border/60" style={{ backgroundColor: appear.primaryColor }} />
                </div>
              </FieldRow>
              <FieldRow label={isRtl ? "اللغة الافتراضية" : "Default Language"}>
                <Select value={appear.defaultLang} onValueChange={v => setAppear(p => ({ ...p, defaultLang: v as any }))}>
                  <SelectTrigger className="h-9 text-sm w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar" className="text-sm">العربية</SelectItem>
                    <SelectItem value="en" className="text-sm">English</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
            </SettingsCard>
            <SaveBar onSave={saveAppear} onReset={() => { setAppear(DEFAULT_APPEARANCE); saveLS("admin_appear", DEFAULT_APPEARANCE); }} isRtl={isRtl} />
          </div>
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

        {/* ══ TAB: PAYMENT SYSTEMS ══ */}
        <TabsContent value="payments" className="mt-0">
          <PaymentSystemsTab isRtl={isRtl} />
        </TabsContent>
      </Tabs>
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
