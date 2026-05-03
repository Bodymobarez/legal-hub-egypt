import { eq } from "drizzle-orm";
import {
  db,
  pool,
  adminUsersTable,
  siteSettingsTable,
  practiceAreasTable,
  lawyersTable,
  servicesTable,
  testimonialsTable,
  faqsTable,
  legalCategoriesTable,
  legalArticlesTable,
  blogPostsTable,
} from "@workspace/db";
import { scryptSync, randomBytes } from "node:crypto";

function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

async function upsertAdmin() {
  /* Platform-owner credentials for the Legal Hub Control Plane.
     The earlier seed used `admin@egypt-advocates.com`; keep it as a
     fallback lookup so existing databases get migrated to the new
     identity in-place rather than ending up with two super_admin
     rows. */
  const email = "super@adsolution-eg.com";
  const legacyEmail = "admin@egypt-advocates.com";
  const password = process.env.ADMIN_PASSWORD ?? "Admin@123";
  const passwordHash = hashPassword(password);
  const name = "Platform Owner";

  /* 1. New email already present? Just refresh the password. */
  const [existingNew] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.email, email));
  if (existingNew) {
    await db
      .update(adminUsersTable)
      .set({ passwordHash, name, role: "super_admin" })
      .where(eq(adminUsersTable.id, existingNew.id));
    console.log(`Updated super admin: ${email}`);
    return;
  }

  /* 2. Otherwise try to migrate the legacy super_admin user (rename
        in place to keep their id, audit log links, etc.). */
  const [legacy] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.email, legacyEmail));
  if (legacy) {
    await db
      .update(adminUsersTable)
      .set({ email, passwordHash, name, role: "super_admin" })
      .where(eq(adminUsersTable.id, legacy.id));
    console.log(`Renamed super admin: ${legacyEmail} → ${email}`);
    return;
  }

  /* 3. Fresh install — create from scratch. */
  await db.insert(adminUsersTable).values({
    email,
    passwordHash,
    name,
    role: "super_admin",
  });
  console.log(`Created super admin: ${email}`);
}

async function upsertSetting(key: string, value: unknown) {
  const [existing] = await db
    .select()
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, key));
  if (existing) {
    await db
      .update(siteSettingsTable)
      .set({ value: value as object, updatedAt: new Date() })
      .where(eq(siteSettingsTable.key, key));
  } else {
    await db.insert(siteSettingsTable).values({ key, value: value as object });
  }
}

async function seedSiteSettings() {
  await upsertSetting("site_info", {
    nameAr: "Egypt Advocates",
    nameEn: "Egypt Advocates",
    taglineAr: "حلول قانونية قابلة للتنفيذ",
    taglineEn: "Actionable Legal Solutions",
    addressAr: "الكوثر الجديد - منطقة البنوك - امام HSBC - أعلي بست واي - الدور الرابع - مكتب ٢١ - الغردقة",
    addressEn: "Al Kawthar Al Jadid District / Banking Area / In front of HSBC / Above Best Way / 4th Floor / Office No. 21 - Hurghada",
    phone: "+2 0122 7655 853",
    whatsapp: "+20122 7655853",
    email: "info@egyptadvocates.com",
    website: "www.egyptadvocates.com",
    established: 2008,
  });
  await upsertSetting("work_hours", [
    { dayOfWeek: 0, openTime: "10:00", closeTime: "18:00" },
    { dayOfWeek: 1, openTime: "10:00", closeTime: "18:00" },
    { dayOfWeek: 2, openTime: "10:00", closeTime: "18:00" },
    { dayOfWeek: 3, openTime: "10:00", closeTime: "18:00" },
    { dayOfWeek: 4, openTime: "10:00", closeTime: "16:00" },
    { dayOfWeek: 5, openTime: "00:00", closeTime: "00:00", isClosed: true },
    { dayOfWeek: 6, openTime: "11:00", closeTime: "16:00" },
  ]);
  await upsertSetting("social", {
    facebook: "https://facebook.com/egypt-advocates",
    instagram: "https://instagram.com/egypt-advocates",
    twitter: null,
    linkedin: "https://linkedin.com/company/egypt-advocates",
    youtube: null,
  });
  await upsertSetting("site_stats", {
    casesHandled: 1500,
    satisfiedClients: 1200,
    yearsOfExperience: 18,
    successRate: 96,
  });
  console.log("Seeded site settings");
}

/* The 7 practice areas mirror the canonical Egypt Advocates company profile
   PDF (AR + EN). Order, names and descriptions match the printed brochure. */
