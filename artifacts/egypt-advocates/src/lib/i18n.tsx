import { createContext, useContext, useEffect, useState } from "react";

type Language = "ar" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, replacements?: Record<string, string>) => string;
  isRtl: boolean;
}

const translations = {
  ar: {
    "nav.home": "الرئيسية",
    "nav.about": "عن المكتب",
    "nav.practiceAreas": "مجالات الممارسة",
    "nav.lawyers": "محامونا",
    "nav.services": "خدماتنا",
    "nav.legalLibrary": "المكتبة القانونية",
    "nav.blog": "المدونة",
    "nav.faqs": "الأسئلة الشائعة",
    "nav.contact": "اتصل بنا",
    "nav.bookConsultation": "احجز استشارة",
    "hero.bookConsultation": "احجز استشارة",
    "hero.ourServices": "خدماتنا",
    "stats.casesHandled": "قضية منجزة",
    "stats.satisfiedClients": "عميل راضٍ",
    "stats.yearsExperience": "سنوات خبرة",
    "stats.successRate": "نسبة النجاح",
    "stats.lawyersCount": "محامٍ متخصص",
    "stats.practiceAreasCount": "مجال ممارسة",
    "footer.rights": "جميع الحقوق محفوظة.",
    "chat.supportOnline": "الفريق متاح الآن",
    "chat.supportOffline": "خارج أوقات العمل",
    "chat.typeMessage": "اكتب رسالتك...",
    "chat.send": "إرسال",
    "chat.start": "ابدأ المحادثة",
    "chat.name": "الاسم الكامل",
    "chat.phone": "رقم الهاتف",
    "chat.email": "البريد الإلكتروني",
    "chat.message": "كيف يمكننا مساعدتك؟",
    "chat.welcome": "مرحباً بك",
    "chat.welcomeSub": "فريقنا القانوني جاهز لمساعدتك. أدخل بياناتك لبدء المحادثة.",
    "chat.privacy": "بياناتك محمية ومشفرة",
    "chat.connecting": "جارٍ الاتصال...",
    "chat.autoReply": "شكراً لتواصلك مع مكتب إيجيبت أدفوكيتس! سيرد عليك أحد مستشارينا القانونيين قريباً. للطوارئ يمكنك الاتصال بنا مباشرة.",
    "chat.autoReplyOffline": "شكراً لتواصلك معنا! مكتبنا مغلق حالياً. سنرد على استفسارك أول أوقات العمل. ساعات العمل: الأحد - الخميس 9 صباحاً - 5 مساءً.",
    "chat.headerTitle": "الدعم القانوني",
    "chat.headerSub": "Egypt Advocates",
    "chat.newChat": "محادثة جديدة",
    "chat.endChat": "إنهاء المحادثة",
    "chat.youLabel": "أنت",
    "chat.teamLabel": "فريق المستشارين",
    "chat.botLabel": "الرد التلقائي",
    "chat.sending": "جارٍ الإرسال...",
    "chat.leadSaved": "تم تسجيل بياناتك. سنتواصل معك قريباً.",
    "contact.name": "الاسم",
    "contact.email": "البريد الإلكتروني",
    "contact.phone": "رقم الهاتف",
    "contact.subject": "الموضوع",
    "contact.message": "الرسالة",
    "contact.send": "إرسال الرسالة",
    "contact.sending": "جاري الإرسال...",
    "contact.success": "تم إرسال رسالتك بنجاح. سنتواصل معك قريباً.",
    "contact.error": "حدث خطأ أثناء إرسال الرسالة. يرجى المحاولة مرة أخرى.",
    "admin.login": "تسجيل الدخول",
    "admin.email": "البريد الإلكتروني",
    "admin.password": "كلمة المرور",
    "admin.loginButton": "دخول",
    "status.pending": "قيد الانتظار",
    "status.approved": "موافق عليه",
    "status.rejected": "مرفوض",
    "status.completed": "مكتمل",
    "status.cancelled": "ملغى",
    "common.readMore": "اقرأ المزيد",
    "common.viewAll": "عرض الكل",
    "common.loading": "جارٍ التحميل...",
    "common.bookNow": "احجز الآن",
    "common.contactUs": "تواصل معنا",
    "common.learnMore": "اعرف المزيد",
    "common.overview": "نظرة عامة",
    "common.viewDetails": "عرض التفاصيل",
    "common.search": "بحث",
    "common.filter": "تصفية",
    "common.all": "الكل",
    "common.minutes": "دقيقة",
    "common.egp": "ج.م",
  },
  en: {
    "nav.home": "Home",
    "nav.about": "About",
    "nav.practiceAreas": "Practice Areas",
    "nav.lawyers": "Lawyers",
    "nav.services": "Services",
    "nav.legalLibrary": "Legal Library",
    "nav.blog": "Blog",
    "nav.faqs": "FAQs",
    "nav.contact": "Contact",
    "nav.bookConsultation": "Book Consultation",
    "hero.bookConsultation": "Book Consultation",
    "hero.ourServices": "Our Services",
    "stats.casesHandled": "Cases Handled",
    "stats.satisfiedClients": "Satisfied Clients",
    "stats.yearsExperience": "Years Experience",
    "stats.successRate": "Success Rate",
    "stats.lawyersCount": "Expert Lawyers",
    "stats.practiceAreasCount": "Practice Areas",
    "footer.rights": "All rights reserved.",
    "chat.supportOnline": "Team Available Now",
    "chat.supportOffline": "Outside Working Hours",
    "chat.typeMessage": "Write your message...",
    "chat.send": "Send",
    "chat.start": "Start Conversation",
    "chat.name": "Full Name",
    "chat.phone": "Phone Number",
    "chat.email": "Email Address",
    "chat.message": "How can we help you?",
    "chat.welcome": "Welcome",
    "chat.welcomeSub": "Our legal team is ready to help. Enter your details to start chatting.",
    "chat.privacy": "Your data is protected & encrypted",
    "chat.connecting": "Connecting...",
    "chat.autoReply": "Thank you for contacting Egypt Advocates! One of our legal consultants will respond shortly. For urgent matters, please call us directly.",
    "chat.autoReplyOffline": "Thank you for reaching out! Our office is currently closed. We will respond to your inquiry at the start of business hours. Hours: Sun–Thu 9am–5pm.",
    "chat.headerTitle": "Legal Support",
    "chat.headerSub": "Egypt Advocates",
    "chat.newChat": "New Chat",
    "chat.endChat": "End Chat",
    "chat.youLabel": "You",
    "chat.teamLabel": "Legal Team",
    "chat.botLabel": "Auto-Reply",
    "chat.sending": "Sending...",
    "chat.leadSaved": "Your details have been saved. We'll be in touch shortly.",
    "contact.name": "Name",
    "contact.email": "Email",
    "contact.phone": "Phone",
    "contact.subject": "Subject",
    "contact.message": "Message",
    "contact.send": "Send Message",
    "contact.sending": "Sending...",
    "contact.success": "Your message has been sent successfully. We will contact you soon.",
    "contact.error": "An error occurred while sending your message. Please try again.",
    "admin.login": "Login",
    "admin.email": "Email",
    "admin.password": "Password",
    "admin.loginButton": "Log In",
    "status.pending": "Pending",
    "status.approved": "Approved",
    "status.rejected": "Rejected",
    "status.completed": "Completed",
    "status.cancelled": "Cancelled",
    "common.readMore": "Read More",
    "common.viewAll": "View All",
    "common.loading": "Loading...",
    "common.bookNow": "Book Now",
    "common.contactUs": "Contact Us",
    "common.learnMore": "Learn More",
    "common.overview": "Overview",
    "common.viewDetails": "View Details",
    "common.search": "Search",
    "common.filter": "Filter",
    "common.all": "All",
    "common.minutes": "min",
    "common.egp": "EGP",
  },
};

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  /* Default to English for first-time visitors. Returning visitors keep
   * whatever they previously selected (persisted in localStorage). We seed
   * the initial state synchronously to avoid an Arabic→English flicker
   * on first paint. */
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === "undefined") return "en";
    try {
      const saved = window.localStorage.getItem("app-language");
      if (saved === "ar" || saved === "en") return saved;
    } catch { /* ignore (private mode, etc.) */ }
    return "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("app-language", lang);
  };

  useEffect(() => {
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string, replacements?: Record<string, string>) => {
    const primary = translations[language] as Record<string, string>;
    const fallback = translations[language === "ar" ? "en" : "ar"] as Record<
      string,
      string
    >;
    let text = primary[key] ?? fallback[key] ?? key;
    
    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        text = text.replace(new RegExp(`{${k}}`, "g"), v);
      });
    }
    
    return text;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        isRtl: language === "ar",
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
