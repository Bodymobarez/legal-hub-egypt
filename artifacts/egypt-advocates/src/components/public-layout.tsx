import { Link } from "wouter";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { useGetSiteInfo } from "@workspace/api-client-react";
import { Globe, Phone, Mail, MapPin, Menu, X } from "lucide-react";
import { useState } from "react";
import ChatWidget from "./chat-widget";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const { language, setLanguage, t, isRtl } = useLanguage();
  const { data: siteInfo } = useGetSiteInfo();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleLanguage = () => {
    setLanguage(language === "ar" ? "en" : "ar");
  };

  const navLinks = [
    { href: "/", label: "nav.home" },
    { href: "/about", label: "nav.about" },
    { href: "/practice-areas", label: "nav.practiceAreas" },
    { href: "/lawyers", label: "nav.lawyers" },
    { href: "/services", label: "nav.services" },
    { href: "/legal-library", label: "nav.legalLibrary" },
    { href: "/blog", label: "nav.blog" },
    { href: "/faqs", label: "nav.faqs" },
    { href: "/contact", label: "nav.contact" },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Top Bar */}
      <div className="bg-primary text-primary-foreground py-2 text-sm">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-4">
            {siteInfo?.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span dir="ltr">{siteInfo.phone}</span>
              </div>
            )}
            {siteInfo?.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>{siteInfo.email}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {siteInfo?.addressAr && (
              <div className="flex items-center gap-2 hidden md:flex">
                <MapPin className="h-4 w-4" />
                <span>{language === "ar" ? siteInfo.addressAr : siteInfo.addressEn}</span>
              </div>
            )}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 hover:text-accent transition-colors"
            >
              <Globe className="h-4 w-4" />
              <span>{language === "ar" ? "English" : "العربية"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.jpeg" alt="Egypt Advocates Logo" className="h-12 w-auto object-contain rounded-sm" />
            <div className="hidden sm:block">
              <h1 className="font-serif font-bold text-xl text-foreground">
                {language === "ar" ? siteInfo?.nameAr || "إيجيبت أدفوكيتس" : siteInfo?.nameEn || "Egypt Advocates"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {language === "ar" ? "محمد عثمان للمحاماة" : "Mohamed A. Osaman Law Firm"}
              </p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium hover:text-accent transition-colors"
              >
                {t(link.label)}
              </Link>
            ))}
            <Link href="/book" className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
              {t("nav.bookConsultation")}
            </Link>
          </nav>

          {/* Mobile Menu Toggle */}
          <button
            className="lg:hidden p-2 text-foreground"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <div className="lg:hidden border-t border-border bg-card">
            <nav className="container mx-auto px-4 py-4 flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-base font-medium hover:text-accent transition-colors block py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t(link.label)}
                </Link>
              ))}
              <Link 
                href="/book" 
                className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 mt-2"
                onClick={() => setIsMenuOpen(false)}
              >
                {t("nav.bookConsultation")}
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-12 mt-auto">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <Link href="/" className="flex items-center gap-3 mb-4">
                <img src="/logo.jpeg" alt="Egypt Advocates Logo" className="h-10 w-auto object-contain rounded-sm" />
                <div>
                  <h2 className="font-serif font-bold text-lg">
                    {language === "ar" ? siteInfo?.nameAr || "إيجيبت أدفوكيتس" : siteInfo?.nameEn || "Egypt Advocates"}
                  </h2>
                </div>
              </Link>
              <p className="text-primary-foreground/80 max-w-md mb-6 leading-relaxed">
                {language === "ar" ? siteInfo?.taglineAr : siteInfo?.taglineEn}
              </p>
            </div>
            
            <div>
              <h3 className="font-serif font-bold text-lg mb-4 text-accent">{t("nav.practiceAreas")}</h3>
              <ul className="space-y-2 text-sm text-primary-foreground/80">
                <li><Link href="/practice-areas" className="hover:text-accent">Corporate Law</Link></li>
                <li><Link href="/practice-areas" className="hover:text-accent">Real Estate</Link></li>
                <li><Link href="/practice-areas" className="hover:text-accent">Litigation</Link></li>
                <li><Link href="/practice-areas" className="hover:text-accent">Family Law</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-serif font-bold text-lg mb-4 text-accent">{t("nav.contact")}</h3>
              <ul className="space-y-3 text-sm text-primary-foreground/80">
                {siteInfo?.addressAr && (
                  <li className="flex gap-2">
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
          
          <div className="border-t border-primary-foreground/20 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-primary-foreground/60">
            <p>&copy; {new Date().getFullYear()} Egypt Advocates. {t("footer.rights")}</p>
          </div>
        </div>
      </footer>

      {/* Floating Chat Widget */}
      <ChatWidget />
    </div>
  );
}
