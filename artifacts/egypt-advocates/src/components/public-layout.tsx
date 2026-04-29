import { Link, useLocation } from "wouter";
import { useLanguage } from "@/lib/i18n";
import { useGetSiteInfo } from "@workspace/api-client-react";
import {
  Globe, Phone, Mail, MapPin,
  Home, Scale, Users, CalendarDays, Phone as PhoneIcon,
  BookOpen, Newspaper, HelpCircle, Info, LayoutGrid,
  X, ChevronRight,
} from "lucide-react";
import { useState } from "react";
import ChatWidget from "./chat-widget";

/* ─── nav link definitions ─── */
const NAV_LINKS = [
  { href: "/",               labelKey: "nav.home",          icon: Home },
  { href: "/about",          labelKey: "nav.about",         icon: Info },
  { href: "/practice-areas", labelKey: "nav.practiceAreas", icon: Scale },
  { href: "/lawyers",        labelKey: "nav.lawyers",       icon: Users },
  { href: "/services",       labelKey: "nav.services",      icon: LayoutGrid },
  { href: "/legal-library",  labelKey: "nav.legalLibrary",  icon: BookOpen },
  { href: "/blog",           labelKey: "nav.blog",          icon: Newspaper },
  { href: "/faqs",           labelKey: "nav.faqs",          icon: HelpCircle },
  { href: "/contact",        labelKey: "nav.contact",       icon: PhoneIcon },
];