const PRACTICE_AREAS = [
  {
    slug: "corporate-commercial",
    nameAr: "القانون التجاري وتأسيس الشركات",
    nameEn: "Corporate & Commercial Law",
    descriptionAr:
      "حلول قانونية متكاملة لبيئة الأعمال: تأسيس الشركات، صياغة العقود التجارية المعقّدة، التعديل الهيكلي والدمج والاستحواذ والتصفية، مع ضمان الامتثال الكامل لقوانين الاستثمار.",
    descriptionEn:
      "Fully integrated legal solutions for the business environment: incorporation, sophisticated commercial agreements, corporate restructuring, M&A and liquidation — with full investment-law compliance.",
    icon: "Briefcase",
    sortOrder: 1,
  },
  {
    slug: "civil-litigation",
    nameAr: "النزاعات المدنية والتمثيل القضائي",
    nameEn: "Civil Litigation & Dispute Resolution",
    descriptionAr:
      "تمثيل الأفراد والمؤسسات في كافة النزاعات المدنية أمام المحاكم بمختلف درجاتها، مع استشارات استباقية لحل النزاعات بالطرق الودية أو التحكيم.",
    descriptionEn:
      "Representing individuals and corporates across all levels of civil litigation, with proactive counsel aimed at amicable resolution or arbitration.",
    icon: "Scale",
    sortOrder: 2,
  },
  {
    slug: "family-personal-status",
    nameAr: "قانون الأسرة والأحوال الشخصية",
    nameEn: "Family Law & Succession",
    descriptionAr:
      "تخصص دقيق في قضايا الميراث والطلاق والوصايا والحضانة بمنتهى السرية، خاصة في الملفات المعقدة التي تشمل أطرافاً أجنبية.",
    descriptionEn:
      "A discreet specialized practice in inheritance, divorce, wills and child-custody matters — particularly complex cross-border cases involving foreign nationals.",
    icon: "Heart",
    sortOrder: 3,
  },
  {
    slug: "real-estate",
    nameAr: "الخدمات العقارية والاستشارات الاستثمارية",
    nameEn: "Real Estate & Property Law",
    descriptionAr:
      "منظومة متكاملة لتأمين الاستثمارات العقارية: الفحص النافي للجهالة، صياغة ومراجعة العقود ثنائية اللغة، إجراءات نقل الملكية في الشهر العقاري، والدعاوى العقارية.",
    descriptionEn:
      "A comprehensive framework to secure real-estate investments: due diligence, bilingual contract drafting, transfer-of-ownership procedures with the Real Estate Publicity Department, and litigation.",
    icon: "Home",
    sortOrder: 4,
  },
  {
    slug: "foreign-investments",
    nameAr: "شؤون الأجانب والخدمات القانونية الدولية",
    nameEn: "Legal Services & Foreign Investments",
    descriptionAr:
      "شريك قانوني موثوق للأجانب والمستثمرين: التمثيل أمام GAFI، تراخيص الإقامة وملفات الجنسية، التقارير القانونية للبعثات الدبلوماسية، والامتثال المالي.",
    descriptionEn:
      "Trusted legal partner for foreign nationals and investors: GAFI representation, residency permits and citizenship files, diplomatic briefing notes, and financial compliance.",
    icon: "Globe",
    sortOrder: 5,
  },
  {
    slug: "maritime-yacht",
    nameAr: "القانون البحري وخدمات اليخوت",
    nameEn: "Maritime Law & Yacht Services",
    descriptionAr:
      "دعم قانوني متخصص في القطاع البحري والترفيهي: تسجيل اليخوت والقوارب، تراخيص الإبحار وأطقم العمل، وعقود البيع والشراء البحرية.",
    descriptionEn:
      "Specialized legal support for the maritime and leisure sectors: yacht and vessel registration, navigation and crew permits, and maritime sale and purchase agreements.",
    icon: "Anchor",
    sortOrder: 6,
  },
  {
    slug: "criminal-defense",
    nameAr: "القانون الجنائي والتمثيل القضائي",
    nameEn: "Criminal Law & Defense",
    descriptionAr:
      "حماية قانونية حازمة وتمثيل قضائي رفيع المستوى للمصريين والأجانب: التمثيل أمام أقسام الشرطة، التحقيقات أمام النيابة العامة، والمحاكم الجنائية.",
    descriptionEn:
      "Robust legal protection and high-caliber representation for Egyptian and foreign clients: police-station attendance, public-prosecution defense, and advocacy before criminal courts.",
    icon: "Shield",
    sortOrder: 7,
  },
];

/* Practice areas that used to be seeded but are no longer part of the
   canonical company-profile lineup. We deactivate them in place rather
   than deleting, so existing services / appointments keep their FK. */
const RETIRED_PRACTICE_AREA_SLUGS = [
  "labor-employment",
  "tax-law",
  "intellectual-property",
  "arbitration-mediation",
  "immigration",
];

async function seedPracticeAreas() {
  const newSlugs = new Set(PRACTICE_AREAS.map((a) => a.slug));
  for (const a of PRACTICE_AREAS) {
    const [existing] = await db
      .select()
      .from(practiceAreasTable)
      .where(eq(practiceAreasTable.slug, a.slug));
    if (existing) {
      await db
        .update(practiceAreasTable)
        .set({ ...a, isActive: true })
        .where(eq(practiceAreasTable.id, existing.id));
    } else {
      await db.insert(practiceAreasTable).values(a);
    }
  }
  // Soft-retire any area that is no longer in the canonical list.
  for (const slug of RETIRED_PRACTICE_AREA_SLUGS) {
    if (newSlugs.has(slug)) continue;
    await db
      .update(practiceAreasTable)
      .set({ isActive: false })
      .where(eq(practiceAreasTable.slug, slug));
  }
  console.log(
    `Seeded ${PRACTICE_AREAS.length} practice areas (retired ${RETIRED_PRACTICE_AREA_SLUGS.length})`,
  );
}

const LAWYERS = [
  {
    slug: "mohamed-osaman",
    nameAr: "محمد أ. عثمان",
    nameEn: "Mohamed A. Osaman",
    titleAr: "المؤسس والمحامي الإداري",
    titleEn: "Founding Partner & Managing Attorney",
    bioAr:
      "محام أمام محكمة النقض، يتمتع بأكثر من 18 عاماً من الخبرة في قضايا الشركات والقانون التجاري والقضايا المدنية الكبرى. حاصل على ماجستير في القانون الدولي من جامعة القاهرة.",
    bioEn:
      "Attorney before the Court of Cassation with over 18 years of experience in corporate, commercial, and major civil cases. Master's in International Law from Cairo University.",
    photoUrl:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=facearea&facepad=3&w=480&h=480&q=80",
    email: "m.osaman@egypt-advocates.com",
    phone: "+20 100 555 7701",
    specializations: ["Corporate", "Civil Litigation", "Arbitration"],
    yearsExperience: 18,
    sortOrder: 1,
  },
  {
    slug: "amira-hassan",
    nameAr: "أميرة حسن",
    nameEn: "Amira Hassan",
    titleAr: "شريك أول — قانون الأسرة",
    titleEn: "Senior Partner — Family Law",
    bioAr:
      "متخصصة في قضايا الأحوال الشخصية وحماية حقوق المرأة والطفل، مع خبرة 14 عاماً أمام محاكم الأسرة على مستوى الجمهورية.",
    bioEn:
      "Specialized in personal status cases and the protection of women's and children's rights, with 14 years of experience before family courts nationwide.",
    photoUrl:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=facearea&facepad=3&w=480&h=480&q=80",
    email: "a.hassan@egypt-advocates.com",
    phone: "+20 100 555 7702",
    specializations: ["Family Law", "Personal Status", "Inheritance"],
    yearsExperience: 14,
    sortOrder: 2,
  },
  {
    slug: "khaled-saad",
    nameAr: "خالد سعد",
    nameEn: "Khaled Saad",
    titleAr: "شريك — القانون الجنائي",
    titleEn: "Partner — Criminal Defense",
    bioAr:
      "محام جنائي بارز مع 12 عاماً من الخبرة في الدفاع عن قضايا جنائية كبرى، عرف بدقته في تحليل الأدلة والمرافعات.",
    bioEn:
      "Distinguished criminal attorney with 12 years of experience defending major criminal cases, known for forensic precision and oratory.",
    photoUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=3&w=480&h=480&q=80",
    email: "k.saad@egypt-advocates.com",
    phone: "+20 100 555 7703",
    specializations: ["Criminal Defense", "Appeals", "White Collar"],
    yearsExperience: 12,
    sortOrder: 3,
  },
  {
    slug: "noura-fathy",
    nameAr: "نورا فتحي",
    nameEn: "Noura Fathy",
    titleAr: "محامية أولى — العقارات والاستثمار",
    titleEn: "Senior Associate — Real Estate & Investment",
    bioAr:
      "متخصصة في تسجيل العقارات والاستثمار العقاري، وعقود البيع والتطوير العقاري للمشروعات الكبرى.",
    bioEn:
      "Specialized in real estate registration, real estate investment, and sale and development contracts for major projects.",
    photoUrl:
      "https://images.unsplash.com/photo-1573497019418-b400bb3ab074?auto=format&fit=facearea&facepad=3&w=480&h=480&q=80",
    email: "n.fathy@egypt-advocates.com",
    phone: "+20 100 555 7704",
    specializations: ["Real Estate", "Investment", "Contracts"],
    yearsExperience: 10,
    sortOrder: 4,
  },
];

