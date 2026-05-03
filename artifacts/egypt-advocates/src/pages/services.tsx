import { useLanguage } from "@/lib/i18n";
import { Link } from "wouter";
import { useListServices, useListPracticeAreas } from "@workspace/api-client-react";
import {
  Clock, ArrowRight, ArrowLeft, Briefcase, Scale,
  Heart, Home, Globe, Anchor, Shield, Sparkles,
  Search, FileSignature, FileCheck, Gavel,
  Banknote, Stamp, Plane, BadgeDollarSign,
  Ship, Compass, ScrollText,
  Building, Landmark, ShieldCheck,
  CalendarCheck, Tag,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { LucideIcon } from "lucide-react";

/* ──────────────────────────────────────────────
   The 7 practice areas from the official Egypt
   Advocates company profile (AR + EN PDFs).
   ────────────────────────────────────────────── */

interface SubPoint {
  icon: LucideIcon;
  title: { ar: string; en: string };
  body:  { ar: string; en: string };
}

interface PracticeArea {
  number: number;
  icon: LucideIcon;
  accent: string;          // Tailwind color class for the icon tile
  title: { ar: string; en: string };
  intro: { ar: string; en: string };
  /** Optional grid of sub-points displayed below the intro. */
  points?: SubPoint[];
}

const PRACTICE_AREAS: PracticeArea[] = [
  {
    number: 1,
    icon: Briefcase,
    accent: "text-amber-600 bg-amber-500/10",
    title: { ar: "القانون التجاري وتأسيس الشركات", en: "Corporate & Commercial Law" },
    intro: {
      ar: "نقدم حلولاً قانونية متكاملة لبيئة الأعمال، بدءاً من التخطيط الاستراتيجي لتأسيس الشركات بكافة أنواعها، مروراً بصياغة العقود التجارية المعقّدة، ووصولاً إلى عمليات التعديل الهيكلي والدمج أو التصفية. نضمن لموكلينا الامتثال الكامل للقوانين المنظمة للاستثمار، مع توفير الحماية القانونية اللازمة لنمو واستدامة أعمالهم.",
      en: "We deliver fully integrated legal solutions tailored to the evolving business landscape — beginning with strategic structuring and incorporation of companies across all legal forms. Our services extend to drafting sophisticated commercial agreements and advising on corporate restructuring, mergers, acquisitions, and liquidations. We ensure full compliance with applicable investment regulations while safeguarding our clients' interests, enabling sustainable growth and long-term operational stability.",
    },
  },
  {
    number: 2,
    icon: Scale,
    accent: "text-blue-600 bg-blue-500/10",
    title: { ar: "النزاعات المدنية والتمثيل القضائي", en: "Civil Litigation & Dispute Resolution" },
    intro: {
      ar: "نتولى تمثيل الأفراد والمؤسسات في كافة النزاعات المدنية أمام المحاكم بمختلف درجاتها. نركز على حماية الحقوق والمصالح في قضايا العقود والتعويضات والنزاعات العقارية، مع الالتزام بتقديم استشارات استباقية تهدف إلى حل النزاعات بالطرق الودية أو التحكيم قبل اللجوء للتقاضي الطويل.",
      en: "We represent individuals and corporate entities across all levels of civil litigation before courts and judicial authorities. Our approach prioritizes the protection of rights and commercial interests in contractual disputes, compensation claims, and real estate conflicts. We also provide proactive legal counsel aimed at resolving disputes amicably or through arbitration, minimizing exposure to prolonged litigation and preserving business continuity.",
    },
  },
  {
    number: 3,
    icon: Heart,
    accent: "text-rose-600 bg-rose-500/10",
    title: { ar: "قانون الأسرة والأحوال الشخصية", en: "Family Law & Succession" },
    intro: {
      ar: "نتعامل مع قضايا الأحوال الشخصية بمنتهى السرية والخبرة، خاصة في النزاعات المعقدة التي تشمل أطرافاً أجنبية.",
      en: "We handle family and personal status matters with the utmost discretion and professional sensitivity, particularly in complex cross-border cases involving foreign nationals.",
    },
    points: [
      {
        icon: Landmark,
        title: { ar: "نزاعات الميراث", en: "Inheritance Disputes" },
        body: {
          ar: "تخصص دقيق في حفظ حقوق الورثة الأجانب في ممتلكاتهم وعقاراتهم داخل مصر، استناداً إلى خبرتنا الكبيرة في قوانين المواريث الدولية والمحلية.",
          en: "A specialized practice focused on safeguarding the inheritance rights of foreign heirs in assets and real estate located in Egypt, supported by our extensive expertise in both domestic and international succession laws.",
        },
      },
      {
        icon: Gavel,
        title: { ar: "قضايا الطلاق", en: "Divorce Proceedings" },
        body: {
          ar: "تمثيل الموكلين في نزاعات الطلاق بين الأجانب والمصريين، وما ينتج عنها من دعاوى الطلاق والخلع، مع ضمان تطبيق القانون الأصلح للموكل.",
          en: "Representation in divorce disputes involving Egyptian and foreign parties, including divorce and Khula claims, with careful consideration to ensure the application of the most favorable governing law for our clients.",
        },
      },
      {
        icon: ScrollText,
        title: { ar: "الوصايا", en: "Wills" },
        body: {
          ar: "صياغة وكتابة الوصايا المتعلقة بالرعايا الأجانب وتوثيقها رسمياً لضمان تنفيذها قانونياً وحماية أركانهم.",
          en: "Drafting and formalizing wills for foreign nationals, ensuring proper legal authentication and enforceability to protect estates and succession arrangements.",
        },
      },
      {
        icon: Shield,
        title: { ar: "قضايا الطفل", en: "Child-Related Matters" },
        body: {
          ar: "تولي كافة دعاوى الحضانة، إثبات الحضانة، الرؤية، والنفقة، مع مراعاة مصلحة المحضون الفضلى والاتفاقيات الدولية.",
          en: "Handling custody, guardianship confirmation, visitation rights, and child support claims, with strict adherence to the best interests of the child and applicable international conventions.",
        },
      },
    ],
  },
  {
    number: 4,
    icon: Home,
    accent: "text-emerald-600 bg-emerald-500/10",
    title: { ar: "الخدمات العقارية والاستشارات الاستثمارية", en: "Real Estate & Property Law" },
    intro: {
      ar: "نقدم منظومة متكاملة لضمان أمان استثماراتكم العقارية تشمل:",
      en: "We provide a comprehensive legal framework designed to secure and protect real estate investments, including:",
    },
    points: [
      {
        icon: Search,
        title: { ar: "الفحص النافي للجهالة", en: "Due Diligence" },
        body: {
          ar: "إجراء بحث دقيق وشامل لملكية العقارات والتحري عنها قبل الشراء.",
          en: "Conducting thorough legal investigations and title searches to verify ownership and identify potential risks prior to acquisition.",
        },
      },
      {
        icon: FileSignature,
        title: { ar: "صياغة ومراجعة العقود", en: "Contract Drafting & Review" },
        body: {
          ar: "إعداد العقود باللغتين العربية والإنجليزية لضمان وضوح الحقوق والالتزامات.",
          en: "Preparing and reviewing bilingual agreements in Arabic and English to ensure clarity of rights, obligations, and contractual protections.",
        },
      },
      {
        icon: Stamp,
        title: { ar: "إجراءات نقل الملكية", en: "Transfer of Ownership Procedures" },
        body: {
          ar: "تولي كافة الخطوات الإدارية، بدءاً من توكيلات البيع وصولاً إلى التسجيل النهائي بـ الشهر العقاري.",
          en: "Managing all administrative and legal steps — from drafting powers of attorney to completing final registration before the Real Estate Publicity Department.",
        },
      },
      {
        icon: FileCheck,
        title: { ar: "الدعاوى العقارية", en: "Real Estate Litigation" },
        body: {
          ar: "تمثيل الموكلين في دعاوى صحة ونفاذ العقود وتثبيت الملكية.",
          en: "Representing clients in specific performance claims, contract validation actions, and ownership confirmation disputes.",
        },
      },
    ],
  },
  {
    number: 5,
    icon: Globe,
    accent: "text-indigo-600 bg-indigo-500/10",
    title: { ar: "شؤون الأجانب والخدمات القانونية الدولية", en: "Legal Services & Foreign Investments" },
    intro: {
      ar: "باعتبارنا شريكاً قانونياً موثوقاً في قلب مدينة الغردقة، نمتلك خبرة واسعة في دعم الأجانب والمستثمرين عبر طيف واسع من المعاملات العابرة للحدود:",
      en: "As a trusted legal partner strategically based in Hurghada, we possess extensive expertise in advising and supporting foreign nationals and investors across a broad spectrum of cross-border matters:",
    },
    points: [
      {
        icon: BadgeDollarSign,
        title: { ar: "الاستثمارات الأجنبية", en: "Foreign Investments" },
        body: {
          ar: "تقديم الاستشارات المتكاملة والتمثيل أمام الهيئة العامة للاستثمار (GAFI).",
          en: "Delivering end-to-end legal advisory and representation before the General Authority for Investment (GAFI), ensuring seamless market entry and regulatory alignment.",
        },
      },
      {
        icon: Plane,
        title: { ar: "خدمات الإقامة والجنسية", en: "Residency & Citizenship Services" },
        body: {
          ar: "إنهاء إجراءات تراخيص الإقامة بكافة أنواعها وملفات الجنسية المصرية.",
          en: "Managing and securing all categories of residency permits, as well as Egyptian citizenship applications, with precision and discretion.",
        },
      },
      {
        icon: ScrollText,
        title: { ar: "التمثيل الدبلوماسي", en: "Diplomatic Representation" },
        body: {
          ar: "توفير التقارير القانونية (Briefing Notes) للبعثات الدبلوماسية والقنصليات.",
          en: "Preparing sophisticated legal briefing notes and reports for diplomatic missions and consular authorities.",
        },
      },
      {
        icon: Banknote,
        title: { ar: "الامتثال المالي", en: "Financial Compliance" },
        body: {
          ar: "ضمان مطابقة الاستثمارات والتدفقات المالية للقوانين الضريبية والمصرفية.",
          en: "Ensuring full compliance of investments and financial flows with applicable tax and banking regulations, safeguarding operational integrity and regulatory certainty.",
        },
      },
    ],
  },
  {
    number: 6,
    icon: Anchor,
    accent: "text-cyan-600 bg-cyan-500/10",
    title: { ar: "القانون البحري وخدمات اليخوت", en: "Maritime Law & Yacht Services" },
    intro: {
      ar: "نظراً لموقعنا الاستراتيجي، نقدم دعماً متخصصاً في القطاع البحري والترفيهي:",
      en: "Leveraging our strategic coastal presence, we offer specialized legal support tailored to the maritime and leisure sectors:",
    },
    points: [
      {
        icon: Ship,
        title: { ar: "تسجيل السفن واليخوت", en: "Vessel & Yacht Registration" },
        body: {
          ar: "تولي إجراءات تسجيل اليخوت والقوارب السياحية واستخراج شهادات الصلاحية والملاحة.",
          en: "Overseeing the registration of yachts and tourist vessels, including the issuance of seaworthiness and navigation certificates.",
        },
      },
      {
        icon: Compass,
        title: { ar: "تراخيص الإبحار", en: "Navigation Licenses & Crew Permits" },
        body: {
          ar: "استخراج وتجديد كافة التصاريح وتراخيص أطقم العمل البحرية.",
          en: "Securing and renewing all required navigation licenses and maritime crew authorizations.",
        },
      },
      {
        icon: FileSignature,
        title: { ar: "نقل الملكية والبيوع البحرية", en: "Maritime Transfers & Transactions" },
        body: {
          ar: "صياغة عقود البيع والشراء البحرية وإتمام إجراءات النقل.",
          en: "Structuring and drafting yacht and vessel sale and purchase agreements, and managing title transfer procedures with efficiency and legal precision.",
        },
      },
    ],
  },
  {
    number: 7,
    icon: Shield,
    accent: "text-red-600 bg-red-500/10",
    title: { ar: "القانون الجنائي والتمثيل القضائي", en: "Criminal Law & Defense" },
    intro: {
      ar: "نوفر حماية قانونية حازمة وتمثيلاً قضائياً رفيع المستوى للمصريين والأجانب في كافة القضايا الجنائية:",
      en: "We provide robust legal protection and high-caliber representation to both Egyptian nationals and foreign clients across all areas of criminal law:",
    },
    points: [
      {
        icon: Building,
        title: { ar: "التمثيل أمام أقسام الشرطة", en: "Police Station Representation" },
        body: {
          ar: "الحضور مع الموكل منذ اللحظات الأولى للتحقيق لضمان سلامة الإجراءات القانونية وحماية حقوقه الدستورية.",
          en: "Immediate attendance alongside clients from the earliest stages of investigation, ensuring procedural integrity and the full protection of constitutional rights.",
        },
      },
      {
        icon: ShieldCheck,
        title: { ar: "التحقيقات أمام النيابة العامة", en: "Public Prosecution Proceedings" },
        body: {
          ar: "تولي الدفاع وتقديم الدفوع القانونية والمذكرات الفنية خلال مراحل التحقيق في مختلف الجرائم والجنايات.",
          en: "Leading the defense throughout prosecution investigations, submitting strategic legal arguments and technical memoranda across a wide range of offenses and felonies.",
        },
      },
      {
        icon: Gavel,
        title: { ar: "المحاكم الجنائية", en: "Criminal Court Advocacy" },
        body: {
          ar: "الدفاع عن الموكلين أمام محاكم الجنايات والجنح بمختلف درجاتها، مع خبرة خاصة في القضايا الجنائية التي يكون أطرافها أجانب، لضمان محاكمة عادلة وتقديم دفاع قانوني متين.",
          en: "Representing clients before misdemeanor and felony courts at all levels, with particular expertise in cases involving foreign nationals, ensuring fair trial standards and delivering a rigorous, well-structured defense.",
        },
      },
    ],
  },
];

/* ────────────────────────────────────────────── */

export default function Services() {
  const { language, t, isRtl } = useLanguage();
  const { data: services, isLoading } = useListServices();
  const { data: apiPracticeAreas } = useListPracticeAreas();
  const Arrow = isRtl ? ArrowLeft : ArrowRight;
  const lang = language as "ar" | "en";

  /* Slug → display order, mirrors PRACTICE_AREAS sort. */
  const AREA_ORDER: Record<string, number> = {
    "corporate-commercial":   0,
    "civil-litigation":       1,
    "family-personal-status": 2,
    "real-estate":            3,
    "foreign-investments":    4,
    "maritime-yacht":         5,
    "criminal-defense":       6,
  };

  type ServiceItem = NonNullable<typeof services>[number];
  /* Group bookable services by their practice-area slug so we can render
     them as labelled clusters (matches the 7 practice-area structure of
     the company profile). Falls back to "Other" for services without an
     area. */
  const groupedServices = (() => {
    if (!services?.length) {
      return [] as Array<{
        slug: string;
        title: { ar: string; en: string };
        items: ServiceItem[];
      }>;
    }
    const areaById = new Map(
      (apiPracticeAreas ?? []).map((a) => [a.id, a]),
    );
    const buckets = new Map<
      string,
      { slug: string; title: { ar: string; en: string }; items: ServiceItem[] }
    >();
    for (const s of services) {
      const area = s.practiceAreaId ? areaById.get(s.practiceAreaId) : null;
      const slug = area?.slug ?? "other";
      const title = area
        ? { ar: area.nameAr, en: area.nameEn }
        : { ar: "خدمات أخرى", en: "Other Services" };
      const bucket = buckets.get(slug);
      if (bucket) bucket.items.push(s);
      else buckets.set(slug, { slug, title, items: [s] });
    }
    return Array.from(buckets.values()).sort((a, b) => {
      return (AREA_ORDER[a.slug] ?? 99) - (AREA_ORDER[b.slug] ?? 99);
    });
  })();

  return (
    <div className="min-h-screen bg-background">
      {/* ──────────────── Hero ──────────────── */}
      <section className="relative overflow-hidden bg-site-deep text-white">
        <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(ellipse_at_top,white,transparent_60%)]" aria-hidden />
        <div className="container px-4 mx-auto py-20 md:py-28 max-w-4xl relative">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur text-xs font-medium tracking-widest uppercase text-white/80 mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            {language === "ar" ? "خدماتنا القانونية" : "Our Legal Services"}
          </span>
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-5 tracking-tight">
            {language === "ar" ? "مجالات الاختصاص" : "Our Practice Areas"}
          </h1>
          <p className="text-base md:text-lg text-white/70 leading-relaxed max-w-2xl">
            {language === "ar"
              ? "سبعة مجالات رئيسية تغطي احتياجات الأفراد والشركات والمستثمرين الأجانب، يقدّمها فريق متعدد الخبرات بمعايير دولية رفيعة."
              : "Seven core practice areas covering the needs of individuals, corporations, and foreign investors — delivered by a multidisciplinary team to international standards."}
          </p>
        </div>
      </section>

      {/* ──────────────── Practice Areas Index ──────────────── */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container px-4 mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4">
            {PRACTICE_AREAS.map((p) => {
              const Icon = p.icon;
              return (
                <a
                  key={p.number}
                  href={`#area-${p.number}`}
                  className="group flex flex-col items-center text-center gap-3 p-4 rounded-xl border border-border/60 bg-card hover:border-accent/40 hover:shadow-md transition-all"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${p.accent}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-muted-foreground mb-1">
                      {String(p.number).padStart(2, "0")}
                    </div>
                    <div className="text-xs font-semibold text-foreground leading-tight group-hover:text-accent transition-colors">
                      {p.title[lang]}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* ──────────────── Practice Areas Detail ──────────────── */}
      <section className="bg-muted/20 border-y border-border/60">
        <div className="container px-4 mx-auto max-w-6xl py-16 md:py-20 space-y-16 md:space-y-20">
          {PRACTICE_AREAS.map((area) => {
            const Icon = area.icon;
            return (
              <article
                key={area.number}
                id={`area-${area.number}`}
                className="scroll-mt-24"
              >
                {/* Header */}
                <div className="flex items-start gap-4 md:gap-5 mb-6">
                  <div className={`shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center ${area.accent}`}>
                    <Icon className="w-7 h-7 md:w-8 md:h-8" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-mono tracking-widest text-muted-foreground mb-1">
                      {language === "ar" ? `المجال ${String(area.number).padStart(2, "0")}` : `AREA ${String(area.number).padStart(2, "0")}`}
                    </div>
                    <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground leading-tight">
                      {area.title[lang]}
                    </h2>
                  </div>
                </div>

                {/* Intro paragraph */}
                <p className="text-muted-foreground leading-relaxed text-[15px] mb-6 max-w-4xl">
                  {area.intro[lang]}
                </p>

                {/* Sub-points (if any) */}
                {area.points && (
                  <div className={`grid gap-4 md:gap-5 ${
                    area.points.length === 3
                      ? "grid-cols-1 md:grid-cols-3"
                      : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
                  }`}>
                    {area.points.map((sp, i) => {
                      const SIcon = sp.icon;
                      return (
                        <div
                          key={i}
                          className="bg-card rounded-xl border border-border/50 p-5 hover:border-accent/40 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-lg bg-primary/8 text-primary flex items-center justify-center shrink-0">
                              <SIcon className="w-4 h-4" />
                            </div>
                            <h3 className="font-bold text-sm text-foreground leading-tight">
                              {sp.title[lang]}
                            </h3>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {sp.body[lang]}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* ──────────────── Bookable Services (dynamic from API) ──────────────── */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container px-4 mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-10 md:mb-14">
            <span className="inline-block text-xs font-semibold tracking-widest uppercase text-accent mb-3">
              {language === "ar" ? "احجز الآن" : "Book a Consultation"}
            </span>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              {language === "ar" ? "استشارات قانونية متخصصة" : "Specialized Legal Consultations"}
            </h2>
            <p className="text-muted-foreground">
              {language === "ar"
                ? "اختر نوع الاستشارة المناسبة واحجز موعداً مع أحد محامينا المتخصصين."
                : "Pick the type of consultation that fits your case and book a time with one of our specialists."}
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="overflow-hidden border-border h-full">
                  <CardHeader className="bg-muted/50 pb-4">
                    <Skeleton className="h-6 w-2/3" />
                  </CardHeader>
                  <CardContent className="p-6">
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-5/6 mb-6" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !services || services.length === 0 ? (
            <div className="text-center py-12 px-6 bg-muted/30 rounded-2xl border border-border/40 max-w-xl mx-auto">
              <CalendarCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">
                {language === "ar"
                  ? "لا توجد استشارات قابلة للحجز حالياً، تواصل معنا مباشرة لتنسيق موعد."
                  : "No bookable consultations available right now — please contact us directly to arrange a meeting."}
              </p>
              <Link href="/contact">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-white">
                  {language === "ar" ? "تواصل معنا" : "Contact us"}
                  <Arrow className="w-4 h-4 ms-2" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-12 md:space-y-14">
              {groupedServices.map((group) => (
                <div key={group.slug}>
                  <div className="flex items-center gap-3 mb-5 md:mb-6">
                    <div className="h-px flex-1 bg-border/60" />
                    <h3 className="text-lg md:text-xl font-serif font-bold text-foreground px-2 text-center shrink-0">
                      {group.title[lang]}
                    </h3>
                    <div className="h-px flex-1 bg-border/60" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {group.items.map((service) => (
                      <Link key={service.id} href={`/services/${service.id}`} className="group h-full flex">
                        <Card className="overflow-hidden border-border hover:shadow-lg hover:border-accent/50 transition-all w-full flex flex-col">
                          <CardHeader className="bg-muted/30 pb-4 group-hover:bg-muted/60 transition-colors border-b border-border/50">
                            <CardTitle className="text-lg md:text-xl font-serif font-bold group-hover:text-accent transition-colors leading-snug">
                              {language === "ar" ? service.nameAr : service.nameEn}
                            </CardTitle>
                            <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-muted-foreground mt-3">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {service.durationMinutes} {language === "ar" ? "دقيقة" : "min"}
                              </span>
                              {Number(service.priceEgp) > 0 && (
                                <span className="inline-flex items-center gap-1 text-accent">
                                  <Tag className="w-3 h-3" />
                                  {Number(service.priceEgp).toLocaleString(
                                    language === "ar" ? "ar-EG" : "en-US",
                                  )}{" "}
                                  {language === "ar" ? "ج.م" : "EGP"}
                                </span>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="p-6 flex-1 flex flex-col">
                            <p className="text-muted-foreground mb-6 line-clamp-3 text-sm">
                              {language === "ar" ? service.descriptionAr : service.descriptionEn}
                            </p>
                            <div className="mt-auto flex items-center justify-between font-medium">
                              <span className="text-sm text-foreground group-hover:text-accent transition-colors">
                                {t("common.readMore")}
                              </span>
                              <Arrow className="w-4 h-4 text-accent" />
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ──────────────── Final CTA Strip ──────────────── */}
      <section className="py-14 bg-site-deep text-white">
        <div className="container px-4 mx-auto max-w-5xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-start">
            <div>
              <h3 className="text-xl md:text-2xl font-serif font-bold mb-2">
                {language === "ar" ? "هل تحتاج استشارة فورية؟" : "Need urgent legal assistance?"}
              </h3>
              <p className="text-white/70 text-sm">
                {language === "ar"
                  ? "فريقنا متاح لمساعدتك في أي وقت — احجز موعداً أو راسلنا مباشرة."
                  : "Our team is ready to help any time — book a slot or send us a message directly."}
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/book">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-white">
                  {language === "ar" ? "احجز استشارة" : "Book Consultation"}
                  <Arrow className="w-4 h-4 ms-2" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white">
                  {language === "ar" ? "تواصل معنا" : "Contact us"}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

