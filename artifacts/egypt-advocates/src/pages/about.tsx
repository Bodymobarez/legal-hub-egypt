import { Link } from "wouter";
import { useLanguage } from "@/lib/i18n";
import { useGetSiteInfo } from "@workspace/api-client-react";
import {
  Scale, Award, ShieldCheck, Sparkles,
  Target, Eye, Building2, MapPin, Phone, Mail,
  Cpu, Users, FileText, BadgeCheck, ArrowRight, ArrowLeft,
  Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ──────────────────────────────────────────────
   Page copy — sourced verbatim from the official
   Egypt Advocates company profile (AR + EN PDFs).
   ────────────────────────────────────────────── */

const COPY = {
  hero: {
    eyebrow: { ar: "من نحن", en: "About Us" },
    title: { ar: "EGYPT ADVOCATES", en: "EGYPT ADVOCATES" },
    subtitle: { ar: "مكتب الأستاذ محمد أحمد عثمان للمحاماة والاستشارات القانونية", en: "Mohamed A. Osman Law Firm — Legal Consultants" },
    pillars: [
      { ar: "العدالة",   en: "Justice"   },
      { ar: "النزاهة",   en: "Integrity" },
      { ar: "الخبرة",    en: "Expertise" },
    ],
    tagline: { ar: "حلول قانونية قابلة للتنفيذ", en: "Enforceable legal solutions" },
  },
  story: {
    label: { ar: "كلمة المؤسس", en: "Our Story" },
    paragraphs: {
      ar: [
        "في EGYPT ADVOCATES، تنبع قوّتنا من مسيرة قانونية راسخة بدأت منذ عام 1998، وتطورت عبر سنوات من الدراسات العليا والخبرة العملية داخل كبرى مكاتب المحاماة الدولية والمحلية.",
        "منذ تأسيس مقرنا في الغردقة عام 2006، تم وضع حجر الأساس لمنظومة عمل متخصصة في خدمة القطاعات الاستثمارية والعقارية، مستندة إلى خبرة عملية راسخة عزّزت مكانتنا كمرجعية قانونية موثوقة.",
        "واليوم، نقود تحوّلاً مؤسسياً متقدماً يعكس طموحنا في الارتقاء بنموذج العمل إلى مستوى أكثر احترافية واستدامة، من خلال تطبيق أفضل ممارسات الحوكمة وتبني أنظمة تشغيل حديثة مدعومة بأحدث الحلول التقنية والإدارية. وبهدف هذا التوجه إلى تعزيز كفاءة الأداء المؤسسي وترسيخ أعلى معايير الشفافية والاحترافية.",
      ],
      en: [
        "At Egypt Advocates, our strength is anchored in a distinguished legal legacy that commenced in 1998 and has been progressively refined through advanced academic pursuit and extensive practical experience within leading international and domestic law firms.",
        "Since the establishment of our headquarters in Hurghada in 2006, we have laid the cornerstone for a highly specialized practice dedicated to serving the investment and real estate sectors — built upon deep-rooted expertise that has firmly positioned us as a trusted legal authority.",
        "Today, we are leading a sophisticated institutional transformation that reflects our ambition to elevate our operating model to a higher standard of professionalism and sustainability. This is achieved through the implementation of best-in-class governance frameworks and the adoption of modern operating systems supported by cutting-edge technological and administrative solutions. Through this strategic direction, we seek to enhance institutional performance while entrenching the highest standards of transparency and professional excellence.",
      ],
    },
  },
  mission: {
    label: { ar: "رسالتنا", en: "Our Mission" },
    body: {
      ar: "تقديم حلول قانونية قابلة للتنفيذ، قائمة على نهج استباقي لحماية مصالح موكلينا وتعزيز أعمالهم، من خلال بيئة عمل مؤسسية عالية التنظيم. نعتمد على أعلى معايير الحوكمة والشفافية المالية، وإدارة تشغيلية دقيقة، وفريق عمل متعدد الخبرات يتمتع بكفاءة عالية ورؤية تجارية وقانونية متكاملة، بما يضمن تقديم قيمة مستدامة وخدمات قانونية بمعايير دولية رفيعة.",
      en: "To deliver sophisticated, actionable legal solutions rooted in a proactive approach to safeguarding our clients' interests and accelerating their commercial objectives. We are committed to a rigorous institutional framework governed by the highest standards of financial transparency and operational precision. By leveraging a multidisciplinary team of elite professionals who possess a synergistic commercial and legal outlook, we ensure the delivery of sustainable value and world-class legal services.",
    },
  },
  vision: {
    label: { ar: "رؤيتنا", en: "Our Vision" },
    body: {
      ar: "أن نرسّخ مكانتنا كمرجع قانوني رائد في تطوير مهنة المحاماة في مصر، وأن نكون الوجهة القانونية الأولى للمستثمرين في منطقة البحر الأحمر والقاهرة، عبر منظومة متكاملة تمزج بين الإرث القانوني العريق وأحدث الحلول التكنولوجية، بما يعزز الكفاءة ويرتقي بمعايير الخدمة القانونية.",
      en: "To establish ourselves as the preeminent legal authority driving the evolution of the legal profession in Egypt. Our vision is to be the premier destination for investors across the Red Sea region and Cairo, powered by an integrated ecosystem that seamlessly bridges prestigious legal heritage with cutting-edge technological solutions — redefining efficiency and elevating the benchmarks of legal excellence.",
    },
  },
  why: {
    label: { ar: "لماذا EGYPT ADVOCATES؟", en: "Why Choose Us" },
    intro: {
      ar: "أربعة محاور مؤسسية تميّز نموذج عملنا عن غيره من مكاتب المحاماة:",
      en: "Four institutional pillars set our operating model apart:",
    },
    cards: [
      {
        icon: ShieldCheck,
        title: { ar: "حوكمة مؤسسية صارمة", en: "Institution-grade Governance" },
        body: {
          ar: "نُدير العمل القانوني بعقلية مؤسسية صارمة، نرتكز على حوكمة متقدمة ورقابة مالية وإدارية دقيقة، بما يضمن تنفيذاً منضبطاً ونتائج يمكن الاعتماد عليها.",
          en: "We operate with a disciplined, institution-grade approach to legal practice, underpinned by robust governance frameworks and rigorous financial and administrative controls — ensuring precision in execution and consistently reliable outcomes.",
        },
      },
      {
        icon: Cpu,
        title: { ar: "بنية رقمية متطوّرة", en: "Advanced Digital Infrastructure" },
        body: {
          ar: "نعتمد على بنية رقمية متطوّرة تُسرع إدارة القضايا وتعزز التواصل مع العملاء، بما يحقق كفاءة تشغيلية عالية دون المساس بالسرية أو الجودة.",
          en: "We leverage an advanced digital infrastructure to streamline case management and client engagement, delivering accelerated turnaround times while upholding the highest standards of confidentiality and professional integrity.",
        },
      },
      {
        icon: Users,
        title: { ar: "نخبة من المحامين المتخصصين", en: "A Hand-picked Team of Specialists" },
        body: {
          ar: "فريقنا يضم نخبة منتقاة من المحامين ذوي الكفاءة العالية والخبرة المتخصصة، قادرين على التعامل مع الملفات المعقّدة بكفاءة وسرعة وفق أعلى المعايير الدولية.",
          en: "Our team comprises a carefully curated group of high-caliber lawyers with deep technical expertise and sector-specific experience, enabling us to navigate complex matters with efficiency, clarity, and strategic foresight.",
        },
      },
      {
        icon: FileText,
        title: { ar: "صياغة ثنائية اللغة عالية الدقة", en: "Bilingual Drafting & Advisory" },
        body: {
          ar: "نوفر صياغة قانونية دقيقة واحترافية باللغتين العربية والإنجليزية، بما يضمن وضوحاً كاملاً في المعاملات المحلية والدولية.",
          en: "We provide sophisticated, bilingual legal drafting and advisory services in both Arabic and English, ensuring absolute clarity, accuracy, and alignment across domestic and cross-border transactions.",
        },
      },
    ],
  },
  cta: {
    title: { ar: "يسعدنا تواصلكم معنا", en: "Get in touch with our team" },
    body: {
      ar: "نلتزم بتقديم دعم قانوني يستند إلى تحليل استراتيجي عميق وحلول تنفيذية دقيقة، بما يلبي احتياجاتكم سواء في السياقات العاجلة أو ضمن علاقات استشارية طويلة الأمد.",
      en: "We are ready to support you with strategic legal insight and actionable solutions — whether you need urgent legal assistance or ongoing advisory.",
    },
    addressLine1: { ar: "الكوثر الجديد · منطقة البنوك · أمام HSBC", en: "Al Kawthar Al Jadid · Banking Area · In front of HSBC" },
    addressLine2: { ar: "أعلى Best Way · الدور الرابع · مكتب 21", en: "Above Best Way · 4th Floor · Office No. 21" },
  },
} as const;

/* ──────────────────────────────────────────────
   Page
   ────────────────────────────────────────────── */

export default function About() {
  const { language, isRtl } = useLanguage();
  const { data: siteInfo } = useGetSiteInfo();
  const Arrow = isRtl ? ArrowLeft : ArrowRight;
  const lang = language as "ar" | "en";

  const phone   = siteInfo?.phone   || "+2 0122 7655 853";
  const email   = siteInfo?.email   || "info@egyptadvocates.com";

  return (
    <div className="flex flex-col min-h-screen">
      {/* ──────────────── Hero ──────────────── */}
      <section className="relative overflow-hidden bg-site-deep text-white">
        <div
          className="absolute inset-0 opacity-[0.07] bg-[url('/images/hero-office.png')] bg-cover bg-center"
          aria-hidden
        />
        <div className="absolute inset-0 bg-linear-to-b from-site-deep/80 via-site-deep to-site-deep" aria-hidden />
        <div className="relative container px-4 mx-auto py-24 md:py-32 text-center max-w-4xl">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur text-xs font-medium tracking-widest uppercase text-white/80 mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            {COPY.hero.eyebrow[lang]}
          </span>
          <h1 className="text-4xl md:text-6xl font-serif font-bold mb-3 tracking-tight">
            {COPY.hero.title[lang]}
          </h1>
          <p className="text-base md:text-lg text-white/70 mb-10 max-w-2xl mx-auto">
            {COPY.hero.subtitle[lang]}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6 mb-10">
            {COPY.hero.pillars.map((p, i) => (
              <span
                key={i}
                className="text-2xl md:text-3xl font-serif font-bold tracking-wide"
                style={{ color: i === 1 ? "var(--cta-color, #c4734a)" : "white" }}
              >
                {p[lang]}.
              </span>
            ))}
          </div>

          <p className="inline-flex items-center gap-2 italic text-white/60 text-sm md:text-base">
            <Quote className="w-4 h-4" />
            {COPY.hero.tagline[lang]}
          </p>
        </div>
      </section>

      {/* ──────────────── Founder's Word / Story ──────────────── */}
      <section className="py-20 md:py-24 bg-background">
        <div className="container px-4 mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="relative">
                <img
                  src="/images/hero-office.png"
                  alt="Egypt Advocates"
                  className="rounded-2xl shadow-2xl w-full h-auto object-cover aspect-4/5"
                />
                <div className="absolute -bottom-6 -inset-e-6 bg-card border border-border/60 rounded-xl shadow-lg p-4 w-44">
                  <div className="text-3xl font-serif font-bold text-accent">1998</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {language === "ar" ? "بداية المسيرة" : "The journey began"}
                  </div>
                </div>
                <div className="absolute -top-6 -inset-s-6 bg-card border border-border/60 rounded-xl shadow-lg p-4 w-44">
                  <div className="text-3xl font-serif font-bold text-accent">2006</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {language === "ar" ? "تأسيس المقر بالغردقة" : "HQ in Hurghada"}
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <span className="inline-block text-xs font-semibold tracking-widest uppercase text-accent mb-3">
                {COPY.story.label[lang]}
              </span>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-6 leading-tight">
                {language === "ar"
                  ? "إرث قانوني عريق، رؤية مؤسسية معاصرة"
                  : "A distinguished legal legacy, a modern institutional vision"}
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed text-[15px]">
                {COPY.story.paragraphs[lang].map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────── Mission + Vision ──────────────── */}
      <section className="py-20 md:py-24 bg-muted/30 border-y border-border/60">
        <div className="container px-4 mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {[
              { icon: Target, copy: COPY.mission },
              { icon: Eye,    copy: COPY.vision  },
            ].map(({ icon: Icon, copy }, i) => (
              <div
                key={i}
                className="relative bg-card rounded-2xl border border-border/60 p-8 md:p-10 shadow-sm hover:shadow-lg transition-shadow"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/10 text-accent mb-6">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-4">
                  {copy.label[lang]}
                </h3>
                <p className="text-muted-foreground leading-relaxed text-[15px]">
                  {copy.body[lang]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────── Why Choose Us ──────────────── */}
      <section className="py-20 md:py-24 bg-background">
        <div className="container px-4 mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
            <span className="inline-block text-xs font-semibold tracking-widest uppercase text-accent mb-3">
              {language === "ar" ? "نقاط التميّز" : "What Sets Us Apart"}
            </span>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              {COPY.why.label[lang]}
            </h2>
            <p className="text-muted-foreground">
              {COPY.why.intro[lang]}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {COPY.why.cards.map((c, i) => {
              const Icon = c.icon;
              return (
                <div
                  key={i}
                  className="group flex gap-5 p-6 md:p-7 rounded-2xl border border-border/60 bg-card hover:border-accent/40 hover:shadow-lg transition-all"
                >
                  <div className="shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/8 text-primary group-hover:bg-accent/10 group-hover:text-accent transition-colors">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-serif font-bold text-lg text-foreground mb-2">
                      {c.title[lang]}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {c.body[lang]}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick value badges */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[
              { icon: Scale,      label: { ar: "مرجعية قانونية موثوقة", en: "Trusted legal authority" } },
              { icon: BadgeCheck, label: { ar: "حلول قابلة للتنفيذ",     en: "Enforceable solutions"   } },
              { icon: Building2,  label: { ar: "خدمة القطاعات الاستثمارية", en: "Investment & real estate" } },
              { icon: Award,      label: { ar: "معايير دولية رفيعة",     en: "International standards" } },
            ].map(({ icon: Icon, label }, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/40 border border-border/40"
              >
                <Icon className="w-5 h-5 text-accent shrink-0" />
                <span className="text-xs md:text-sm font-medium text-foreground">{label[lang]}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────── Get in Touch CTA ──────────────── */}
      <section className="py-20 md:py-24 bg-site-deep text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_50%,white,transparent_50%)]" aria-hidden />
        <div className="container px-4 mx-auto max-w-5xl relative">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10 items-center">
            <div className="md:col-span-3">
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
                {COPY.cta.title[lang]}
              </h2>
              <p className="text-white/70 leading-relaxed mb-8 text-[15px]">
                {COPY.cta.body[lang]}
              </p>

              <div className="flex flex-wrap gap-3">
                <Link href="/contact">
                  <Button size="lg" className="bg-accent hover:bg-accent/90 text-white">
                    {language === "ar" ? "تواصل معنا" : "Contact us"}
                    <Arrow className="w-4 h-4 ms-2" />
                  </Button>
                </Link>
                <Link href="/book">
                  <Button size="lg" variant="outline" className="bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white">
                    {language === "ar" ? "احجز استشارة" : "Book a consultation"}
                  </Button>
                </Link>
              </div>
            </div>

            <div className="md:col-span-2 space-y-4">
              {[
                {
                  icon: Phone,
                  label: language === "ar" ? "اتصل بنا" : "Call us",
                  value: phone,
                  href:  `tel:${phone.replace(/\s+/g, "")}`,
                },
                {
                  icon: Mail,
                  label: language === "ar" ? "راسلنا" : "Email us",
                  value: email,
                  href:  `mailto:${email}`,
                },
                {
                  icon: MapPin,
                  label: language === "ar" ? "العنوان" : "Address",
                  value: `${COPY.cta.addressLine1[lang]} — ${COPY.cta.addressLine2[lang]}`,
                  href:  null,
                },
              ].map(({ icon: Icon, label, value, href }, i) => {
                const inner = (
                  <div className="flex gap-3 items-start group">
                    <div className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 text-accent group-hover:bg-accent/20 transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] uppercase tracking-widest text-white/50 mb-0.5">{label}</div>
                      <div className="text-sm text-white/90 wrap-break-word" dir={i === 0 ? "ltr" : undefined}>
                        {value}
                      </div>
                    </div>
                  </div>
                );
                return href ? (
                  <a key={i} href={href} className="block hover:bg-white/5 rounded-xl p-3 -mx-3 transition-colors">
                    {inner}
                  </a>
                ) : (
                  <div key={i} className="p-3 -mx-3">{inner}</div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