async function seedLawyers() {
  for (const l of LAWYERS) {
    const [existing] = await db
      .select()
      .from(lawyersTable)
      .where(eq(lawyersTable.slug, l.slug));
    if (!existing) await db.insert(lawyersTable).values(l);
  }
  console.log(`Seeded ${LAWYERS.length} lawyers`);
}

async function seedServices() {
  const areas = await db.select().from(practiceAreasTable);
  const areaBySlug = new Map(areas.map((a) => [a.slug, a]));
  const requireArea = (slug: string) => {
    const a = areaBySlug.get(slug);
    if (!a) throw new Error(`Practice area '${slug}' must exist before seeding services.`);
    return a.id;
  };

  /* The bookable services mirror the sub-services laid out in the official
     Egypt Advocates company profile, grouped under the 7 practice areas. */
  const services = [
    /* ─── 1. Corporate & Commercial Law ─────────────────────────────── */
    {
      slug: "corporate-formation",
      nameAr: "تأسيس الشركات",
      nameEn: "Company Formation",
      descriptionAr:
        "تأسيس كامل لشركات بكافة أنواعها (ش.م.م / ش.م.م.م / ش.م) مع كافة المستندات والتسجيل في السجل التجاري والضرائب والاستثمار.",
      descriptionEn:
        "Full incorporation across all corporate forms (LLC / JSC / SAE) with paperwork and registration before the commercial registry, tax authority and GAFI.",
      durationMinutes: 60,
      priceEgp: "5000",
      deliveryMode: "both",
      practiceAreaId: requireArea("corporate-commercial"),
    },
    {
      slug: "contract-drafting-review",
      nameAr: "صياغة ومراجعة العقود التجارية",
      nameEn: "Commercial Contract Drafting & Review",
      descriptionAr:
        "صياغة أو مراجعة دقيقة للعقود التجارية المعقّدة باللغتين العربية والإنجليزية مع ضمان وضوح الحقوق والالتزامات.",
      descriptionEn:
        "Bilingual drafting or detailed review of sophisticated commercial agreements ensuring clarity of rights and obligations.",
      durationMinutes: 90,
      priceEgp: "2500",
      deliveryMode: "both",
      practiceAreaId: requireArea("corporate-commercial"),
    },
    {
      slug: "corporate-restructuring-ma",
      nameAr: "إعادة الهيكلة والاستحواذ والاندماج",
      nameEn: "Corporate Restructuring & M&A",
      descriptionAr:
        "استشارات إعادة الهيكلة، الدمج، الاستحواذ، والتصفية مع الامتثال الكامل لقوانين الاستثمار وحماية مصالح الموكلين.",
      descriptionEn:
        "Advisory on restructuring, mergers, acquisitions and liquidations with full investment-law compliance and client-interest protection.",
      durationMinutes: 90,
      priceEgp: "6000",
      deliveryMode: "both",
      practiceAreaId: requireArea("corporate-commercial"),
    },

    /* ─── 2. Civil Litigation & Dispute Resolution ──────────────────── */
    {
      slug: "general-legal-consultation",
      nameAr: "استشارة قانونية عامة",
      nameEn: "General Legal Consultation",
      descriptionAr:
        "جلسة استشارية لمدة 45 دقيقة لمناقشة موقفك القانوني وعرض الخيارات المتاحة بدقة.",
      descriptionEn:
        "A 45-minute consultation session to discuss your legal position and review the available options.",
      durationMinutes: 45,
      priceEgp: "750",
      deliveryMode: "both",
      practiceAreaId: requireArea("civil-litigation"),
    },
    {
      slug: "civil-litigation-representation",
      nameAr: "تمثيل قضائي في النزاعات المدنية",
      nameEn: "Civil Litigation Representation",
      descriptionAr:
        "تمثيلك أمام المحاكم بمختلف درجاتها في قضايا العقود والتعويضات والنزاعات العقارية مع حماية حقوقك ومصالحك.",
      descriptionEn:
        "Representation before courts at all levels in contractual, compensation and real-estate disputes — with full protection of your rights.",
      durationMinutes: 60,
      priceEgp: "3000",
      deliveryMode: "both",
      practiceAreaId: requireArea("civil-litigation"),
    },
    {
      slug: "arbitration-adr-counsel",
      nameAr: "التحكيم وحل النزاعات بالطرق البديلة",
      nameEn: "Arbitration & ADR Counsel",
      descriptionAr:
        "استشارة استباقية لحل النزاعات بالطرق الودية أو التحكيم قبل اللجوء للتقاضي الطويل.",
      descriptionEn:
        "Proactive counsel for amicable settlement or arbitration to avoid prolonged court litigation.",
      durationMinutes: 60,
      priceEgp: "4500",
      deliveryMode: "both",
      practiceAreaId: requireArea("civil-litigation"),
    },

    /* ─── 3. Family Law & Succession ────────────────────────────────── */
    {
      slug: "inheritance-disputes-consultation",
      nameAr: "نزاعات الميراث وحقوق الورثة الأجانب",
      nameEn: "Inheritance Disputes Consultation",
      descriptionAr:
        "حفظ حقوق الورثة الأجانب في ممتلكاتهم وعقاراتهم داخل مصر استناداً إلى قوانين المواريث الدولية والمحلية.",
      descriptionEn:
        "Safeguarding the inheritance rights of foreign heirs in assets and real estate located in Egypt under both domestic and international succession laws.",
      durationMinutes: 60,
      priceEgp: "2000",
      deliveryMode: "both",
      practiceAreaId: requireArea("family-personal-status"),
    },
    {
      slug: "divorce-consultation",
      nameAr: "استشارة طلاق وخلع",
      nameEn: "Divorce & Khula Consultation",
      descriptionAr:
        "استشارة سرية في نزاعات الطلاق بين الأجانب والمصريين، ودعاوى الطلاق والخلع، مع ضمان تطبيق القانون الأصلح للموكل.",
      descriptionEn:
        "Confidential consultation on divorce disputes between Egyptian and foreign parties, including divorce and Khula claims, with the most favorable governing law applied.",
      durationMinutes: 60,
      priceEgp: "1200",
      deliveryMode: "both",
      practiceAreaId: requireArea("family-personal-status"),
    },
    {
      slug: "will-drafting-authentication",
      nameAr: "صياغة وتوثيق الوصايا",
      nameEn: "Will Drafting & Authentication",
      descriptionAr:
        "صياغة وكتابة الوصايا للرعايا الأجانب وتوثيقها رسمياً لضمان تنفيذها قانونياً وحماية أركانهم.",
      descriptionEn:
        "Drafting and formal authentication of wills for foreign nationals to ensure proper legal enforceability and estate protection.",
      durationMinutes: 45,
      priceEgp: "1500",
      deliveryMode: "both",
      practiceAreaId: requireArea("family-personal-status"),
    },
    {
      slug: "child-custody-consultation",
      nameAr: "قضايا الحضانة والنفقة",
      nameEn: "Custody & Child-Related Matters",
      descriptionAr:
        "تولي دعاوى الحضانة وإثباتها والرؤية والنفقة مع مراعاة مصلحة المحضون الفضلى والاتفاقيات الدولية.",
      descriptionEn:
        "Handling custody, guardianship confirmation, visitation and child support claims, observing the child's best interests and international conventions.",
      durationMinutes: 60,
      priceEgp: "1800",
      deliveryMode: "both",
      practiceAreaId: requireArea("family-personal-status"),
    },

    /* ─── 4. Real Estate & Property Law ─────────────────────────────── */
    {
      slug: "real-estate-due-diligence",
      nameAr: "الفحص النافي للجهالة للعقارات",
      nameEn: "Real Estate Due Diligence",
      descriptionAr:
        "إجراء بحث دقيق وشامل لملكية العقار والتحري عنه قبل الشراء لتجنب أي مخاطر قانونية.",
      descriptionEn:
        "Thorough title-search and legal investigation on a property prior to acquisition, identifying potential risks early.",
      durationMinutes: 60,
      priceEgp: "2500",
      deliveryMode: "both",
      practiceAreaId: requireArea("real-estate"),
    },
    {
      slug: "real-estate-contract-drafting",
      nameAr: "صياغة ومراجعة العقود العقارية",
      nameEn: "Real Estate Contract Drafting",
      descriptionAr:
        "إعداد العقود العقارية باللغتين العربية والإنجليزية لضمان وضوح الحقوق والالتزامات.",
      descriptionEn:
        "Bilingual drafting and review of real-estate agreements to ensure clarity of rights, obligations and contractual protections.",
      durationMinutes: 90,
      priceEgp: "2500",
      deliveryMode: "both",
      practiceAreaId: requireArea("real-estate"),
    },
    {
      slug: "real-estate-registration",
      nameAr: "نقل الملكية والتسجيل بالشهر العقاري",
      nameEn: "Property Transfer & Registration",
      descriptionAr:
        "تولي كافة الخطوات الإدارية بدءاً من توكيلات البيع وصولاً إلى التسجيل النهائي بالشهر العقاري وإصدار صحيفة الملكية.",
      descriptionEn:
        "Managing every administrative step — from sale powers of attorney to final registration before the Real Estate Publicity Department and issuance of the title deed.",
      durationMinutes: 60,
      priceEgp: "3500",
      deliveryMode: "in_office",
      practiceAreaId: requireArea("real-estate"),
    },
    {
      slug: "real-estate-litigation",
      nameAr: "الدعاوى العقارية",
      nameEn: "Real Estate Litigation",
      descriptionAr:
        "تمثيل الموكلين في دعاوى صحة ونفاذ العقود وتثبيت الملكية وحماية الاستثمار العقاري.",
      descriptionEn:
        "Representing clients in specific-performance claims, contract-validation actions and ownership-confirmation disputes.",
      durationMinutes: 60,
      priceEgp: "3500",
      deliveryMode: "both",
      practiceAreaId: requireArea("real-estate"),
    },

    /* ─── 5. Legal Services & Foreign Investments ──────────────────── */
    {
      slug: "gafi-investment-advisory",
      nameAr: "استشارات الاستثمار والتمثيل أمام GAFI",
      nameEn: "Foreign Investment Advisory (GAFI)",
      descriptionAr:
        "تقديم الاستشارات المتكاملة والتمثيل أمام الهيئة العامة للاستثمار (GAFI) لضمان دخول السوق بسلاسة وامتثال تنظيمي كامل.",
      descriptionEn:
        "End-to-end advisory and representation before the General Authority for Investment (GAFI), ensuring seamless market entry and regulatory alignment.",
      durationMinutes: 60,
      priceEgp: "5000",
      deliveryMode: "both",
      practiceAreaId: requireArea("foreign-investments"),
    },
    {
      slug: "residency-permit-application",
      nameAr: "ملف الإقامة وتراخيصها",
      nameEn: "Residency Permit Application",
      descriptionAr:
        "إنهاء إجراءات تراخيص الإقامة بكافة أنواعها للأجانب بدقة ومتابعة كاملة.",
      descriptionEn:
        "Securing all categories of residency permits for foreign nationals — from initial application through final issuance.",
      durationMinutes: 45,
      priceEgp: "2500",
      deliveryMode: "both",
      practiceAreaId: requireArea("foreign-investments"),
    },
    {
      slug: "egyptian-citizenship-application",
      nameAr: "ملفات الجنسية المصرية",
      nameEn: "Egyptian Citizenship Application",
      descriptionAr:
        "إعداد ومتابعة ملفات الجنسية المصرية بدقة وسرية للأجانب المؤهلين.",
      descriptionEn:
        "Preparing and tracking Egyptian citizenship files with precision and discretion for eligible foreign nationals.",
      durationMinutes: 60,
      priceEgp: "7500",
      deliveryMode: "in_office",
      practiceAreaId: requireArea("foreign-investments"),
    },
    {
      slug: "diplomatic-briefing-notes",
      nameAr: "تقارير قانونية للبعثات الدبلوماسية",
      nameEn: "Diplomatic / Consular Briefing Notes",
      descriptionAr:
        "إعداد تقارير قانونية متخصصة (Briefing Notes) للبعثات الدبلوماسية والقنصليات والامتثال المالي للاستثمارات.",
      descriptionEn:
        "Sophisticated legal briefing notes for diplomatic missions and consular authorities, plus financial-compliance opinions for investment flows.",
      durationMinutes: 60,
      priceEgp: "4500",
      deliveryMode: "both",
      practiceAreaId: requireArea("foreign-investments"),
    },

    /* ─── 6. Maritime Law & Yacht Services ─────────────────────────── */
    {
      slug: "yacht-vessel-registration",
      nameAr: "تسجيل اليخوت والسفن",
      nameEn: "Yacht & Vessel Registration",
      descriptionAr:
        "تولي إجراءات تسجيل اليخوت والقوارب السياحية واستخراج شهادات الصلاحية والملاحة.",
      descriptionEn:
        "End-to-end registration of yachts and tourist vessels, including issuance of seaworthiness and navigation certificates.",
      durationMinutes: 60,
      priceEgp: "4500",
      deliveryMode: "in_office",
      practiceAreaId: requireArea("maritime-yacht"),
    },
    {
      slug: "navigation-license-permits",
      nameAr: "تراخيص الإبحار وأطقم العمل",
      nameEn: "Navigation License & Crew Permits",
      descriptionAr:
        "استخراج وتجديد كافة التصاريح وتراخيص أطقم العمل البحرية بسرعة ودقة.",
      descriptionEn:
        "Issuance and renewal of all required navigation licenses and maritime crew authorizations.",
      durationMinutes: 45,
      priceEgp: "2500",
      deliveryMode: "in_office",
      practiceAreaId: requireArea("maritime-yacht"),
    },
    {
      slug: "maritime-sale-purchase",
      nameAr: "عقود البيع والشراء البحرية",
      nameEn: "Maritime Sale & Purchase Agreement",
      descriptionAr:
        "صياغة عقود بيع وشراء اليخوت والسفن وإتمام إجراءات نقل الملكية بكفاءة ودقة قانونية.",
      descriptionEn:
        "Drafting yacht and vessel sale-and-purchase agreements and managing title-transfer procedures with full legal precision.",
      durationMinutes: 90,
      priceEgp: "5500",
      deliveryMode: "both",
      practiceAreaId: requireArea("maritime-yacht"),
    },

    /* ─── 7. Criminal Law & Defense ────────────────────────────────── */
    {
      slug: "police-station-representation",
      nameAr: "التمثيل أمام أقسام الشرطة (طارئ)",
      nameEn: "Police Station Representation (Urgent)",
      descriptionAr:
        "الحضور مع الموكل منذ اللحظات الأولى للتحقيق لضمان سلامة الإجراءات القانونية وحماية الحقوق الدستورية.",
      descriptionEn:
        "Immediate attendance alongside clients from the earliest stages of investigation, ensuring procedural integrity and constitutional rights are protected.",
      durationMinutes: 60,
      priceEgp: "3000",
      deliveryMode: "in_office",
      practiceAreaId: requireArea("criminal-defense"),
    },
    {
      slug: "public-prosecution-defense",
      nameAr: "الدفاع أمام النيابة العامة",
      nameEn: "Public Prosecution Defense",
      descriptionAr:
        "تولي الدفاع وتقديم الدفوع القانونية والمذكرات الفنية خلال مراحل التحقيق في مختلف الجرائم والجنايات.",
      descriptionEn:
        "Leading the defense throughout prosecution investigations, submitting strategic legal arguments and technical memoranda across offenses and felonies.",
      durationMinutes: 60,
      priceEgp: "4500",
      deliveryMode: "both",
      practiceAreaId: requireArea("criminal-defense"),
    },
    {
      slug: "criminal-defense-retainer",
      nameAr: "توكيل دفاع جنائي أمام المحاكم",
      nameEn: "Criminal Court Advocacy / Retainer",
      descriptionAr:
        "الدفاع عن الموكلين أمام محاكم الجنايات والجنح بمختلف درجاتها مع متابعة كاملة لجميع الجلسات وخبرة خاصة في القضايا التي يكون أطرافها أجانب.",
      descriptionEn:
        "Representing clients before misdemeanor and felony courts at all levels, with full hearing-by-hearing follow-up and particular expertise in cases involving foreign nationals.",
      durationMinutes: 60,
      priceEgp: "8000",
      deliveryMode: "in_office",
      practiceAreaId: requireArea("criminal-defense"),
    },
  ];

  /* Slugs that the seeder used to create but no longer ships. We soft-retire
     them (isActive=false) instead of deleting because appointments may
     reference them via a NOT NULL foreign key. */
  const RETIRED_SERVICE_SLUGS = [
    "labor-dispute-consultation",
    "trademark-registration",
  ];

  const newSlugs = new Set(services.map((s) => s.slug));
  for (const s of services) {
    const [existing] = await db
      .select()
      .from(servicesTable)
      .where(eq(servicesTable.slug, s.slug));
    if (existing) {
      await db
        .update(servicesTable)
        .set({ ...s, isActive: true })
        .where(eq(servicesTable.id, existing.id));
    } else {
      await db.insert(servicesTable).values(s as never);
    }
  }
  for (const slug of RETIRED_SERVICE_SLUGS) {
    if (newSlugs.has(slug)) continue;
    await db
      .update(servicesTable)
      .set({ isActive: false })
      .where(eq(servicesTable.slug, slug));
  }
  console.log(
    `Seeded ${services.length} services (retired ${RETIRED_SERVICE_SLUGS.length})`,
  );
}

