import { useLanguage } from "@/lib/i18n";
import { SITE_DEFAULTS } from "@/lib/site-defaults";
import { useWebsiteAppearance } from "@/lib/website-appearance";
import { Link } from "wouter";
import {
  useGetSiteInfo,
  useGetSiteStats,
  useListPracticeAreas,
  useListLawyers,
  useListTestimonials,
  useListBlogPosts,
  useGetWorkHoursStatus,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Fragment, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Scale,
  Shield,
  Users,
  Briefcase,
  Star,
  CheckCircle2,
  Award,
  TrendingUp,
  Globe,
  Quote,
} from "lucide-react";
import {
  usePageEditorConfig,
  getSectionOverride,
  getPaddingClasses,
  isSectionEnabled,
  type HomeSectionId,
} from "@/lib/page-editor";

/* ─────────────────── scroll-reveal hook ─────────────────── */
function useReveal(rootMargin = "-60px") {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("visible"); obs.disconnect(); } },
      { rootMargin }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [rootMargin]);
  return ref;
}

/* ─────────────────── animated counter ─────────────────── */
function AnimatedCounter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      obs.disconnect();
      let v = 0;
      const step = Math.max(1, Math.ceil(to / 60));
      const t = setInterval(() => {
        v = Math.min(v + step, to);
        setCount(v);
        if (v >= to) clearInterval(t);
      }, 24);
    }, { rootMargin: "-40px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [to]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* ─────────────────── FadeIn wrapper ─────────────────── */
function FadeIn({
  children, delay = 0, dir = "up", className = "",
}: {
  children: React.ReactNode; delay?: number; dir?: "up" | "left" | "right"; className?: string;
}) {
  const ref = useReveal();
  const cls = dir === "left" ? "reveal-left" : dir === "right" ? "reveal-right" : "reveal";
  return (
    <div
      ref={ref}
      className={`${cls} ${className}`}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Page
═══════════════════════════════════════════════════════ */
export default function Home() {
  const { language, isRtl } = useLanguage();
  const { data: _siteInfo }     = useGetSiteInfo();
  const siteInfo = { ...SITE_DEFAULTS, ..._siteInfo };
  const { data: stats }         = useGetSiteStats();
  const { data: practiceAreas } = useListPracticeAreas();
  const { data: lawyers }       = useListLawyers();
  const { data: testimonials }  = useListTestimonials();
  const { data: blogPosts }     = useListBlogPosts();
  const { data: workHours }     = useGetWorkHoursStatus();
  const websiteAppearance       = useWebsiteAppearance();

  /* Page editor config — controls visibility, ordering, and per-section
     text/CTA overrides. Lives in the Super Admin panel under Page Editor. */
  const editorCfg = usePageEditorConfig();

  /* Hero background image — admin-configurable via Settings → Website Look →
     Hero Section. Falls back to the default scales art if nothing uploaded. */
  const heroBgUrl = websiteAppearance.heroBackgroundUrl || "/images/hero-scales.png";
  /* Slider 0-100 in admin → 0-1 opacity for the dark gradient overlays. */
  const heroOverlay = Math.max(0, Math.min(100, websiteAppearance.heroOverlayOpacity)) / 100;

  const Arrow = isRtl ? ArrowLeft : ArrowRight;
  const ar    = language === "ar";

  // Hero headline entrance
  const heroRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = setTimeout(() => heroRef.current?.classList.add("visible"), 80);
    return () => clearTimeout(t);
  }, []);
  const heroBarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = setTimeout(() => heroBarRef.current?.classList.add("visible"), 500);
    return () => clearTimeout(t);
  }, []);

  const practiceIcons: Record<string, React.ElementType> = {
    "corporate-commercial": Briefcase,
    "civil-litigation":     Scale,
    "criminal-defense":     Shield,
    "family-personal-status": Users,
    "real-estate":          Globe,
    "labor-employment":     TrendingUp,
    default:                Scale,
  };

  /* ──────────────────────────────────────────────
     Override helpers — keep call sites short.
     ────────────────────────────────────────────── */
  const ovr = (id: HomeSectionId) => getSectionOverride(editorCfg, id);
  /** Pick the override-or-default text for a given language. */
  const txt = (id: HomeSectionId, key: "eyebrow" | "title" | "subtitle" | "ctaLabel" | "cta2Label" | "ctaHref" | "cta2Href", fallbackAr: string, fallbackEn: string): string => {
    const o = ovr(id) as Record<string, string | undefined>;
    if (key === "ctaHref" || key === "cta2Href") {
      return o[key] ?? fallbackEn; // hrefs are language-agnostic
    }
    const arKey = `${key}Ar`;
    const enKey = `${key}En`;
    return ar ? (o[arKey] ?? fallbackAr) : (o[enKey] ?? fallbackEn);
  };
  /** Build the className for a section root, replacing the built-in py-*
   *  utilities with the override's padding preset when one is provided,
   *  and appending the override's extra class string. */
  const sectionClass = (id: HomeSectionId, base: string): string => {
    const o = ovr(id);
    const padding = getPaddingClasses(o.paddingY, "");
    const cleanedBase = padding
      ? base
          .replace(/\bpy-[^\s]+/g, "")
          .replace(/\bmd:py-[^\s]+/g, "")
          .replace(/\s+/g, " ")
          .trim()
      : base;
    return [cleanedBase, padding, o.extraClassName].filter(Boolean).join(" ");
  };

  /* ──────────────────────────────────────────────
     Section blueprints — each entry is the JSX for one home page
     section. They're rendered later in the order specified by the
     Super Admin's page-editor config.
     ────────────────────────────────────────────── */

  const heroSection = (
    <section className={sectionClass("hero", "relative min-h-[92vh] flex items-center overflow-hidden bg-site-deep")}>
      {/* Background layers — image source + dark gradient overlay opacity
          are both controlled from the admin (Website Look → Hero).
          The hero supports both DARK and LIGHT background photos: the side
          gradient keeps the headline area readable regardless of how light
          the photograph is, while the photo itself is shown at full
          opacity so the right-hand subject (e.g. scales/gavel) stays
          crisp and luminous. */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroBgUrl}
          alt=""
          className="w-full h-full object-cover object-center"
        />
        <div
          className="absolute inset-0 bg-linear-to-r from-site-deep-strong via-site-deep/70 to-transparent rtl:bg-linear-to-l"
          style={{ opacity: heroOverlay }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-site-deep-strong/60 to-transparent"
          style={{ opacity: heroOverlay * 0.5 }}
        />
      </div>

      <div className="absolute top-0 inset-e-0 w-px h-full bg-linear-to-b from-transparent via-site-cta/40 to-transparent hidden lg:block" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-linear-to-r from-transparent via-site-cta/50 to-transparent" />

      <div className="container relative z-10 px-6 mx-auto max-w-7xl">
        <div ref={heroRef} className="reveal max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-site-cta/15 border border-site-cta/30 text-site-cta rounded-full px-4 py-1.5 text-sm font-medium mb-6 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-site-cta pulse-dot" />
            {txt("hero", "eyebrow", "مكتب محاماة مصري رائد منذ ٢٠٠٨", "Egypt's Premier Law Firm Since 2008")}
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-serif font-bold text-white leading-[1.08] mb-6">
            {(() => {
              const o = ovr("hero");
              const overrideTitle = ar ? o.titleAr : o.titleEn;
              if (overrideTitle) {
                return <span className="block">{overrideTitle}</span>;
              }
              return ar ? (
                <>
                  <span className="block">{siteInfo?.nameAr ?? "مكتب مصر"}</span>
                  <span className="block text-site-cta">للمحاماة</span>
                </>
              ) : (
                <>
                  <span className="block">Egypt</span>
                  <span className="block text-site-cta">Advocates</span>
                </>
              );
            })()}
          </h1>

          <div
            ref={heroBarRef}
            className="hero-bar h-0.5 w-24 bg-linear-to-b from-site-cta to-transparent mb-6"
            style={{ transformOrigin: isRtl ? "right" : "left" }}
          />

          <p className="text-lg md:text-xl text-white/70 mb-10 max-w-xl leading-relaxed">
            {txt(
              "hero",
              "subtitle",
              siteInfo?.taglineAr ?? "حلول قانونية قابلة للتنفيذ — نلتزم بتقديم دعم قانوني يسند إلى تحليل استراتيجي عميق وحلول تنفيذية دقيقة.",
              siteInfo?.taglineEn ?? "Actionable Legal Solutions — strategic analysis and precise execution for every case, urgent or long-term.",
            )}
          </p>

          <div className="flex flex-wrap gap-4">
            <Button
              asChild size="lg"
              className="bg-site-cta hover:bg-site-cta-hover text-white font-semibold px-8 py-6 text-base shadow-lg shadow-site-cta-shadow/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
            >
              <Link href={txt("hero", "ctaHref", "/book", "/book")}>
                {txt("hero", "ctaLabel", "احجز استشارة", "Book a Consultation")}
                <Arrow className="w-4 h-4 ms-2" />
              </Link>
            </Button>
            <Button
              asChild size="lg" variant="outline"
              className="border-white/20 text-white bg-white/5 hover:bg-white/10 backdrop-blur-sm px-8 py-6 text-base"
            >
              <Link href={txt("hero", "cta2Href", "/practice-areas", "/practice-areas")}>
                {txt("hero", "cta2Label", "مجالات الممارسة", "Practice Areas")}
              </Link>
            </Button>
          </div>

          {workHours && (
            <div className="inline-flex items-center gap-2 mt-8 text-sm text-white/50">
              <span className={`w-2 h-2 rounded-full ${workHours.isOpen ? "bg-emerald-400 pulse-dot" : "bg-red-400"}`} />
              {workHours.isOpen
                ? (ar ? "المكتب مفتوح الآن" : "Office Open Now")
                : (ar ? "المكتب مغلق حاليًا" : "Office Currently Closed")}
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/30">
        <span className="text-xs tracking-widest uppercase">{ar ? "تمرير" : "Scroll"}</span>
        <div className="scroll-bounce w-px h-8 bg-linear-to-b from-white/30 to-transparent" />
      </div>
    </section>
  );

  const statsSection = (
    <section className={sectionClass("stats", "py-16 bg-site-deep-warm border-y border-white/5 relative overflow-hidden")}>
      <div className="absolute inset-0 opacity-5 bg-[repeating-linear-gradient(90deg,hsl(var(--site-cta))_0,hsl(var(--site-cta))_1px,transparent_0,transparent_50%)] bg-size-[60px_60px]" />
      <div className="container px-6 mx-auto max-w-7xl relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {[
            { value: stats?.casesHandled ?? 1500, suffix: "+", labelAr: "قضية منجزة", labelEn: "Cases Handled", Icon: Scale },
            { value: stats?.satisfiedClients ?? 1200, suffix: "+", labelAr: "عميل راضٍ", labelEn: "Satisfied Clients", Icon: Users },
            { value: stats?.yearsOfExperience ?? 18, suffix: "+", labelAr: "سنوات خبرة", labelEn: "Years Experience", Icon: Award },
            { value: stats?.successRate ?? 96, suffix: "%", labelAr: "نسبة النجاح", labelEn: "Success Rate", Icon: TrendingUp },
          ].map((s, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div className="flex flex-col items-center text-center group">
                <div className="w-12 h-12 rounded-xl bg-site-cta/10 border border-site-cta/20 flex items-center justify-center mb-4 group-hover:bg-site-cta/20 transition-colors">
                  <s.Icon className="w-5 h-5 text-site-cta-soft" />
                </div>
                <div className="text-4xl md:text-5xl font-serif font-bold text-white mb-1">
                  <AnimatedCounter to={s.value} suffix={s.suffix} />
                </div>
                <div className="text-site-cta-soft text-sm font-medium tracking-wide">
                  {ar ? s.labelAr : s.labelEn}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );

  const practiceAreasSection = (
    <section className={sectionClass("practice-areas", "py-24 bg-background relative overflow-hidden")}>
      <div className="absolute inset-e-0 top-0 w-1/3 h-full bg-linear-to-l from-site-cta/3 to-transparent pointer-events-none" />
      <div className="container px-6 mx-auto max-w-7xl">
        <FadeIn className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-site-cta text-sm font-semibold tracking-widest uppercase mb-3 block">
            {txt("practice-areas", "eyebrow", "خبرتنا القانونية", "Our Expertise")}
          </span>
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">
            {txt("practice-areas", "title", "مجالات الممارسة", "Practice Areas")}
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            {txt(
              "practice-areas",
              "subtitle",
              "تغطية قانونية شاملة في جميع المجالات التخصصية بأعلى معايير الاحترافية.",
              "Comprehensive legal coverage across all specialties to the highest professional standards.",
            )}
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {(practiceAreas?.slice(0, 9) ?? []).map((area, i) => {
            const Icon = practiceIcons[area.slug] ?? practiceIcons.default;
            return (
              <FadeIn key={area.id} delay={Math.floor(i / 3) * 0.1 + (i % 3) * 0.07}>
                <Link href={`/practice-areas/${area.slug}`} className="group block h-full">
                  <div className="relative h-full bg-card border border-border p-7 rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-site-cta/10 hover:-translate-y-1 hover:border-site-cta/30">
                    <div className="absolute inset-0 bg-linear-to-br from-site-cta/0 to-transparent group-hover:from-site-cta/5 transition-all duration-500 rounded-2xl" />
                    <div className="relative z-10">
                      <div className="w-14 h-14 rounded-2xl bg-primary/5 border border-border flex items-center justify-center mb-5 group-hover:bg-site-cta group-hover:border-site-cta transition-all duration-300">
                        <Icon className="w-6 h-6 text-primary group-hover:text-white transition-colors duration-300" />
                      </div>
                      <h3 className="text-xl font-bold font-serif mb-3 text-foreground group-hover:text-site-cta-text transition-colors">
                        {ar ? area.nameAr : area.nameEn}
                      </h3>
                      <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
                        {ar ? area.descriptionAr : area.descriptionEn}
                      </p>
                      <div className="mt-5 flex items-center text-site-cta font-semibold text-sm gap-1 group-hover:gap-2 transition-all">
                        {ar ? "اعرف المزيد" : "Learn More"} <Arrow className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              </FadeIn>
            );
          })}
        </div>

        <FadeIn className="text-center mt-12">
          <Button asChild variant="outline" size="lg" className="border-border hover:border-site-cta hover:text-site-cta transition-colors px-10">
            <Link href={txt("practice-areas", "ctaHref", "/practice-areas", "/practice-areas")}>
              {txt("practice-areas", "ctaLabel", "عرض جميع المجالات", "View All Practice Areas")}
            </Link>
          </Button>
        </FadeIn>
      </div>
    </section>
  );

  const whyUsSection = (
    <section className={sectionClass("why-us", "py-24 bg-site-deep-soft relative overflow-hidden")}>
      <div className="absolute inset-s-0 top-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-site-cta/5 blur-3xl pointer-events-none" />
      <div className="container px-6 mx-auto max-w-7xl relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <FadeIn dir={isRtl ? "right" : "left"}>
            <span className="text-site-cta-soft text-sm font-semibold tracking-widest uppercase mb-3 block">
              {txt("why-us", "eyebrow", "لماذا تختارنا", "Why Choose Us")}
            </span>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mb-6 leading-tight">
              {txt(
                "why-us",
                "title",
                "التزام لا يتزعزع بالتميز القانوني",
                "Unwavering Commitment to Legal Excellence",
              )}
            </h2>
            <p className="text-white/60 text-lg leading-relaxed mb-8">
              {txt(
                "why-us",
                "subtitle",
                "منذ عام ٢٠٠٨، نحمل راية العدالة بأمانة واحترافية، ونقف إلى جانب كل موكل بكل ما نملك من خبرة وتفانٍ.",
                "Since 2008, we carry the banner of justice with integrity and professionalism, standing beside every client with the full weight of our expertise.",
              )}
            </p>
            <div className="space-y-4 mb-10">
              {[
                { ar: "محامون أمام محكمة النقض",          en: "Attorneys before the Court of Cassation" },
                { ar: "سرية تامة وحماية المعلومات",        en: "Full confidentiality & data protection" },
                { ar: "إرشاد مستمر على مدار الساعة",       en: "Round-the-clock client guidance" },
                { ar: "تغطية قانونية شاملة في مصر",        en: "Nationwide legal coverage across Egypt" },
                { ar: "فريق متعدد التخصصات تحت سقف واحد", en: "Multi-disciplinary team under one roof" },
              ].map((item, i) => (
                <FadeIn key={i} delay={i * 0.08}>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-site-cta-soft shrink-0" />
                    <span className="text-white/80">{ar ? item.ar : item.en}</span>
                  </div>
                </FadeIn>
              ))}
            </div>
            <div className="flex gap-4 flex-wrap">
              <Button asChild size="lg" className="bg-site-cta hover:bg-site-cta-hover text-white px-8">
                <Link href={txt("why-us", "ctaHref", "/about", "/about")}>
                  {txt("why-us", "ctaLabel", "عن المكتب", "About Us")}
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="text-white/70 hover:text-white hover:bg-white/5">
                <Link href={txt("why-us", "cta2Href", "/contact", "/contact")}>
                  {txt("why-us", "cta2Label", "تواصل معنا", "Contact Us")}
                </Link>
              </Button>
            </div>
          </FadeIn>

          <div className="grid grid-cols-2 gap-4">
            {[
              { Icon: Scale,     titleAr: "خبرة قضائية",   titleEn: "Judicial Expertise",       descAr: "أمام كل درجات التقاضي",       descEn: "Across all court levels" },
              { Icon: Shield,    titleAr: "دفاع متخصص",    titleEn: "Specialized Defense",       descAr: "في القضايا الجنائية والمدنية", descEn: "Criminal & civil cases" },
              { Icon: Briefcase, titleAr: "قانون الأعمال", titleEn: "Corporate Law",             descAr: "شركات وعقود واستثمار",        descEn: "Companies & investment" },
              { Icon: Globe,     titleAr: "تحكيم دولي",    titleEn: "International Arbitration", descAr: "نزاعات محلية ودولية",         descEn: "Local & intl disputes" },
            ].map((card, i) => (
              <FadeIn key={i} delay={0.1 + i * 0.12}>
                <div className="bg-white/4 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.07] hover:border-site-cta/30 transition-all duration-300">
                  <card.Icon className="w-8 h-8 text-site-cta-soft mb-4" />
                  <h4 className="text-white font-bold font-serif mb-1">{ar ? card.titleAr : card.titleEn}</h4>
                  <p className="text-white/50 text-sm">{ar ? card.descAr : card.descEn}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  );

  const teamSection = (
    <section className={sectionClass("team", "py-24 bg-background")}>
      <div className="container px-6 mx-auto max-w-7xl">
        <FadeIn className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-site-cta text-sm font-semibold tracking-widest uppercase mb-3 block">
            {txt("team", "eyebrow", "كفاءاتنا القانونية", "Our Legal Team")}
          </span>
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">
            {txt("team", "title", "محامونا", "Meet Our Lawyers")}
          </h2>
          <p className="text-muted-foreground text-lg">
            {txt(
              "team",
              "subtitle",
              "نخبة من أبرز المحامين المصريين بخبرة تمتد لعقود.",
              "An elite team of Egypt's finest attorneys with decades of combined experience.",
            )}
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {(lawyers?.slice(0, 4) ?? []).map((lawyer, i) => (
            <FadeIn key={lawyer.id} delay={i * 0.1}>
              <Link href={`/lawyers/${lawyer.id}`} className="group block">
                <div className="relative rounded-2xl overflow-hidden border border-border bg-card transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 hover:border-site-cta/30">
                  <div className="aspect-3/4 bg-muted relative overflow-hidden">
                    <img
                      src={lawyer.photoUrl ?? "/images/lawyer-male.png"}
                      alt={ar ? lawyer.nameAr : lawyer.nameEn}
                      className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-site-deep/90 via-site-deep/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                      <p className="text-white/80 text-xs leading-relaxed line-clamp-3">
                        {ar ? lawyer.bioAr : lawyer.bioEn}
                      </p>
                    </div>
                  </div>
                  <div className="p-5 text-center">
                    <h3 className="text-lg font-bold font-serif mb-1 text-foreground">
                      {ar ? lawyer.nameAr : lawyer.nameEn}
                    </h3>
                    <p className="text-site-cta font-medium text-sm mb-3">
                      {ar ? lawyer.titleAr : lawyer.titleEn}
                    </p>
                    {lawyer.yearsExperience && (
                      <span className="inline-block bg-primary/5 border border-border text-muted-foreground text-xs px-3 py-1 rounded-full">
                        {lawyer.yearsExperience}+ {ar ? "سنة خبرة" : "yrs experience"}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>

        <FadeIn className="text-center mt-10">
          <Button asChild variant="outline" size="lg" className="border-border hover:border-site-cta hover:text-site-cta px-10 transition-colors">
            <Link href={txt("team", "ctaHref", "/lawyers", "/lawyers")}>
              {txt("team", "ctaLabel", "تعرّف على فريقنا", "Meet the Full Team")}
            </Link>
          </Button>
        </FadeIn>
      </div>
    </section>
  );

  const testimonialsSection = (testimonials && testimonials.length > 0) ? (
    <section className={sectionClass("testimonials", "py-24 bg-muted/30 relative overflow-hidden")}>
      <div className="absolute inset-s-1/2 top-0 w-px h-full bg-linear-to-b from-transparent via-border to-transparent opacity-40" />
      <div className="container px-6 mx-auto max-w-7xl relative z-10">
        <FadeIn className="text-center max-w-xl mx-auto mb-16">
          <span className="text-site-cta text-sm font-semibold tracking-widest uppercase mb-3 block">
            {txt("testimonials", "eyebrow", "آراء موكلينا", "Client Testimonials")}
          </span>
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">
            {txt("testimonials", "title", "ما يقوله عملاؤنا", "What Our Clients Say")}
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.slice(0, 3).map((item, i) => (
            <FadeIn key={item.id} delay={i * 0.1}>
              <div className="bg-card border border-border rounded-2xl p-7 hover:shadow-xl hover:border-site-cta/20 transition-all duration-300 h-full flex flex-col">
                <Quote className="w-8 h-8 text-site-cta/20 mb-4" />
                <p className="text-foreground/80 leading-relaxed flex-1 mb-6 text-sm">
                  {ar ? item.contentAr : item.contentEn}
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-border flex items-center justify-center text-primary font-bold text-sm">
                    {item.clientName?.[0] ?? "؟"}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-foreground">
                      {item.clientName}
                    </div>
                    {item.role && (
                      <div className="text-muted-foreground text-xs">
                        {item.role}
                      </div>
                    )}
                  </div>
                  <div className="ms-auto flex gap-0.5">
                    {Array.from({ length: item.rating ?? 5 }).map((_, j) => (
                      <Star key={j} className="w-3.5 h-3.5 fill-site-cta text-site-cta" />
                    ))}
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  ) : null;

  const blogSection = (blogPosts && blogPosts.length > 0) ? (
    <section className={sectionClass("blog", "py-24 bg-background")}>
      <div className="container px-6 mx-auto max-w-7xl">
        <FadeIn className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <span className="text-site-cta text-sm font-semibold tracking-widest uppercase mb-2 block">
              {txt("blog", "eyebrow", "المستجدات القانونية", "Legal Insights")}
            </span>
            <h2 className="text-4xl font-serif font-bold text-foreground">
              {txt("blog", "title", "آخر المقالات", "Latest Articles")}
            </h2>
          </div>
          <Button asChild variant="ghost" className="text-site-cta hover:text-site-cta-hover group">
            <Link href={txt("blog", "ctaHref", "/blog", "/blog")} className="flex items-center gap-1">
              {txt("blog", "ctaLabel", "كل المقالات", "View All")}
              <Arrow className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </Button>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {blogPosts.slice(0, 3).map((post, i) => (
            <FadeIn key={post.id} delay={i * 0.1}>
              <Link href={`/blog/${post.slug}`} className="group block h-full">
                <div className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 hover:border-site-cta/30 transition-all duration-300 h-full flex flex-col">
                  {post.coverImageUrl && (
                    <div className="aspect-video overflow-hidden bg-muted">
                      <img
                        src={post.coverImageUrl}
                        alt={ar ? post.titleAr : post.titleEn}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <div className="p-6 flex flex-col flex-1">
                    <div className="text-site-cta text-xs font-semibold uppercase tracking-wider mb-3">
                      {new Date(post.publishedAt ?? post.createdAt).toLocaleDateString(
                        ar ? "ar-EG" : "en-US",
                        { year: "numeric", month: "long", day: "numeric" }
                      )}
                    </div>
                    <h3 className="font-serif font-bold text-lg text-foreground mb-3 group-hover:text-site-cta-text transition-colors line-clamp-2 flex-1">
                      {ar ? post.titleAr : post.titleEn}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 mb-4">
                      {ar ? post.summaryAr : post.summaryEn}
                    </p>
                    <div className="flex items-center text-site-cta text-sm font-semibold gap-1 group-hover:gap-2 transition-all mt-auto">
                      {ar ? "اقرأ المزيد" : "Read More"} <Arrow className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  ) : null;

  const ctaStripSection = (
    <section className={sectionClass("cta-strip", "py-20 bg-site-deep-soft relative overflow-hidden")}>
      <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(hsl(var(--site-cta))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--site-cta))_1px,transparent_1px)] bg-size-[60px_60px]" />
      <div className="absolute inset-s-0 top-0 bottom-0 w-1 bg-linear-to-b from-transparent via-site-cta/50 to-transparent" />

      <div className="container px-6 mx-auto max-w-5xl text-center relative z-10">
        <FadeIn>
          <div className="inline-flex items-center gap-2 bg-site-cta/15 text-site-cta-softer rounded-full px-5 py-2 text-sm font-medium mb-6">
            <Phone className="w-4 h-4" />
            {txt("cta-strip", "eyebrow", "نحن هنا لمساعدتك", "We Are Here to Help")}
          </div>
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mb-6 max-w-3xl mx-auto leading-tight">
            {txt(
              "cta-strip",
              "title",
              "لا تواجه تحدياتك القانونية وحدك",
              "Don't Face Your Legal Challenges Alone",
            )}
          </h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            {txt(
              "cta-strip",
              "subtitle",
              "تواصل معنا اليوم لحجز استشارة والحصول على توجيه قانوني متخصص من فريق يضع مصلحتك دائماً في المقدمة.",
              "Contact us today to book a consultation and get expert legal guidance from a team that always puts your interests first.",
            )}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button asChild size="lg" className="bg-site-cta hover:bg-site-cta-hover text-white font-semibold px-10 py-6 text-base shadow-xl shadow-site-cta-shadow-deep/30 hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300">
              <Link href={txt("cta-strip", "ctaHref", "/book", "/book")}>
                {txt("cta-strip", "ctaLabel", "احجز استشارتك الآن", "Book Your Consultation Now")}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/5 px-10 py-6 text-base">
              <Link href={txt("cta-strip", "cta2Href", "/contact", "/contact")}>
                {txt("cta-strip", "cta2Label", "أرسل لنا رسالة", "Send Us a Message")}
              </Link>
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-white/40 text-sm border-t border-white/10 pt-10">
            <a href={`tel:${siteInfo?.phone ?? "+20122 7655853"}`} className="flex items-center gap-2 hover:text-site-cta-soft transition-colors">
              <Phone className="w-4 h-4" />
              <span dir="ltr">{siteInfo?.phone ?? "+2 0122 7655 853"}</span>
            </a>
            <a href={`mailto:${siteInfo?.email ?? "info@egyptadvocates.com"}`} className="flex items-center gap-2 hover:text-site-cta-soft transition-colors">
              <Mail className="w-4 h-4" />
              {siteInfo?.email ?? "info@egyptadvocates.com"}
            </a>
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {ar
                ? (siteInfo?.addressAr ?? "الكوثر الجديد - منطقة البنوك - امام HSBC - أعلي بست واي - الدور الرابع - مكتب ٢١ - الغردقة")
                : (siteInfo?.addressEn ?? "Al Kawthar Al Jadid District / Banking Area / In front of HSBC / Above Best Way / 4th Floor / Office No. 21 - Hurghada")}
            </span>
          </div>
        </FadeIn>
      </div>
    </section>
  );

  /* ──────────────────────────────────────────────
     Render in editor-controlled order, gated by per-section visibility.
     ────────────────────────────────────────────── */
  const sectionMap: Record<HomeSectionId, React.ReactNode> = {
    "hero":           heroSection,
    "stats":          statsSection,
    "practice-areas": practiceAreasSection,
    "why-us":         whyUsSection,
    "team":           teamSection,
    "testimonials":   testimonialsSection,
    "blog":           blogSection,
    "cta-strip":      ctaStripSection,
  };

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">
      {editorCfg.pages.home.order.map((id) => {
        if (!isSectionEnabled(editorCfg, id)) return null;
        const node = sectionMap[id];
        if (!node) return null;
        return <Fragment key={id}>{node}</Fragment>;
      })}
    </div>
  );
}
