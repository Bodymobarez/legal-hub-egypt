/**
 * Admin email composition + dispatch.
 *
 * Renders the subject/body templates the admin saved in the
 * Settings → Email tab (localStorage key: `admin_email`),
 * substitutes appointment + office variables, and opens the
 * default mail client with everything pre-filled.
 *
 * This works without any backend SMTP wiring: the email is
 * composed client-side and handed off via `mailto:`. When the
 * admin (or the user's mail client) hits "Send", the message
 * goes out and the admin gets a copy in their Sent folder
 * (and, if `bccAdmin` is on, also as a BCC).
 */

export type EmailEncryption = "none" | "ssl" | "tls" | "starttls";
export type EmailProvider = "smtp" | "sendgrid" | "mailgun" | "resend" | "ses" | "gmail";

export type EmailTemplateKey =
  | "welcome"
  | "appointmentReceived"
  | "appointmentApproved"
  | "appointmentRejected"
  | "appointmentReminder"
  | "appointmentRescheduled"
  | "appointmentCancelled"
  | "appointmentCompleted"
  | "paymentReceipt"
  | "inquiryReply";

export interface EmailTemplate {
  enabled: boolean;
  subjectAr: string;
  subjectEn: string;
  bodyAr: string;
  bodyEn: string;
}