const TESTIMONIALS = [
  {
    clientName: "Ahmed Ibrahim",
    role: "CEO, Tech Company",
    contentAr:
      "خبرة استثنائية ومهنية عالية. ساعدوني في تأسيس شركتي بسلاسة كاملة وقدموا لي استشارات قيّمة على مدار السنوات الماضية.",
    contentEn:
      "Exceptional expertise and high professionalism. They helped me incorporate my company seamlessly and have provided invaluable counsel for years.",
    rating: 5,
    sortOrder: 1,
  },
  {
    clientName: "Laila Mansour",
    role: "Real Estate Investor",
    contentAr:
      "محامون متمرسون يهتمون بأدق التفاصيل. أنصح بهم لكل من يبحث عن استشارة قانونية موثوقة في القاهرة.",
    contentEn:
      "Seasoned attorneys with attention to the smallest details. Highly recommended for anyone seeking trusted legal advice in Cairo.",
    rating: 5,
    sortOrder: 2,
  },
  {
    clientName: "Dr. Youssef Khaled",
    role: "Physician",
    contentAr: "تعاملت معهم في قضية معقدة وحققوا نتيجة فاقت توقعاتي. شكراً لفريق العمل الرائع.",
    contentEn:
      "I worked with them on a complex case and the outcome exceeded my expectations. Thank you to the wonderful team.",
    rating: 5,
    sortOrder: 3,
  },
  {
    clientName: "Noha Elsayed",
    role: "Business Owner",
    contentAr: "سرعة استجابة، شفافية في الأتعاب، ومتابعة دقيقة. مكتب محترم بكل المقاييس.",
    contentEn:
      "Fast response, transparent fees, and meticulous follow-up. A respected firm by every measure.",
    rating: 5,
    sortOrder: 4,
  },
];

