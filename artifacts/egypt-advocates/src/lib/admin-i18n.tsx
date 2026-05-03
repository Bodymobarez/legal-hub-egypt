import { createContext, useContext, useEffect, useState } from "react";

type Lang = "ar" | "en";

interface AdminI18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  ta: (key: string) => string;
  isRtl: boolean;
}

const AdminI18nContext = createContext<AdminI18nCtx | null>(null);

const T: Record<Lang, Record<string, string>> = {
  ar: {
    /* ── layout ── */
    "nav.dashboard":       "لوحة التحكم",
    "nav.clients":         "العملاء",
    "nav.cases":           "القضايا",
    "nav.appointments":    "المواعيد",
    "nav.invoices":        "الفواتير",
    "nav.payments":        "المدفوعات",
    "nav.chat":            "الدردشة",
    "nav.inquiries":       "الاستفسارات",
    "nav.services":        "الخدمات",
    "nav.lawyers":         "المحامون",
    "nav.legalLibrary":    "المكتبة القانونية",
    "nav.blogPosts":       "المقالات",
    "nav.settings":        "الإعدادات",
    "nav.adminPortal":     "بوابة الإدارة",
    "nav.logout":          "تسجيل الخروج",

    /* ── login ── */
    "login.title":         "Egypt Advocates",
    "login.subtitle":      "دخول بوابة الإدارة",
    "login.email":         "البريد الإلكتروني",
    "login.password":      "كلمة المرور",
    "login.submit":        "تسجيل الدخول",
    "login.submitting":    "جارٍ التحقق...",
    "login.successTitle":  "أهلاً بعودتك",
    "login.successDesc":   "تم تسجيل دخولك بنجاح.",
    "login.errorTitle":    "فشل تسجيل الدخول",
    "login.errorDesc":     "يرجى التحقق من بياناتك وإعادة المحاولة.",
    "login.emailError":    "بريد إلكتروني غير صالح",
    "login.passwordError": "كلمة المرور مطلوبة",

    /* ── dashboard ── */
    "dash.title":          "لوحة التحكم",
    "dash.subtitle":       "نظرة عامة على نشاط المكتب وأدائه",
    "dash.totalClients":   "إجمالي العملاء",
    "dash.openCases":      "القضايا المفتوحة",
    "dash.pendingAppts":   "المواعيد المعلقة",
    "dash.openChats":      "المحادثات المفتوحة",
    "dash.unpaidInvoices": "فواتير غير مسددة",
    "dash.newInquiries":   "استفسارات جديدة",
    "dash.revenueChart":   "مقارنة الإيرادات",
    "dash.revenueDesc":    "هذا الشهر مقابل الشهر الماضي (ج.م)",
    "dash.apptByStatus":   "المواعيد حسب الحالة",
    "dash.recentActivity": "النشاط الأخير",
    "dash.revenueByMethod":"الإيرادات حسب طريقة الدفع",
    "dash.noActivity":     "لا يوجد نشاط حديث",
    "dash.lastMonth":      "الشهر الماضي",
    "dash.thisMonth":      "هذا الشهر",
    "dash.loading":        "جارٍ تحميل البيانات...",

    /* ── common actions ── */
    "act.add":             "إضافة",
    "act.edit":            "تعديل",
    "act.delete":          "حذف",
    "act.view":            "عرض",
    "act.save":            "حفظ",
    "act.saving":          "جارٍ الحفظ...",
    "act.cancel":          "إلغاء",
    "act.search":          "بحث...",
    "act.filter":          "تصفية",
    "act.actions":         "إجراءات",
    "act.confirm":         "تأكيد",
    "act.approve":         "قبول",
    "act.reject":          "رفض",
    "act.complete":        "إتمام",
    "act.markPaid":        "تحديد كمدفوع",
    "act.reply":           "رد",
    "act.close":           "إغلاق",
    "act.noData":          "لا توجد بيانات",
    "act.loading":         "جارٍ التحميل...",
    "act.all":             "الكل",

    /* ── statuses ── */
    "status.pending":      "معلق",
    "status.approved":     "مقبول",
    "status.rejected":     "مرفوض",
    "status.completed":    "مكتمل",
    "status.cancelled":    "ملغى",
    "status.active":       "نشط",
    "status.inactive":     "غير نشط",
    "status.paid":         "مدفوع",
    "status.unpaid":       "غير مدفوع",
    "status.open":         "مفتوح",
    "status.closed":       "مغلق",
    "status.new":          "جديد",
    "status.lead":         "عميل محتمل",
    "status.prospect":     "متابع",

    /* ── clients ── */
    "clients.title":       "العملاء",
    "clients.add":         "إضافة عميل",
    "clients.name":        "الاسم",
    "clients.email":       "البريد الإلكتروني",
    "clients.phone":       "الهاتف",
    "clients.status":      "الحالة",
    "clients.joined":      "تاريخ الانضمام",
    "clients.cases":       "القضايا",
    "clients.notes":       "ملاحظات",
    "clients.address":     "العنوان",
    "clients.idNumber":    "رقم الهوية",
    "clients.type":        "نوع العميل",
    "clients.individual":  "فرد",
    "clients.company":     "شركة",

    /* ── cases ── */
    "cases.title":         "القضايا",
    "cases.add":           "إضافة قضية",
    "cases.number":        "رقم القضية",
    "cases.title_":        "عنوان القضية",
    "cases.client":        "العميل",
    "cases.type":          "النوع",
    "cases.court":         "المحكمة",
    "cases.status":        "الحالة",
    "cases.opened":        "تاريخ الفتح",
    "cases.description":   "الوصف",
    "cases.notes":         "ملاحظات",

    /* ── appointments ── */
    "appts.title":         "المواعيد",
    "appts.client":        "العميل",
    "appts.service":       "الخدمة",
    "appts.date":          "التاريخ",
    "appts.time":          "الوقت",
    "appts.mode":          "طريقة الحضور",
    "appts.online":        "عبر الإنترنت",
    "appts.inOffice":      "في المكتب",
    "appts.status":        "الحالة",
    "appts.payment":       "طريقة الدفع",
    "appts.notes":         "ملاحظات",
    "appts.filter":        "تصفية حسب الحالة",

    /* ── invoices ── */
    "inv.title":           "الفواتير",
    "inv.add":             "إنشاء فاتورة",
    "inv.number":          "رقم الفاتورة",
    "inv.client":          "العميل",
    "inv.amount":          "المبلغ",
    "inv.status":          "الحالة",
    "inv.issued":          "تاريخ الإصدار",
    "inv.due":             "تاريخ الاستحقاق",
    "inv.paid":            "مدفوع",
    "inv.unpaid":          "غير مدفوع",

    /* ── payments ── */
    "pay.title":           "المدفوعات",
    "pay.client":          "العميل",
    "pay.invoice":         "رقم الفاتورة",
    "pay.amount":          "المبلغ",
    "pay.method":          "طريقة الدفع",
    "pay.status":          "الحالة",
    "pay.date":            "التاريخ",
    "pay.confirm":         "تأكيد الدفع",
    "pay.reference":       "المرجع",
    "pay.pending":         "معلق",
    "pay.confirmed":       "مؤكد",

    /* ── chat ── */
    "chat.title":          "الدردشة",
    "chat.threads":        "المحادثات",
    "chat.selectThread":   "اختر محادثة",
    "chat.reply":          "رد",
    "chat.close":          "إغلاق المحادثة",
    "chat.clientName":     "اسم العميل",
    "chat.status":         "الحالة",
    "chat.lastMessage":    "آخر رسالة",
    "chat.send":           "إرسال",
    "chat.typeReply":      "اكتب ردك...",
    "chat.noThreads":      "لا توجد محادثات",

    /* ── inquiries ── */
    "inq.title":           "الاستفسارات",
    "inq.name":            "الاسم",
    "inq.email":           "البريد",
    "inq.phone":           "الهاتف",
    "inq.subject":         "الموضوع",
    "inq.message":         "الرسالة",
    "inq.date":            "التاريخ",
    "inq.status":          "الحالة",

    /* ── services ── */
    "svc.title":           "الخدمات",
    "svc.add":             "إضافة خدمة",
    "svc.nameAr":          "الاسم (عربي)",
    "svc.nameEn":          "الاسم (إنجليزي)",
    "svc.descAr":          "الوصف (عربي)",
    "svc.descEn":          "الوصف (إنجليزي)",
    "svc.price":           "السعر (ج.م)",
    "svc.duration":        "المدة (دقيقة)",
    "svc.mode":            "طريقة التقديم",
    "svc.practiceArea":    "مجال الممارسة",

    /* ── lawyers ── */
    "law.title":           "المحامون",
    "law.add":             "إضافة محامٍ",
    "law.nameAr":          "الاسم (عربي)",
    "law.nameEn":          "الاسم (إنجليزي)",
    "law.titleAr":         "اللقب (عربي)",
    "law.titleEn":         "اللقب (إنجليزي)",
    "law.email":           "البريد الإلكتروني",
    "law.phone":           "الهاتف",
    "law.experience":      "سنوات الخبرة",
    "law.specializations": "التخصصات",

    /* ── legal articles ── */
    "art.title":           "المكتبة القانونية",
    "art.add":             "إضافة مقال",
    "art.titleAr":         "العنوان (عربي)",
    "art.titleEn":         "العنوان (إنجليزي)",
    "art.category":        "التصنيف",
    "art.author":          "الكاتب",
    "art.published":       "تاريخ النشر",
    "art.status":          "الحالة",

    /* ── blog posts ── */
    "blog.title":          "المقالات",
    "blog.add":            "إضافة مقال",
    "blog.titleAr":        "العنوان (عربي)",
    "blog.titleEn":        "العنوان (إنجليزي)",
    "blog.author":         "الكاتب",
    "blog.published":      "تاريخ النشر",
    "blog.status":         "الحالة",
  },

  en: {
    /* ── layout ── */
    "nav.dashboard":       "Dashboard",
    "nav.clients":         "Clients",
    "nav.cases":           "Cases",
    "nav.appointments":    "Appointments",
    "nav.invoices":        "Invoices",
    "nav.payments":        "Payments",
    "nav.chat":            "Chat Support",
    "nav.inquiries":       "Contact Inquiries",
    "nav.services":        "Services",
    "nav.lawyers":         "Lawyers",
    "nav.legalLibrary":    "Legal Library",
    "nav.blogPosts":       "Blog Posts",
    "nav.settings":        "Settings",
    "nav.adminPortal":     "Admin Portal",
    "nav.logout":          "Log Out",

    /* ── login ── */
    "login.title":         "Egypt Advocates",
    "login.subtitle":      "Admin Portal Access",
    "login.email":         "Email",
    "login.password":      "Password",
    "login.submit":        "Sign In",
    "login.submitting":    "Authenticating...",
    "login.successTitle":  "Welcome back",
    "login.successDesc":   "You have successfully logged in.",
    "login.errorTitle":    "Login failed",
    "login.errorDesc":     "Please check your credentials and try again.",
    "login.emailError":    "Invalid email address",
    "login.passwordError": "Password is required",

    /* ── dashboard ── */
    "dash.title":          "Dashboard",
    "dash.subtitle":       "Overview of firm activity and performance",
    "dash.totalClients":   "Total Clients",
    "dash.openCases":      "Open Cases",
    "dash.pendingAppts":   "Pending Appointments",
    "dash.openChats":      "Open Chats",
    "dash.unpaidInvoices": "Unpaid Invoices",
    "dash.newInquiries":   "New Inquiries",
    "dash.revenueChart":   "Revenue Comparison",
    "dash.revenueDesc":    "This month vs last month (EGP)",
    "dash.apptByStatus":   "Appointments by Status",
    "dash.recentActivity": "Recent Activity",
    "dash.revenueByMethod":"Revenue by Method",
    "dash.noActivity":     "No recent activity",
    "dash.lastMonth":      "Last Month",
    "dash.thisMonth":      "This Month",
    "dash.loading":        "Loading dashboard...",

    /* ── common ── */
    "act.add":             "Add",
    "act.edit":            "Edit",
    "act.delete":          "Delete",
    "act.view":            "View",
    "act.save":            "Save",
    "act.saving":          "Saving...",
    "act.cancel":          "Cancel",
    "act.search":          "Search...",
    "act.filter":          "Filter",
    "act.actions":         "Actions",
    "act.confirm":         "Confirm",
    "act.approve":         "Approve",
    "act.reject":          "Reject",
    "act.complete":        "Complete",
    "act.markPaid":        "Mark Paid",
    "act.reply":           "Reply",
    "act.close":           "Close",
    "act.noData":          "No data found",
    "act.loading":         "Loading...",
    "act.all":             "All",

    /* ── statuses ── */
    "status.pending":      "Pending",
    "status.approved":     "Approved",
    "status.rejected":     "Rejected",
    "status.completed":    "Completed",
    "status.cancelled":    "Cancelled",
    "status.active":       "Active",
    "status.inactive":     "Inactive",
    "status.paid":         "Paid",
    "status.unpaid":       "Unpaid",
    "status.open":         "Open",
    "status.closed":       "Closed",
    "status.new":          "New",
    "status.lead":         "Lead",
    "status.prospect":     "Prospect",

    /* ── clients ── */
    "clients.title":       "Clients",
    "clients.add":         "Add Client",
    "clients.name":        "Name",
    "clients.email":       "Email",
    "clients.phone":       "Phone",
    "clients.status":      "Status",
    "clients.joined":      "Joined",
    "clients.cases":       "Cases",
    "clients.notes":       "Notes",
    "clients.address":     "Address",
    "clients.idNumber":    "ID Number",
    "clients.type":        "Type",
    "clients.individual":  "Individual",
    "clients.company":     "Company",

    /* ── cases ── */
    "cases.title":         "Cases",
    "cases.add":           "Add Case",
    "cases.number":        "Case #",
    "cases.title_":        "Title",
    "cases.client":        "Client",
    "cases.type":          "Type",
    "cases.court":         "Court",
    "cases.status":        "Status",
    "cases.opened":        "Opened",
    "cases.description":   "Description",
    "cases.notes":         "Notes",

    /* ── appointments ── */
    "appts.title":         "Appointments",
    "appts.client":        "Client",
    "appts.service":       "Service",
    "appts.date":          "Date",
    "appts.time":          "Time",
    "appts.mode":          "Mode",
    "appts.online":        "Online",
    "appts.inOffice":      "In Office",
    "appts.status":        "Status",
    "appts.payment":       "Payment Method",
    "appts.notes":         "Notes",
    "appts.filter":        "Filter by status",

    /* ── invoices ── */
    "inv.title":           "Invoices",
    "inv.add":             "Create Invoice",
    "inv.number":          "Invoice #",
    "inv.client":          "Client",
    "inv.amount":          "Amount",
    "inv.status":          "Status",
    "inv.issued":          "Issued",
    "inv.due":             "Due",
    "inv.paid":            "Paid",
    "inv.unpaid":          "Unpaid",

    /* ── payments ── */
    "pay.title":           "Payments",
    "pay.client":          "Client",
    "pay.invoice":         "Invoice #",
    "pay.amount":          "Amount",
    "pay.method":          "Method",
    "pay.status":          "Status",
    "pay.date":            "Date",
    "pay.confirm":         "Confirm Payment",
    "pay.reference":       "Reference",
    "pay.pending":         "Pending",
    "pay.confirmed":       "Confirmed",

    /* ── chat ── */
    "chat.title":          "Chat Support",
    "chat.threads":        "Conversations",
    "chat.selectThread":   "Select a conversation",
    "chat.reply":          "Reply",
    "chat.close":          "Close Thread",
    "chat.clientName":     "Client",
    "chat.status":         "Status",
    "chat.lastMessage":    "Last Message",
    "chat.send":           "Send",
    "chat.typeReply":      "Type your reply...",
    "chat.noThreads":      "No conversations",

    /* ── inquiries ── */
    "inq.title":           "Contact Inquiries",
    "inq.name":            "Name",
    "inq.email":           "Email",
    "inq.phone":           "Phone",
    "inq.subject":         "Subject",
    "inq.message":         "Message",
    "inq.date":            "Date",
    "inq.status":          "Status",

    /* ── services ── */
    "svc.title":           "Services",
    "svc.add":             "Add Service",
    "svc.nameAr":          "Name (Arabic)",
    "svc.nameEn":          "Name (English)",
    "svc.descAr":          "Description (Arabic)",
    "svc.descEn":          "Description (English)",
    "svc.price":           "Price (EGP)",
    "svc.duration":        "Duration (min)",
    "svc.mode":            "Delivery Mode",
    "svc.practiceArea":    "Practice Area",

    /* ── lawyers ── */
    "law.title":           "Lawyers",
    "law.add":             "Add Lawyer",
    "law.nameAr":          "Name (Arabic)",
    "law.nameEn":          "Name (English)",
    "law.titleAr":         "Title (Arabic)",
    "law.titleEn":         "Title (English)",
    "law.email":           "Email",
    "law.phone":           "Phone",
    "law.experience":      "Years of Experience",
    "law.specializations": "Specializations",

    /* ── legal articles ── */
    "art.title":           "Legal Library",
    "art.add":             "Add Article",
    "art.titleAr":         "Title (Arabic)",
    "art.titleEn":         "Title (English)",
    "art.category":        "Category",
    "art.author":          "Author",
    "art.published":       "Published",
    "art.status":          "Status",

    /* ── blog posts ── */
    "blog.title":          "Blog Posts",
    "blog.add":            "Add Post",
    "blog.titleAr":        "Title (Arabic)",
    "blog.titleEn":        "Title (English)",
    "blog.author":         "Author",
    "blog.published":      "Published",
    "blog.status":         "Status",
  },
};

export function AdminI18nProvider({ children }: { children: React.ReactNode }) {
  /* Default the admin & super-admin panels to English for first-time users.
   * Existing operators keep whatever they previously selected. */
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    try {
      const saved = window.localStorage.getItem("admin-language");
      if (saved === "ar" || saved === "en") return saved;
    } catch { /* ignore */ }
    return "en";
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("admin-language", l);
  };

  const ta = (key: string) => T[lang][key] ?? key;

  useEffect(() => {
    // Admin panel stays LTR for table layouts regardless of language
    // direction handled per-element
  }, [lang]);

  return (
    <AdminI18nContext.Provider value={{ lang, setLang, ta, isRtl: lang === "ar" }}>
      {children}
    </AdminI18nContext.Provider>
  );
}

export function useAdminI18n() {
  const ctx = useContext(AdminI18nContext);
  if (!ctx) throw new Error("useAdminI18n must be used within AdminI18nProvider");
  return ctx;
}
