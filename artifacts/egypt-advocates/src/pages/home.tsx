import { useLanguage } from "@/lib/i18n";
import { SITE_DEFAULTS } from "@/lib/site-defaults";
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
import { useEffect, useRef, useState } from "react";
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
  const { language, t, isRtl } = useLanguage();
  const { data: _siteInfo }     = useGetSiteInfo();
  const siteInfo = { ...SITE_DEFAULTS, ..._siteInfo };
  const { data: stats }         = useGetSiteStats();
  const { data: practiceAreas } = useListPracticeAreas();
  const { data: lawyers }       = useListLawyers();
  const { data: testimonials }  = useListTestimonials();
  const { data: blogPosts }     = useListBlogPosts();
  const { data: workHours }     = useGetWorkHoursStatus();

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

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">

      {/* ══════════════════ HERO ══════════════════ */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden bg-[hsl(220,50%,10%)]">
        {/* Background layers */}
        <div className="absolute inset-0 z-0">
          <img
            src="/images/hero-scales.png"
            alt=""
            className="w-full h-full object-cover opacity-70 object-center"
          />
          <div className="absolute inset-0 bg-linear-to-r from-[hsl(220,50%,8%)]/90 via-[hsl(220,50%,10%)]/60 to-transparent" />
          <div className="absolute inset-0 bg-linear-to-t from-[hsl(220,50%,8%)]/70 via-transparent to-transparent" />
        </div>

        {/* Gold vertical line */}
        <div className="absolute top-0 inset-e-0 w-px h-full bg-linear-to-b from-transparent via-[hsl(15,45%,55%)]/40 to-transparent hidden lg:block" />
        <div className="absolute bottom-0 inset-x-0 h-px bg-linear-to-r from-transparent via-[hsl(15,45%,55%)]/50 to-transparent" />

        <div className="container relative z-10 px-6 mx-auto max-w-7xl">
          <div ref={heroRef} className="reveal max-w-3xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-[hsl(15,45%,55%)]/15 border border-[hsl(15,45%,55%)]/30 text-[hsl(15,55%,70%)] rounded-full px-4 py-1.5 text-sm font-medium mb-6 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(15,45%,55%)] pulse-dot" />
              {ar ? "مكتب محاماة مصري رائد منذ ٢٠٠٨" : "Egypt's Premier Law Firm Since 2008"}
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-serif font-bold text-white leading-[1.08] mb-6">
              {ar ? (
                <>
                  <span className="block">{siteInfo?.nameAr ?? "مكتب مصر"}</span>
                  <span className="block text-[hsl(15,55%,65%)]">للمحاماة</span>
                </>
              ) : (
                <>
                  <span className="block">Egypt</span>
                  <span className="block text-[hsl(15,55%,65%)]">Advocates</span>
                </>
              )}
            </h1>

            {/* Gold bar */}
            <div
              ref={heroBarRef}
              className="hero-bar h-0.5 w-24 bg-linear-to-r from-[hsl(15,45%,55%)] to-transparent mb-6"
              style={{ transformOrigin: isRtl ? "right" : "left" }}
            />

            <p className="text-lg md:text-xl text-white/70 mb-10 max-w-xl leading-relaxed">
              {ar
                ? (siteInfo?.taglineAr ?? "حلول قانونية قابلة للتنفيذ — نلتزم بتقديم دعم قانوني يسند إلى تحليل استراتيجي عميق وحلول تنفيذية دقيقة.")
                : (siteInfo?.taglineEn ?? "Actionable Legal Solutions — strategic analysis and precise execution for every case, urgent or long-term.")}
            </p>

            <div className="flex flex-wrap gap-4">
              <Button
                asChild size="lg"
                className="bg-[hsl(15,45%,55%)] hover:bg-[hsl(15,45%,48%)] text-white font-semibold px-8 py-6 text-base shadow-lg shadow-[hsl(15,45%,30%)]/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
              >
                <Link href="/book">
                  {ar ? "احجز استشارة" : "Book a Consultation"}
                  <Arrow className="w-4 h-4 ms-2" />
                </Link>
              </Button>
              <Button
                asChild size="lg" variant="outline"
                className="border-white/20 text-white bg-white/5 hover:bg-white/10 backdrop-blur-sm px-8 py-6 text-base"
              >
                <Link href="/practice-areas">
                  {ar ? "مجالات الممارسة" : "Practice Areas"}
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

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/30">
          <span className="text-xs tracking-widest uppercase">{ar ? "تمرير" : "Scroll"}</span>
          <div className="scroll-bounce w-px h-8 bg-linear-to-b from-white/30 to-transparent" />
        </div>
      </section>

      {/* ══════════════════ STATS ══════════════════ */}
      <section className="py-16 bg-[hsl(220,50%,14%)] border-y border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 bg-[repeating-linear-gradient(90deg,hsl(15,45%,55%)_0,hsl(15,45%,55%)_1px,transparent_0,transparent_50%)] bg-size-[60px_60px]" />
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
                  <div className="w-12 h-12 rounded-xl bg-[hsl(15,45%,55%)]/10 border border-[hsl(15,45%,55%)]/20 flex items-center justify-center mb-4 group-hover:bg-[hsl(15,45%,55%)]/20 transition-colors">
                    <s.Icon className="w-5 h-5 text-[hsl(15,55%,65%)]" />
                  </div>
                  <div className="text-4xl md:text-5xl font-serif font-bold text-white mb-1">
                    <AnimatedCounter to={s.value} suffix={s.suffix} />
                  </div>
                  <div className="text-[hsl(15,55%,65%)] text-sm font-medium tracking-wide">
                    {ar ? s.labelAr : s.labelEn}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ PRACTICE AREAS ══════════════════ */}
      <section className="py-24 bg-background relative overflow-hidden">
        <div className="absolute inset-e-0 top-0 w-1/3 h-full bg-linear-to-l from-[hsl(15,45%,55%)]/3 to-transparent pointer-events-none" />
        <div className="container px-6 mx-auto max-w-7xl">
          <FadeIn className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[hsl(15,45%,55%)] text-sm font-semibold tracking-widest uppercase mb-3 block">
              {ar ? "خبرتنا القانونية" : "Our Expertise"}
            </span>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">
              {ar ? "مجالات الممارسة" : "Practice Areas"}
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              {ar
                ? "تغطية قانونية شاملة في جميع المجالات التخصصية بأعلى معايير الاحترافية."
                : "Comprehensive legal coverage across all specialties to the highest professional standards."}
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {(practiceAreas?.slice(0, 9) ?? []).map((area, i) => {
              const Icon = practiceIcons[area.slug] ?? practiceIcons.default;
              return (
                <FadeIn key={area.id} delay={Math.floor(i / 3) * 0.1 + (i % 3) * 0.07}>
                  <Link href={`/practice-areas/${area.slug}`} className="group block h-full">
                    <div className="relative h-full bg-card border border-border p-7 rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-[hsl(15,45%,55%)]/10 hover:-translate-y-1 hover:border-[hsl(15,45%,55%)]/30">
                      <div className="absolute inset-0 bg-linear-to-br from-[hsl(15,45%,55%)]/0 to-transparent group-hover:from-[hsl(15,45%,55%)]/5 transition-all duration-500 rounded-2xl" />
                      <div className="relative z-10">
                        <div className="w-14 h-14 rounded-2xl bg-primary/5 border border-border flex items-center justify-center mb-5 group-hover:bg-[hsl(15,45%,55%)] group-hover:border-[hsl(15,45%,55%)] transition-all duration-300">
                          <Icon className="w-6 h-6 text-primary group-hover:text-white transition-colors duration-300" />
                        </div>
                        <h3 className="text-xl font-bold font-serif mb-3 text-foreground group-hover:text-[hsl(15,35%,40%)] transition-colors">
                          {ar ? area.nameAr : area.nameEn}
                        </h3>
                        <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
                          {ar ? area.descriptionAr : area.descriptionEn}
                        </p>
                        <div className="mt-5 flex items-center text-[hsl(15,45%,55%)] font-semibold text-sm gap-1 group-hover:gap-2 transition-all">
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
            <Button asChild variant="outline" size="lg" className="border-border hover:border-[hsl(15,45%,55%)] hover:text-[hsl(15,45%,55%)] transition-colors px-10">
              <Link href="/practice-areas">{ar ? "عرض جميع المجالات" : "View All Practice Areas"}</Link>
            </Button>
          </FadeIn>
        </div>
      </section>

      {/* ══════════════════ WHY US ══════════════════ */}
      <section className="py-24 bg-[hsl(220,50%,12%)] relative overflow-hidden">
        <div className="absolute inset-s-0 top-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[hsl(15,45%,55%)]/5 blur-3xl pointer-events-none" />
        <div className="container px-6 mx-auto max-w-7xl relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <FadeIn dir={isRtl ? "right" : "left"}>
              <span className="text-[hsl(15,55%,65%)] text-sm font-semibold tracking-widest uppercase mb-3 block">
                {ar ? "لماذا تختارنا" : "Why Choose Us"}
              </span>
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mb-6 leading-tight">
                {ar ? "التزام لا يتزعزع بالتميز القانوني" : "Unwavering Commitment to Legal Excellence"}
              </h2>
              <p className="text-white/60 text-lg leading-relaxed mb-8">
                {ar
                  ? "منذ عام ٢٠٠٨، نحمل راية العدالة بأمانة واحترافية، ونقف إلى جانب كل موكل بكل ما نملك من خبرة وتفانٍ."
                  : "Since 2008, we carry the banner of justice with integrity and professionalism, standing beside every client with the full weight of our expertise."}
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
                      <CheckCircle2 className="w-5 h-5 text-[hsl(15,55%,65%)] shrink-0" />
                      <span className="text-white/80">{ar ? item.ar : item.en}</span>
                    </div>
                  </FadeIn>
                ))}
              </div>
              <div className="flex gap-4 flex-wrap">
                <Button asChild size="lg" className="bg-[hsl(15,45%,55%)] hover:bg-[hsl(15,45%,48%)] text-white px-8">
                  <Link href="/about">{ar ? "عن المكتب" : "About Us"}</Link>
                </Button>
                <Button asChild size="lg" variant="ghost" className="text-white/70 hover:text-white hover:bg-white/5">
                  <Link href="/contact">{ar ? "تواصل معنا" : "Contact Us"}</Link>
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
                  <div className="bg-white/4 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.07] hover:border-[hsl(15,45%,55%)]/30 transition-all duration-300">
                    <card.Icon className="w-8 h-8 text-[hsl(15,55%,65%)] mb-4" />
                    <h4 className="text-white font-bold font-serif mb-1">{ar ? card.titleAr : card.titleEn}</h4>
                    <p className="text-white/50 text-sm">{ar ? card.descAr : card.descEn}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════ TEAM ══════════════════ */}
      <section className="py-24 bg-background">
        <div className="container px-6 mx-auto max-w-7xl">
          <FadeIn className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[hsl(15,45%,55%)] text-sm font-semibold tracking-widest uppercase mb-3 block">
              {ar ? "كفاءاتنا القانونية" : "Our Legal Team"}
            </span>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">
              {ar ? "محامونا" : "Meet Our Lawyers"}
            </h2>
            <p className="text-muted-foreground text-lg">
              {ar
                ? "نخبة من أبرز المحامين المصريين بخبرة تمتد لعقود."
                : "An elite team of Egypt's finest attorneys with decades of combined experience."}
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(lawyers?.slice(0, 4) ?? []).map((lawyer, i) => (
              <FadeIn key={lawyer.id} delay={i * 0.1}>
                <Link href={`/lawyers/${lawyer.id}`} className="group block">
                  <div className="relative rounded-2xl overflow-hidden border border-border bg-card transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 hover:border-[hsl(15,45%,55%)]/30">
                    <div className="aspect-3/4 bg-muted relative overflow-hidden">
                      <img
                        src={lawyer.photoUrl ?? "/images/lawyer-male.png"}
                        alt={ar ? lawyer.nameAr : lawyer.nameEn}
                        className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-[hsl(220,50%,10%)]/90 via-[hsl(220,50%,10%)]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
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
                      <p className="text-[hsl(15,45%,55%)] font-medium text-sm mb-3">
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
            <Button asChild variant="outline" size="lg" className="border-border hover:border-[hsl(15,45%,55%)] hover:text-[hsl(15,45%,55%)] px-10 transition-colors">
              <Link href="/lawyers">{ar ? "تعرّف على فريقنا" : "Meet the Full Team"}</Link>
            </Button>
          </FadeIn>
        </div>
      </section>

      {/* ══════════════════ TESTIMONIALS ══════════════════ */}
      {testimonials && testimonials.length > 0 && (
        <section className="py-24 bg-muted/30 relative overflow-hidden">
          <div className="absolute inset-s-1/2 top-0 w-px h-full bg-linear-to-b from-transparent via-border to-transparent opacity-40" />
          <div className="container px-6 mx-auto max-w-7xl relative z-10">
            <FadeIn className="text-center max-w-xl mx-auto mb-16">
              <span className="text-[hsl(15,45%,55%)] text-sm font-semibold tracking-widest uppercase mb-3 block">
                {ar ? "آراء موكلينا" : "Client Testimonials"}
              </span>
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">
                {ar ? "ما يقوله عملاؤنا" : "What Our Clients Say"}
              </h2>
            </FadeIn>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.slice(0, 3).map((item, i) => (
                <FadeIn key={item.id} delay={i * 0.1}>
                  <div className="bg-card border border-border rounded-2xl p-7 hover:shadow-xl hover:border-[hsl(15,45%,55%)]/20 transition-all duration-300 h-full flex flex-col">
                    <Quote className="w-8 h-8 text-[hsl(15,45%,55%)]/20 mb-4" />
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
                          <Star key={j} className="w-3.5 h-3.5 fill-[hsl(15,45%,55%)] text-[hsl(15,45%,55%)]" />
                        ))}
                      </div>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════ BLOG ══════════════════ */}
      {blogPosts && blogPosts.length > 0 && (
        <section className="py-24 bg-background">
          <div className="container px-6 mx-auto max-w-7xl">
            <FadeIn className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
              <div>
                <span className="text-[hsl(15,45%,55%)] text-sm font-semibold tracking-widest uppercase mb-2 block">
                  {ar ? "المستجدات القانونية" : "Legal Insights"}
                </span>
                <h2 className="text-4xl font-serif font-bold text-foreground">
                  {ar ? "آخر المقالات" : "Latest Articles"}
                </h2>
              </div>
              <Button asChild variant="ghost" className="text-[hsl(15,45%,55%)] hover:text-[hsl(15,45%,48%)] group">
                <Link href="/blog" className="flex items-center gap-1">
                  {ar ? "كل المقالات" : "View All"}
                  <Arrow className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </Button>
            </FadeIn>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {blogPosts.slice(0, 3).map((post, i) => (
                <FadeIn key={post.id} delay={i * 0.1}>
                  <Link href={`/blog/${post.slug}`} className="group block h-full">
                    <div className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 hover:border-[hsl(15,45%,55%)]/30 transition-all duration-300 h-full flex flex-col">
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
                        <div className="text-[hsl(15,45%,55%)] text-xs font-semibold uppercase tracking-wider mb-3">
                          {new Date(post.publishedAt ?? post.createdAt).toLocaleDateString(
                            ar ? "ar-EG" : "en-US",
                            { year: "numeric", month: "long", day: "numeric" }
                          )}
                        </div>
                        <h3 className="font-serif font-bold text-lg text-foreground mb-3 group-hover:text-[hsl(15,35%,40%)] transition-colors line-clamp-2 flex-1">
                          {ar ? post.titleAr : post.titleEn}
                        </h3>
                        <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 mb-4">
                          {ar ? post.summaryAr : post.summaryEn}
                        </p>
                        <div className="flex items-center text-[hsl(15,45%,55%)] text-sm font-semibold gap-1 group-hover:gap-2 transition-all mt-auto">
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
      )}

      {/* ══════════════════ CTA STRIP ══════════════════ */}
      <section className="py-20 bg-[hsl(220,50%,12%)] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(hsl(15,45%,55%)_1px,transparent_1px),linear-gradient(90deg,hsl(15,45%,55%)_1px,transparent_1px)] bg-size-[60px_60px]" />
        <div className="absolute inset-s-0 top-0 bottom-0 w-1 bg-linear-to-b from-transparent via-[hsl(15,45%,55%)]/50 to-transparent" />

        <div className="container px-6 mx-auto max-w-5xl text-center relative z-10">
          <FadeIn>
            <div className="inline-flex items-center gap-2 bg-[hsl(15,45%,55%)]/15 text-[hsl(15,55%,70%)] rounded-full px-5 py-2 text-sm font-medium mb-6">
              <Phone className="w-4 h-4" />
              {ar ? "نحن هنا لمساعدتك" : "We Are Here to Help"}
            </div>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mb-6 max-w-3xl mx-auto leading-tight">
              {ar ? "لا تواجه تحدياتك القانونية وحدك" : "Don't Face Your Legal Challenges Alone"}
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
              {ar
                ? "تواصل معنا اليوم لحجز استشارة والحصول على توجيه قانوني متخصص من فريق يضع مصلحتك دائماً في المقدمة."
                : "Contact us today to book a consultation and get expert legal guidance from a team that always puts your interests first."}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button asChild size="lg" className="bg-[hsl(15,45%,55%)] hover:bg-[hsl(15,45%,48%)] text-white font-semibold px-10 py-6 text-base shadow-xl shadow-[hsl(15,45%,20%)]/30 hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300">
                <Link href="/book">{ar ? "احجز استشارتك الآن" : "Book Your Consultation Now"}</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/5 px-10 py-6 text-base">
                <Link href="/contact">{ar ? "أرسل لنا رسالة" : "Send Us a Message"}</Link>
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-white/40 text-sm border-t border-white/10 pt-10">
              <a href={`tel:${siteInfo?.phone ?? "+20122 7655853"}`} className="flex items-center gap-2 hover:text-[hsl(15,55%,65%)] transition-colors">
                <Phone className="w-4 h-4" />
                <span dir="ltr">{siteInfo?.phone ?? "+2 0122 7655 853"}</span>
              </a>
              <a href={`mailto:${siteInfo?.email ?? "info@egyptadvocates.com"}`} className="flex items-center gap-2 hover:text-[hsl(15,55%,65%)] transition-colors">
                <Mail className="w-4 h-4" />
                {siteInfo?.email ?? "info@egyptadvocates.com"}
              </a>
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {ar
                  ? (siteInfo?.addressAr ?? "الكوثر الجديد - منطقة البنوك - أمام HSBC - أعلى بست واي - الدور الرابع - مكتب 21")
                  : (siteInfo?.addressEn ?? "Al Kawthar Al Jadid District, Banking Area, In front of HSBC, Above Best Way, 4th Floor, Office No. 21")}
              </span>
            </div>
          </FadeIn>
        </div>
      </section>

    </div>
  );
}