async function seedTestimonials() {
  for (const t of TESTIMONIALS) {
    await db.insert(testimonialsTable).values(t).onConflictDoNothing();
  }
  console.log(`Seeded ${TESTIMONIALS.length} testimonials`);
}

const FAQS = [
  {
    questionAr: "كيف يمكنني حجز استشارة قانونية؟",
    questionEn: "How can I book a legal consultation?",
    answerAr:
      "يمكنك حجز استشارة عبر صفحة الحجز في الموقع، باختيار الخدمة المناسبة وتحديد التاريخ والوقت ودفع الأتعاب بإحدى وسائل الدفع المتاحة.",
    answerEn:
      "You can book a consultation through the booking page on our site by choosing a service, picking a date and time, and paying via one of the available payment methods.",
    category: "booking",
    sortOrder: 1,
  },
  {
    questionAr: "ما هي وسائل الدفع المتاحة؟",
    questionEn: "What payment methods are available?",
    answerAr:
      "نقبل إنستاباي، فودافون كاش، فوري، فيزا، التحويل البنكي، والدفع نقداً بالمكتب. يتم تأكيد الدفع يدوياً من قبل فريق المحاسبة.",
    answerEn:
      "We accept Instapay, Vodafone Cash, Fawry, Visa, Bank Transfer, and cash at our office. Payments are confirmed manually by our accounting team.",


    category: "booking",


    sortOrder: 2,
  },
  {
    questionAr: "هل تقدمون استشارات أونلاين؟",
    questionEn: "Do you offer online consultations?",
    answerAr:
      "نعم، نقدم استشارات أونلاين عبر مكالمة فيديو آمنة. يمكنك اختيار وضع (أونلاين) عند الحجز وسنرسل لك رابط الاجتماع.",
    answerEn:
      "Yes, we offer online consultations via secure video call. Select 'Online' when booking and we will send you the meeting link.",


    category: "payments",


    sortOrder: 3,
  },
  {
    questionAr: "كم تستغرق المواعيد؟",
    questionEn: "How long are appointments?",
    answerAr: "تختلف المدة حسب نوع الخدمة، عادة بين 45 إلى 90 دقيقة.",
    answerEn: "Duration varies by service type, typically between 45 and 90 minutes.",


    sortOrder: 4,
  },
  {
    questionAr: "هل أتعاب الاستشارة مستردة؟",
    questionEn: "Are consultation fees refundable?",
    answerAr:
      "أتعاب الاستشارة قابلة للاسترداد إذا قمت بإلغاء الموعد قبل 24 ساعة على الأقل من موعده.",
    answerEn:
      "Consultation fees are refundable if you cancel at least 24 hours before the appointment.",


    category: "booking",


    sortOrder: 5,
  },
  {
    questionAr: "هل بياناتي القانونية سرية؟",
    questionEn: "Is my legal information confidential?",
    answerAr:
      "نعم، جميع المعلومات التي يقدمها العملاء سرية تماماً ومحمية بموجب قانون مهنة المحاماة المصرية.",
    answerEn:
      "Yes, all client information is strictly confidential and protected under Egyptian attorney privilege laws.",


    category: "booking",


    sortOrder: 6,
  },
  {
    questionAr: "ما هي مواعيد العمل الرسمية؟",
    questionEn: "What are your official working hours?",
    answerAr:
      "نعمل من الأحد إلى الخميس من 10 صباحاً حتى 6 مساءً، السبت من 11 صباحاً حتى 4 مساءً، والجمعة مغلق.",
    answerEn:
      "Sunday to Thursday 10:00 AM to 6:00 PM, Saturday 11:00 AM to 4:00 PM, closed on Friday.",


    category: "payments",


    sortOrder: 7,
  },
];

