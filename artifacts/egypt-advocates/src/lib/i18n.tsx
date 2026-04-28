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
    "chat.supportOnline": "الدعم متصل",
    "chat.supportOffline": "الدعم غير متصل",
    "chat.typeMessage": "اكتب رسالة...",
    "chat.send": "إرسال",
    "chat.start": "ابدأ المحادثة",
    "chat.name": "الاسم",
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
    "chat.supportOnline": "Support Online",
    "chat.supportOffline": "Support Offline",
    "chat.typeMessage": "Type a message...",
    "chat.send": "Send",
    "chat.start": "Start Chat",
    "chat.name": "Name",
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
  const [language, setLanguageState] = useState<Language>("ar");

  useEffect(() => {
    const saved = localStorage.getItem("app-language") as Language;
    if (saved === "ar" || saved === "en") {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("app-language", lang);
  };

  useEffect(() => {
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string, replacements?: Record<string, string>) => {
    const dict = translations[language] as Record<string, string>;
    let text = dict[key] || key;
    
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