/* Bottom-nav items (mobile) — dedicated short labels to fit the tab bar */
const BOTTOM_TABS = [
  { href: "/",               labelAr: "الرئيسية",  labelEn: "Home",       icon: Home },
  { href: "/practice-areas", labelAr: "ممارسة",    labelEn: "Practice",   icon: Scale },
  { href: "/lawyers",        labelAr: "محامونا",   labelEn: "Lawyers",    icon: Users },
  { href: "/book",           labelAr: "احجز",      labelEn: "Book",       icon: CalendarDays },
  { href: "/contact",        labelAr: "تواصل",     labelEn: "Contact",    icon: PhoneIcon },
];

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const { language, setLanguage, t, isRtl } = useLanguage();
  const { data: siteInfo } = useGetSiteInfo();
  const [location] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const dir = isRtl ? "rtl" : "ltr";

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  return (
    <div dir={dir} className="min-h-dvh flex flex-col bg-background">

      {/* ══ TOP INFO BAR (hidden on mobile) ══ */}
      <div className="hidden sm:block bg-primary text-primary-foreground py-2 text-xs">
        <div className="container mx-auto px-4 flex justify-between items-center gap-4">
          <div className="flex items-center gap-5">
            {siteInfo?.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 opacity-70" />
                <span dir="ltr">{siteInfo.phone}</span>
              </div>
            )}
            {siteInfo?.email && (
              <div className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 opacity-70" />
                <span>{siteInfo.email}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {siteInfo?.addressAr && (
              <div className="hidden md:flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 opacity-70" />
                <span>{language === "ar" ? siteInfo.addressAr : siteInfo.addressEn}</span>
              </div>
            )}
            <button
              onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
              className="flex items-center gap-1 hover:text-accent transition-colors"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>{language === "ar" ? "English" : "العربية"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ══ HEADER ══ */}
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-card/90 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-4 h-16 sm:h-20 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <img
              src="/logo.jpeg"
              alt="Egypt Advocates"
              className="h-10 sm:h-12 w-auto object-contain rounded-sm"
            />
            <div className="hidden sm:block">
              <h1 className="font-serif font-bold text-lg sm:text-xl text-foreground leading-tight">
                {language === "ar" ? siteInfo?.nameAr || "إيجيبت أدفوكيتس" : siteInfo?.nameEn || "Egypt Advocates"}
              </h1>
              <p className="text-[10px] text-muted-foreground">
                {language === "ar" ? "محمد عثمان للمحاماة" : "Mohamed A. Osaman Law Firm"}
              </p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-5 xl:gap-6">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? "text-primary font-semibold"
                    : "text-foreground/70 hover:text-foreground"
                }`}
              >
                {t(link.labelKey)}
              </Link>
            ))}
            <Link
              href="/book"
              className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center"
            >
              {t("nav.bookConsultation")}
            </Link>
          </nav>

          {/* Mobile right controls */}
          <div className="flex lg:hidden items-center gap-2">
            {/* Language toggle */}
            <button
              onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-full border border-border text-foreground/70 hover:text-foreground transition-colors"
            >
              <Globe className="h-3.5 w-3.5" />
              {language === "ar" ? "EN" : "ع"}
            </button>
            {/* Book CTA on mobile header */}
            <Link
              href="/book"
              className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors flex items-center"
            >
              {isRtl ? "احجز" : "Book"}
            </Link>
            {/* All links drawer toggle */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-foreground/70 hover:text-foreground transition-colors"
              aria-label="Menu"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ══ MOBILE FULL-MENU DRAWER ══ */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Panel — slides from the start edge */}
          <div
            dir={dir}
            className={`relative w-[280px] max-w-[85vw] h-full bg-card flex flex-col shadow-2xl ${
              isRtl ? "ms-auto" : "me-auto"
            }`}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
              <div className="flex items-center gap-2">
                <img src="/logo.jpeg" alt="" className="h-8 w-auto rounded-sm" />
                <span className="font-serif font-bold text-foreground text-sm">
                  {language === "ar" ? "القائمة" : "Menu"}
                </span>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Drawer links */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
              {NAV_LINKS.map(link => {
                const Icon = link.icon;
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/70 hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
                    {t(link.labelKey)}
                    {active && <ChevronRight className={`w-3.5 h-3.5 ms-auto opacity-60 ${isRtl ? "rotate-180" : ""}`} />}
                  </Link>
                );
              })}
            </nav>

            {/* Drawer book CTA */}
            <div className="p-4 border-t border-border/60">
              <Link
                href="/book"
                onClick={() => setDrawerOpen(false)}
                className="flex h-11 w-full items-center justify-center rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors gap-2"
              >
                <CalendarDays className="h-4 w-4" />
                {t("nav.bookConsultation")}
              </Link>
              {/* Language in drawer */}
              <button
                onClick={() => { setLanguage(language === "ar" ? "en" : "ar"); setDrawerOpen(false); }}
                className="flex w-full items-center justify-center gap-2 mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                <Globe className="h-3.5 w-3.5" />
                {language === "ar" ? "Switch to English" : "التبديل للعربية"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MAIN CONTENT ══ */}
      {/* pb-20 on mobile to avoid bottom-nav overlap */}
      <main className="flex-1 flex flex-col pb-20 lg:pb-0">
        {children}
      </main>

      {/* ══ FOOTER ══ */}
      <footer className="bg-primary text-primary-foreground pt-12 pb-8 mt-auto hidden sm:block">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <Link href="/" className="flex items-center gap-3 mb-4">
                <img src="/logo.jpeg" alt="" className="h-10 w-auto rounded-sm" />
                <h2 className="font-serif font-bold text-lg">
                  {language === "ar" ? siteInfo?.nameAr || "إيجيبت أدفوكيتس" : siteInfo?.nameEn || "Egypt Advocates"}
                </h2>
              </Link>
              <p className="text-primary-foreground/80 max-w-md mb-4 leading-relaxed text-sm">
                {language === "ar" ? siteInfo?.taglineAr : siteInfo?.taglineEn}
              </p>
            </div>

            {/* Practice areas */}
            <div>
              <h3 className="font-serif font-bold text-base mb-4 text-accent">{t("nav.practiceAreas")}</h3>
              <ul className="space-y-2 text-sm text-primary-foreground/80">
                {["Corporate Law", "Real Estate", "Litigation", "Family Law"].map(a => (
                  <li key={a}><Link href="/practice-areas" className="hover:text-accent transition-colors">{a}</Link></li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="font-serif font-bold text-base mb-4 text-accent">{t("nav.contact")}</h3>
              <ul className="space-y-3 text-sm text-primary-foreground/80">
                {siteInfo?.addressAr && (
                  <li className="flex gap-2 items-start">
                    <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-accent" />
                    <span>{language === "ar" ? siteInfo.addressAr : siteInfo.addressEn}</span>
                  </li>
                )}
                {siteInfo?.phone && (
                  <li className="flex gap-2 items-center">
                    <Phone className="h-4 w-4 shrink-0 text-accent" />
                    <span dir="ltr">{siteInfo.phone}</span>
                  </li>
                )}
                {siteInfo?.email && (
                  <li className="flex gap-2 items-center">
                    <Mail className="h-4 w-4 shrink-0 text-accent" />
                    <span>{siteInfo.email}</span>
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="border-t border-primary-foreground/20 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-primary-foreground/60">
            <p>&copy; {new Date().getFullYear()} Egypt Advocates. {t("footer.rights")}</p>
          </div>
        </div>
      </footer>

      {/* Mobile mini footer */}
      <footer className="sm:hidden bg-primary py-4 text-center text-[10px] text-primary-foreground/60 mb-16">
        &copy; {new Date().getFullYear()} Egypt Advocates. {t("footer.rights")}
      </footer>

      {/* ══ MOBILE BOTTOM TAB BAR ══ */}
      <nav
        dir={dir}
        className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-card/98 backdrop-blur-xl border-t border-border/50 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-stretch h-[62px]">
          {BOTTOM_TABS.map(tab => {
            const Icon = tab.icon;
            const active = isActive(tab.href);
            const label = isRtl ? tab.labelAr : tab.labelEn;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex-1 flex flex-col items-center justify-center gap-[5px] transition-all relative select-none ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {/* Active indicator pill at top */}
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full bg-primary" />
                )}
                {/* Icon with active bg pill */}
                <span className={`flex items-center justify-center w-8 h-7 rounded-xl transition-all ${
                  active ? "bg-primary/12" : ""
                }`}>
                  <Icon className={`w-[18px] h-[18px] transition-all ${active ? "scale-110" : ""}`} />
                </span>
                {/* Label */}
                <span className={`text-[10px] leading-none font-medium transition-all ${
                  active ? "text-primary font-semibold" : "text-muted-foreground"
                }`}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Chat widget — offset above bottom nav on mobile */}
      <div className="lg:contents">
        <ChatWidget />
      </div>
    </div>
  );
}