async function seedFaqs() {
  for (const f of FAQS) {
    await db.insert(faqsTable).values(f).onConflictDoNothing();
  }
  console.log(`Seeded ${FAQS.length} FAQs`);
}

const LEGAL_CATEGORIES = [
  { slug: "civil-code", nameAr: "القانون المدني", nameEn: "Civil Code", sortOrder: 1 },
  { slug: "commercial-code", nameAr: "القانون التجاري", nameEn: "Commercial Code", sortOrder: 2 },
  { slug: "criminal-code", nameAr: "قانون العقوبات", nameEn: "Criminal Code", sortOrder: 3 },
  { slug: "personal-status", nameAr: "الأحوال الشخصية", nameEn: "Personal Status Law", sortOrder: 4 },
  { slug: "labor-law", nameAr: "قانون العمل", nameEn: "Labor Law", sortOrder: 5 },
  { slug: "tax-law", nameAr: "القانون الضريبي", nameEn: "Tax Law", sortOrder: 6 },
  { slug: "real-estate", nameAr: "قوانين العقارات", nameEn: "Real Estate Laws", sortOrder: 7 },
  { slug: "constitution", nameAr: "الدستور", nameEn: "The Constitution", sortOrder: 8 },
];

async function seedLegalCategories() {
  for (const c of LEGAL_CATEGORIES) {
    const [existing] = await db
      .select()
      .from(legalCategoriesTable)
      .where(eq(legalCategoriesTable.slug, c.slug));
    if (!existing) await db.insert(legalCategoriesTable).values(c);
  }
  console.log(`Seeded ${LEGAL_CATEGORIES.length} legal categories`);
}