export interface EmailConfig {
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

export interface SiteOverrides {
  nameAr: string;
  nameEn: string;
  addressAr: string;
  addressEn: string;
  phone: string;
  whatsapp: string;
  email: string;
}

/* ─────────────────────────────────────────────────────────────
   Defaults — kept in sync with the Settings page so the helper
   never crashes if a user opens it before saving anything.
   ───────────────────────────────────────────────────────────── */

const DEFAULT_TEMPLATE = (subjectAr: string, subjectEn: string, bodyAr: string, bodyEn: string): EmailTemplate => ({
  enabled: true,
  subjectAr,
  subjectEn,
  bodyAr,
  bodyEn,
});

export const DEFAULT_TEMPLATES: Record<EmailTemplateKey, EmailTemplate> = {
  welcome: DEFAULT_TEMPLATE(
    "مرحباً بك في {{officeName}}",
    "Welcome to {{officeName}}",
    "مرحباً {{clientName}},\n\nنرحب بك في {{officeName}}. فريقنا القانوني جاهز لخدمتك.\n\nمع التحية،\n{{officeName}}",
    "Hello {{clientName}},\n\nWelcome to {{officeName}}. Our legal team is ready to assist you.\n\nBest regards,\n{{officeName}}",
  ),
  appointmentReceived: DEFAULT_TEMPLATE(
    "استلمنا طلب حجزك — {{appointmentDate}}",
    "We received your booking — {{appointmentDate}}",
    "مرحباً {{clientName}},\n\nشكراً لحجزك. تم استلام الطلب التالي وهو قيد المراجعة:\n\n• الخدمة: {{serviceName}}\n• التاريخ: {{appointmentDate}}\n• الوقت: {{appointmentTime}}\n\nسنتواصل معك قريباً للتأكيد.\n\n{{officeName}}",
    "Hello {{clientName}},\n\nThank you for booking. We received the following request and it's under review:\n\n• Service: {{serviceName}}\n• Date: {{appointmentDate}}\n• Time: {{appointmentTime}}\n\nWe'll contact you shortly to confirm.\n\n{{officeName}}",
  ),
  appointmentApproved: DEFAULT_TEMPLATE(
    "تأكيد موعدك — {{appointmentDate}}",
    "Your appointment is confirmed — {{appointmentDate}}",
    "مرحباً {{clientName}},\n\nيسرنا تأكيد موعدك:\n\n• الخدمة: {{serviceName}}\n• المحامي: {{lawyerName}}\n• التاريخ: {{appointmentDate}} الساعة {{appointmentTime}}\n• العنوان: {{officeAddress}}\n• رابط الاجتماع: {{meetingLink}}\n\nنرجو الحضور قبل الموعد بعشر دقائق.\n\n{{officeName}}",
    "Hello {{clientName}},\n\nWe're pleased to confirm your appointment:\n\n• Service: {{serviceName}}\n• Lawyer: {{lawyerName}}\n• Date: {{appointmentDate}} at {{appointmentTime}}\n• Address: {{officeAddress}}\n• Meeting link: {{meetingLink}}\n\nKindly arrive 10 minutes early.\n\n{{officeName}}",
  ),
  appointmentRejected: DEFAULT_TEMPLATE(
    "اعتذار عن موعدك — {{appointmentDate}}",
    "Unable to confirm your appointment — {{appointmentDate}}",
    "مرحباً {{clientName}},\n\nنأسف لإبلاغك بأننا غير قادرين على تأكيد الموعد المطلوب في {{appointmentDate}} الساعة {{appointmentTime}}.\n\nالسبب: {{rejectionReason}}\n\nيمكنك حجز موعد بديل أو التواصل معنا على {{officePhone}}.\n\n{{officeName}}",
    "Hello {{clientName}},\n\nWe regret to inform you that we are unable to confirm your appointment on {{appointmentDate}} at {{appointmentTime}}.\n\nReason: {{rejectionReason}}\n\nPlease book an alternative slot or contact us at {{officePhone}}.\n\n{{officeName}}",
  ),
  appointmentReminder: DEFAULT_TEMPLATE(
    "تذكير: موعدك غداً — {{appointmentTime}}",
    "Reminder: your appointment tomorrow at {{appointmentTime}}",
    "مرحباً {{clientName}},\n\nتذكير بموعدك غداً:\n\n• الخدمة: {{serviceName}}\n• المحامي: {{lawyerName}}\n• الوقت: {{appointmentTime}}\n• العنوان: {{officeAddress}}\n\n{{officeName}}",
    "Hello {{clientName}},\n\nReminder of your appointment tomorrow:\n\n• Service: {{serviceName}}\n• Lawyer: {{lawyerName}}\n• Time: {{appointmentTime}}\n• Address: {{officeAddress}}\n\n{{officeName}}",
  ),
  appointmentRescheduled: DEFAULT_TEMPLATE(
    "تحديث موعدك — {{appointmentDate}} {{appointmentTime}}",
    "Your appointment has been rescheduled — {{appointmentDate}} {{appointmentTime}}",
    "مرحباً {{clientName}},\n\nنُحيطك علماً بأنه تم تحديث موعدك ليصبح:\n\n• الخدمة: {{serviceName}}\n• التاريخ الجديد: {{appointmentDate}}\n• الوقت الجديد: {{appointmentTime}}\n• المحامي: {{lawyerName}}\n• العنوان: {{officeAddress}}\n• رابط الاجتماع: {{meetingLink}}\n\nفي حال وجود أي استفسار، يُرجى التواصل معنا على {{officePhone}}.\n\n{{officeName}}",
    "Hello {{clientName}},\n\nThis is to let you know that your appointment has been rescheduled:\n\n• Service: {{serviceName}}\n• New date: {{appointmentDate}}\n• New time: {{appointmentTime}}\n• Lawyer: {{lawyerName}}\n• Address: {{officeAddress}}\n• Meeting link: {{meetingLink}}\n\nIf you have any questions, please reach us on {{officePhone}}.\n\n{{officeName}}",
  ),
  appointmentCancelled: DEFAULT_TEMPLATE(
    "إلغاء موعدك — {{appointmentDate}}",
    "Your appointment has been cancelled — {{appointmentDate}}",
    "مرحباً {{clientName}},\n\nتم إلغاء موعدك المُجدوَل في {{appointmentDate}} الساعة {{appointmentTime}}.\n\nيمكنك حجز موعد جديد أو التواصل معنا على {{officePhone}}.\n\n{{officeName}}",
    "Hello {{clientName}},\n\nYour appointment scheduled for {{appointmentDate}} at {{appointmentTime}} has been cancelled.\n\nYou can book a new slot or contact us at {{officePhone}}.\n\n{{officeName}}",
  ),
  appointmentCompleted: DEFAULT_TEMPLATE(
    "شكراً لزيارتك — {{officeName}}",
    "Thank you for your visit — {{officeName}}",
    "مرحباً {{clientName}},\n\nشكراً لزيارتك اليوم. نأمل أن تكون استشارتك مع {{lawyerName}} قد لبّت احتياجاتك.\n\nسعدنا بخدمتك ونتطلع للتواصل معك مجدداً.\n\n{{officeName}}",
    "Hello {{clientName}},\n\nThank you for visiting us today. We hope your consultation with {{lawyerName}} addressed your needs.\n\nIt was our pleasure to serve you and we look forward to hearing from you again.\n\n{{officeName}}",
  ),
  paymentReceipt: DEFAULT_TEMPLATE(
    "إيصال دفع — {{amount}} ج.م",
    "Payment receipt — {{amount}} EGP",
    "مرحباً {{clientName}},\n\nاستلمنا دفعتك بنجاح:\n\n• المبلغ: {{amount}} ج.م\n• طريقة الدفع: {{paymentMethod}}\n• الخدمة: {{serviceName}}\n\nشكراً لتعاملك مع {{officeName}}.",
    "Hello {{clientName}},\n\nWe successfully received your payment:\n\n• Amount: {{amount}} EGP\n• Method: {{paymentMethod}}\n• Service: {{serviceName}}\n\nThank you for choosing {{officeName}}.",
  ),
  inquiryReply: DEFAULT_TEMPLATE(
    "استلمنا استفسارك — {{officeName}}",
    "We received your inquiry — {{officeName}}",
    "مرحباً {{clientName}},\n\nشكراً لتواصلك. سيرد عليك أحد مستشارينا القانونيين خلال 24 ساعة عمل.\n\n{{officeName}}",
    "Hello {{clientName}},\n\nThank you for contacting us. One of our legal consultants will respond within 24 working hours.\n\n{{officeName}}",
  ),
};

const DEFAULT_EMAIL: EmailConfig = {
  enabled: true,
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

const DEFAULT_SITE: SiteOverrides = {
  nameAr: "مكتب إيجيبت أدفوكيتس للمحاماة",
  nameEn: "Egypt Advocates Law Firm",
  addressAr: "الكوثر الجديد - منطقة البنوك - أمام HSBC - أعلى بست واي - الدور الرابع - مكتب ٢١ - الغردقة",
  addressEn: "Al Kawthar Al Jadid District / Banking Area / In front of HSBC / Above Best Way / 4th Floor / Office No. 21 - Hurghada",
  phone: "+20 100 000 0000",
  whatsapp: "+20 100 000 0000",
  email: "info@egyptadvocates.com",
};

/* ─────────────────────────────────────────────────────────────
   localStorage loaders
   ───────────────────────────────────────────────────────────── */

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadEmailConfig(): EmailConfig {
  const stored = readJson<Partial<EmailConfig>>("admin_email", {});
  return {
    ...DEFAULT_EMAIL,
    ...stored,
    smtp: { ...DEFAULT_EMAIL.smtp, ...(stored.smtp ?? {}) },
    templates: {
      ...DEFAULT_TEMPLATES,
      ...(stored.templates ?? {}),
    } as Record<EmailTemplateKey, EmailTemplate>,
  };
}

export function loadSiteOverrides(): SiteOverrides {
  const stored = readJson<Partial<SiteOverrides>>("admin_site", {});
  return { ...DEFAULT_SITE, ...stored };
}

export function loadAlertEmail(): string {
  const notif = readJson<{ alertEmail?: string }>("admin_notif", {});
  return (notif.alertEmail ?? "").trim();
}

/* ─────────────────────────────────────────────────────────────
   Variable substitution
   ───────────────────────────────────────────────────────────── */

export interface AppointmentLike {
  id: number | string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string | null;
  scheduledAt: string | Date;
  serviceNameAr?: string | null;
  serviceNameEn?: string | null;
  lawyerNameAr?: string | null;
  lawyerNameEn?: string | null;
  meetingLink?: string | null;
  paymentMethod?: string | null;
  amountEgp?: number | string | null;
  notes?: string | null;
  language?: "ar" | "en" | string | null;
  mode?: string | null;
}

interface RenderOptions {
  rejectionReason?: string;
  forceLang?: "ar" | "en";
}

function pickLang(appt: AppointmentLike, opts?: RenderOptions): "ar" | "en" {
  if (opts?.forceLang) return opts.forceLang;
  return appt.language === "en" ? "en" : "ar";
}

function formatDate(input: string | Date, lang: "ar" | "en"): string {
  try {
    const d = typeof input === "string" ? new Date(input) : input;
    return d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return String(input);
  }
}

function formatTime(input: string | Date, lang: "ar" | "en"): string {
  try {
    const d = typeof input === "string" ? new Date(input) : input;
    return d.toLocaleTimeString(lang === "ar" ? "ar-EG" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return String(input);
  }
}

function buildVars(
  appt: AppointmentLike,
  site: SiteOverrides,
  lang: "ar" | "en",
  extra: Record<string, string | undefined> = {},
): Record<string, string> {
  const serviceName = (lang === "ar" ? appt.serviceNameAr : appt.serviceNameEn) ?? "";
  const lawyerName = (lang === "ar" ? appt.lawyerNameAr : appt.lawyerNameEn) ?? (lang === "ar" ? "—" : "—");
  const officeName = lang === "ar" ? site.nameAr : site.nameEn;
  const officeAddress = lang === "ar" ? site.addressAr : site.addressEn;

  return {
    clientName: appt.clientName ?? "",
    clientEmail: appt.clientEmail ?? "",
    clientPhone: appt.clientPhone ?? "",
    appointmentDate: formatDate(appt.scheduledAt, lang),
    appointmentTime: formatTime(appt.scheduledAt, lang),
    lawyerName,
    serviceName,
    meetingLink: appt.meetingLink ?? (lang === "ar" ? "—" : "—"),
    officeName,
    officePhone: site.phone ?? "",
    officeAddress,
    amount: appt.amountEgp ? String(appt.amountEgp) : "0",
    paymentMethod: appt.paymentMethod ?? (lang === "ar" ? "—" : "—"),
    rejectionReason: extra.rejectionReason ?? (lang === "ar" ? "ظروف غير متوقعة" : "unforeseen circumstances"),
  };
}

function substitute(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : `{{${key}}}`;
  });
}

/* ─────────────────────────────────────────────────────────────
   Public API: render & dispatch
   ───────────────────────────────────────────────────────────── */

export interface RenderedEmail {
  to: string;
  bcc?: string;
  subject: string;
  body: string;
  lang: "ar" | "en";
}

export function renderTemplate(
  templateKey: EmailTemplateKey,
  appt: AppointmentLike,
  options: RenderOptions = {},
): RenderedEmail | null {
  const cfg = loadEmailConfig();
  const tpl = cfg.templates[templateKey];
  if (!tpl) return null;

  const site = loadSiteOverrides();
  const lang = pickLang(appt, options);
  const vars = buildVars(appt, site, lang, { rejectionReason: options.rejectionReason });

  const signature = lang === "ar" ? cfg.signatureAr : cfg.signatureEn;
  const subjectRaw = lang === "ar" ? tpl.subjectAr : tpl.subjectEn;
  const bodyRaw = lang === "ar" ? tpl.bodyAr : tpl.bodyEn;

  const subject = substitute(subjectRaw, vars).trim();
  const body = `${substitute(bodyRaw, vars).trim()}\n\n${substitute(signature, vars).trim()}`;

  const bcc = cfg.bccAdmin ? loadAlertEmail() : "";

  return {
    to: appt.clientEmail,
    bcc: bcc || undefined,
    subject,
    body,
    lang,
  };
}

export function buildMailtoUrl(rendered: RenderedEmail): string {
  const params = new URLSearchParams();
  params.set("subject", rendered.subject);
  params.set("body", rendered.body);
  if (rendered.bcc) params.set("bcc", rendered.bcc);
  return `mailto:${encodeURIComponent(rendered.to)}?${params
    .toString()
    .replace(/\+/g, "%20")}`;
}

export type EmailDispatchResult =
  | { ok: true; reason?: never; rendered: RenderedEmail }
  | { ok: false; reason: "disabled" | "no-recipient" | "no-template"; rendered?: RenderedEmail };

/**
 * Open the user's default mail client with the rendered template
 * fully pre-filled (recipient, subject, body, BCC). Returns the
 * outcome so the caller can show a toast.
 */
export function dispatchEmail(
  templateKey: EmailTemplateKey,
  appt: AppointmentLike,
  options: RenderOptions = {},
): EmailDispatchResult {
  const cfg = loadEmailConfig();
  if (!cfg.enabled) return { ok: false, reason: "disabled" };
  if (!appt.clientEmail) return { ok: false, reason: "no-recipient" };

  const rendered = renderTemplate(templateKey, appt, options);
  if (!rendered) return { ok: false, reason: "no-template" };

  if (typeof window !== "undefined") {
    const url = buildMailtoUrl(rendered);
    /**
     * `window.open(url, "_self")` is the most reliable cross-browser
     * way to launch the user's default mail client without showing
     * a popup-blocker prompt or losing the current page.
     */
    window.open(url, "_self");
  }

  return { ok: true, rendered };
}

/* ─────────────────────────────────────────────────────────────
   Helper: pick the right template for a status transition.
   ───────────────────────────────────────────────────────────── */

export function templateForStatus(
  status: "pending" | "approved" | "rejected" | "completed" | "cancelled",
): EmailTemplateKey | null {
  switch (status) {
    case "approved":
      return "appointmentApproved";
    case "rejected":
      return "appointmentRejected";
    case "completed":
      return "appointmentCompleted";
    case "cancelled":
      return "appointmentCancelled";
    case "pending":
      return "appointmentReceived";
    default:
      return null;
  }
}