async function seedLegalArticles() {
  const cats = await db.select().from(legalCategoriesTable);
  const bySlug = new Map(cats.map((c) => [c.slug, c.id]));
  const items = [
    {
      slug: "civil-code-1948-overview",
      categorySlug: "civil-code",
      titleAr: "القانون المدني المصري — نظرة عامة",
      titleEn: "Egyptian Civil Code — Overview",
      summaryAr:
        "ملخص شامل لأحكام القانون المدني المصري الصادر بالقانون رقم 131 لسنة 1948 وأهم تعديلاته.",
      summaryEn:
        "A comprehensive summary of the Egyptian Civil Code issued by Law No. 131 of 1948 and its key amendments.",
      contentAr:
        "صدر القانون المدني المصري بالقانون رقم 131 لسنة 1948 ويعد المرجع الأساسي لتنظيم العلاقات بين الأفراد في الأمور المدنية. يتألف من ثلاثة أقسام رئيسية: الأحكام العامة، الالتزامات والعقود، والحقوق العينية الأصلية والتبعية.\n\nأهم محاوره: نظرية الالتزام، العقود المسماة (البيع، الإيجار، المقاولة)، المسئولية التقصيرية، والحقوق العينية. وقد تأثر القانون بالقانون المدني الفرنسي وبالشريعة الإسلامية في مسائل عديدة.",
      contentEn:
        "The Egyptian Civil Code was issued by Law No. 131 of 1948 and is the principal reference for regulating civil relationships between individuals. It is divided into three main sections: General Provisions, Obligations and Contracts, and Real Rights.\n\nKey topics: theory of obligation, named contracts (sale, lease, construction), tortious liability, and real rights. The code was influenced by the French Civil Code and by Islamic Sharia in several matters.",
      lawNumber: "131",
      year: 1948,
      tags: ["civil", "obligations", "contracts"],
    },
    {
      slug: "commercial-code-1999",
      categorySlug: "commercial-code",
      titleAr: "قانون التجارة المصري رقم 17 لسنة 1999",
      titleEn: "Egyptian Commercial Code No. 17 of 1999",
      summaryAr: "أحكام التاجر، الأعمال التجارية، الالتزامات التجارية، وعقود التجارة الدولية.",
      summaryEn:
        "Provisions on the merchant, commercial acts, commercial obligations, and international trade contracts.",
      contentAr:
        "نظم قانون التجارة المصري الصادر بالقانون رقم 17 لسنة 1999 الأعمال التجارية وصفة التاجر، السجل التجاري، الأوراق التجارية، الإفلاس، وعقود التجارة الدولية. كما تناول الوكالات التجارية والامتياز التجاري.",
      contentEn:
        "The Egyptian Commercial Code issued by Law No. 17 of 1999 regulates commercial acts, the status of the merchant, the commercial register, commercial paper, bankruptcy, and international trade contracts. It also covers commercial agencies and franchising.",
      lawNumber: "17",
      year: 1999,
      tags: ["commercial", "trade", "merchants"],
    },
    {
      slug: "criminal-code-1937",
      categorySlug: "criminal-code",
      titleAr: "قانون العقوبات المصري رقم 58 لسنة 1937",
      titleEn: "Egyptian Penal Code No. 58 of 1937",
      summaryAr: "الأحكام العامة للجرائم، العقوبات، الجنايات، الجنح والمخالفات في مصر.",
      summaryEn:
        "General provisions on crimes, punishments, felonies, misdemeanors, and contraventions in Egypt.",
      contentAr:
        "صدر قانون العقوبات بالقانون رقم 58 لسنة 1937 ويحتوي على بابين: الباب الأول الأحكام العامة، والباب الثاني الجرائم. تشمل الجرائم: جرائم الدولة، جرائم الأموال (السرقة، النصب)، جرائم الأشخاص (القتل، الضرب)، وجرائم العرض.",
      contentEn:
        "The Penal Code was issued by Law No. 58 of 1937 and is divided into two parts: Part I General Provisions, and Part II Offenses. Offenses include crimes against the state, property (theft, fraud), persons (murder, assault), and morals.",
      lawNumber: "58",
      year: 1937,
      tags: ["criminal", "penal", "offenses"],
    },
    {
      slug: "personal-status-2000",
      categorySlug: "personal-status",
      titleAr: "قانون الأحوال الشخصية رقم 1 لسنة 2000",
      titleEn: "Personal Status Law No. 1 of 2000",
      summaryAr:
        "إجراءات التقاضي في مسائل الأحوال الشخصية، والخلع، والولاية، وكافة الأحكام العائلية.",
      summaryEn:
        "Litigation procedures in personal status matters, khul', guardianship, and all family rulings.",
      contentAr:
        "قانون رقم 1 لسنة 2000 ينظم بعض أحكام التقاضي في مسائل الأحوال الشخصية، وأهم ما جاء فيه: تنظيم الخلع كحق للزوجة، تيسير إجراءات الطلاق، وإنشاء محاكم الأسرة المتخصصة بقانون لاحق رقم 10 لسنة 2004.",
      contentEn:
        "Law No. 1 of 2000 regulates certain litigation procedures in personal status matters. Its key contributions include: organizing khul' as a right of the wife, simplifying divorce procedures, and creating specialized family courts via subsequent Law No. 10 of 2004.",
      lawNumber: "1",
      year: 2000,
      tags: ["family", "khula", "divorce"],
    },
    {
      slug: "labor-law-2003",
      categorySlug: "labor-law",
      titleAr: "قانون العمل رقم 12 لسنة 2003",
      titleEn: "Labor Law No. 12 of 2003",
      summaryAr: "حقوق العمال، عقود العمل، إنهاء الخدمة، والتأمينات الاجتماعية.",
      summaryEn:
        "Workers' rights, employment contracts, termination, and social insurance provisions.",
      contentAr:
        "ينظم قانون العمل المصري رقم 12 لسنة 2003 العلاقة بين العامل وصاحب العمل في القطاع الخاص. يحدد الحد الأدنى للأجور، ساعات العمل اليومية (8 ساعات)، الإجازات السنوية (21 يوماً)، إجازة الوضع، وأحكام إنهاء عقد العمل.",
      contentEn:
        "Egyptian Labor Law No. 12 of 2003 regulates the relationship between worker and employer in the private sector. It sets minimum wages, daily hours (8 hours), annual leave (21 days), maternity leave, and termination provisions.",
      lawNumber: "12",
      year: 2003,
      tags: ["labor", "employment", "workers"],
    },
    {
      slug: "income-tax-2005",
      categorySlug: "tax-law",
      titleAr: "قانون الضرائب على الدخل رقم 91 لسنة 2005",
      titleEn: "Income Tax Law No. 91 of 2005",
      summaryAr: "أحكام ضريبة الدخل على الأشخاص الطبيعيين والأشخاص الاعتبارية في مصر.",
      summaryEn:
        "Provisions of income tax for natural persons and legal entities in Egypt.",
      contentAr:
        "ينظم قانون الضرائب على الدخل رقم 91 لسنة 2005 ضرائب الدخل في مصر. يفرض ضريبة على دخل الأشخاص الطبيعيين بشرائح تصاعدية، وضريبة على أرباح الشركات بنسبة 22.5%، وضريبة على دخل النشاط التجاري والمهني.",
      contentEn:
        "Income Tax Law No. 91 of 2005 regulates income taxes in Egypt. It imposes progressive income tax on natural persons, 22.5% corporate income tax, and tax on commercial and professional activity income.",
      lawNumber: "91",
      year: 2005,
      tags: ["tax", "income", "corporate"],
    },
    {
      slug: "real-estate-publicity-1946",
      categorySlug: "real-estate",
      titleAr: "قانون الشهر العقاري رقم 114 لسنة 1946",
      titleEn: "Real Estate Publicity Law No. 114 of 1946",
      summaryAr: "نظام تسجيل العقارات والحقوق العينية العقارية في مصر.",
      summaryEn:
        "The system for registering real estate and real property rights in Egypt.",
      contentAr:
        "يتضمن قانون الشهر العقاري رقم 114 لسنة 1946 إجراءات شهر التصرفات العقارية وجميع الحقوق العينية العقارية. يشترط للتسجيل تقديم العقد، رسم تخطيطي، وشهادات عدم التصرف، ودفع رسوم تسجيل تتراوح بين 0.5% إلى 3% من قيمة العقار.",
      contentEn:
        "Real Estate Publicity Law No. 114 of 1946 contains the procedures for registering real estate dispositions and all real property rights. Registration requires the contract, a layout plan, non-disposition certificates, and registration fees ranging from 0.5% to 3% of property value.",
      lawNumber: "114",
      year: 1946,
      tags: ["real-estate", "registration"],
    },
    {
      slug: "constitution-2014",
      categorySlug: "constitution",
      titleAr: "الدستور المصري 2014",
      titleEn: "Egyptian Constitution 2014",
      summaryAr: "الدستور الحالي لجمهورية مصر العربية والأحكام الأساسية للدولة والمواطنين.",
      summaryEn:
        "The current constitution of the Arab Republic of Egypt and the foundational provisions for the state and citizens.",
      contentAr:
        "الدستور المصري الحالي تم إقراره في يناير 2014 ويتألف من 247 مادة موزعة على 6 أبواب: الدولة، المقومات الأساسية، الحقوق والحريات والواجبات العامة، سيادة القانون، نظام الحكم، والأحكام العامة والانتقالية.",
      contentEn:
        "The current Egyptian Constitution was approved in January 2014 and consists of 247 articles divided into 6 chapters: The State, Fundamental Constituents, Public Rights, Freedoms and Duties, Rule of Law, System of Government, and General and Transitional Provisions.",
      lawNumber: null,
      year: 2014,
      tags: ["constitution", "rights"],
    },
  ];
  for (const a of items) {
    const [existing] = await db
      .select()
      .from(legalArticlesTable)
      .where(eq(legalArticlesTable.slug, a.slug));
    if (existing) continue;
    const categoryId = bySlug.get(a.categorySlug);
    if (!categoryId) continue;
    const { categorySlug, ...rest } = a;
    await db.insert(legalArticlesTable).values({
      ...rest,
      categoryId,
      isPublished: true,
      publishedAt: new Date(),
    });
  }
  console.log(`Seeded ${items.length} legal articles`);
}

async function seedBlogPosts() {
  const posts = [
    {
      slug: "what-to-do-after-traffic-accident-egypt",
      titleAr: "ماذا تفعل بعد حادث سيارة في مصر؟",
      titleEn: "What to Do After a Car Accident in Egypt",
      summaryAr: "خطوات قانونية مهمة يجب اتباعها فور وقوع حادث مروري لحماية حقوقك.",
      summaryEn:
        "Important legal steps to take immediately after a traffic accident to protect your rights.",
      contentAr:
        "حوادث السير من أكثر القضايا شيوعاً في مصر. أول خطوة: حافظ على هدوئك وأبلغ النجدة 122 فوراً، التزم بالبقاء في موقع الحادث، صور المركبات والأضرار، احصل على بيانات الطرف الآخر وشهود العيان، حرر محضر شرطة، ثم استشر محامياً قبل توقيع أي مستند مع شركة التأمين.",
      contentEn:
        "Traffic accidents are among the most common cases in Egypt. First step: stay calm and call emergency services on 122 immediately, remain at the accident site, photograph the vehicles and damage, obtain the other party's details and eyewitnesses, file a police report, then consult an attorney before signing any document with the insurance company.",
      authorName: "Mohamed A. Osaman",
      tags: ["traffic", "accidents", "tips"],
      coverImageUrl:
        "https://images.unsplash.com/photo-1599475053517-77b6f5d8e6f8?auto=format&fit=crop&w=1200&q=80",
    },
    {
      slug: "starting-a-business-in-egypt-2026",
      titleAr: "تأسيس شركة في مصر 2026 — دليل مبسط",
      titleEn: "Starting a Business in Egypt 2026 — A Simplified Guide",
      summaryAr: "خطوات تأسيس شركة جديدة في مصر، الأوراق المطلوبة، والتكاليف التقديرية.",
      summaryEn:
        "Steps for starting a new company in Egypt, required documents, and estimated costs.",
      contentAr:
        "تأسيس شركة في مصر 2026 أصبح أيسر بفضل التحول الرقمي للهيئة العامة للاستثمار. الخطوات: اختيار الشكل القانوني، حجز الاسم التجاري، إيداع رأس المال، توثيق العقد التأسيسي، التسجيل في السجل التجاري والضرائب، واستخراج البطاقة الضريبية.",
      contentEn:
        "Starting a company in Egypt in 2026 is easier thanks to GAFI's digital transformation. Steps: choose legal form, reserve the trade name, deposit capital, notarize the articles of association, register in the commercial register and tax authority, and obtain the tax card.",
      authorName: "Mohamed A. Osaman",
      tags: ["corporate", "startup", "incorporation"],
      coverImageUrl:
        "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1200&q=80",
    },
    {
      slug: "khula-in-egyptian-personal-status-law",
      titleAr: "الخلع في قانون الأحوال الشخصية المصري",
      titleEn: "Khul' in Egyptian Personal Status Law",
      summaryAr:
        "كل ما تحتاج معرفته عن إجراءات الخلع، الشروط، والحقوق الناتجة عنه للزوجة المصرية.",
      summaryEn:
        "Everything you need to know about khul' procedures, conditions, and resulting rights for the Egyptian wife.",
      contentAr:
        "الخلع حق منحه القانون رقم 1 لسنة 2000 للزوجة في إنهاء العلاقة الزوجية مقابل التنازل عن مؤخر الصداق ورد المقدم. تتم الإجراءات أمام محكمة الأسرة المختصة، وتمر بمحاولة صلح إجبارية، ثم يُصدر الحكم خلال ستة أشهر تقريباً.",
      contentEn:
        "Khul' is a right granted to the wife by Law No. 1 of 2000 to end the marital relationship in exchange for waiving the deferred dowry and returning the advance. Procedures take place before the competent family court, with mandatory mediation, then judgment is issued within approximately six months.",
      authorName: "Amira Hassan",
      tags: ["family", "khula", "personal-status"],
      coverImageUrl:
        "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
    },
  ];
  for (const p of posts) {
    const [existing] = await db
      .select()
      .from(blogPostsTable)
      .where(eq(blogPostsTable.slug, p.slug));
    if (!existing) {
      await db.insert(blogPostsTable).values({
        ...p,
        isPublished: true,
        publishedAt: new Date(),
      });
    }
  }
  console.log(`Seeded ${posts.length} blog posts`);
}

async function main() {
  await upsertAdmin();
  await seedSiteSettings();
  await seedPracticeAreas();
  await seedLawyers();
  await seedServices();
  await seedTestimonials();
  await seedFaqs();
  await seedLegalCategories();
  await seedLegalArticles();
  await seedBlogPosts();
  console.log("\nSeed complete.");
  await pool.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
