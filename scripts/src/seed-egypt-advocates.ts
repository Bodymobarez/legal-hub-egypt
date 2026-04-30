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
  const email = "admin@egypt-advocates.com";
  const password = process.env.ADMIN_PASSWORD ?? "EgyptAdvocates@2026";
  const passwordHash = hashPassword(password);
  const [existing] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.email, email));
  if (existing) {
    await db
      .update(adminUsersTable)
      .set({ passwordHash, name: "Mohamed A. Osaman" })
      .where(eq(adminUsersTable.id, existing.id));
    console.log(`Updated admin: ${email}`);
  } else {
    await db.insert(adminUsersTable).values({
      email,
      passwordHash,
      name: "Mohamed A. Osaman",
      role: "super_admin",
    });
    console.log(`Created admin: ${email}`);
  }
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
    addressAr: "الكوثر الجديد - منطقة البنوك - امام HSBC - أعلي بست واي - الدور الرابع - مكتب ٢١",
    addressEn: "Al Kawthar Al Jadid District, Banking Area, In front of HSBC, Above Best Way, 4th Floor, Office No. 21",
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

const PRACTICE_AREAS = [
  {
    slug: "corporate-commercial",
    nameAr: "الشركات والقانون التجاري",
    nameEn: "Corporate & Commercial Law",
    descriptionAr:
      "تأسيس الشركات، صياغة العقود التجارية، الاستحواذ والاندماج، وحوكمة الشركات في السوق المصري.",
    descriptionEn:
      "Company incorporation, commercial contracts, M&A, and corporate governance in the Egyptian market.",
    icon: "Briefcase",
    sortOrder: 1,
  },
  {
    slug: "civil-litigation",
    nameAr: "القضايا المدنية",
    nameEn: "Civil Litigation",
    descriptionAr: "تمثيل العملاء أمام المحاكم المدنية في النزاعات الفردية والتعويضات وحقوق الملكية.",
    descriptionEn:
      "Representing clients before civil courts in personal disputes, damages, and property rights.",
    icon: "Scale",
    sortOrder: 2,
  },
  {
    slug: "criminal-defense",
    nameAr: "القانون الجنائي",
    nameEn: "Criminal Defense",
    descriptionAr: "دفاع متخصص في القضايا الجنائية على جميع درجات التقاضي بسرية تامة.",
    descriptionEn:
      "Specialized defense in criminal cases at all levels of litigation with full confidentiality.",
    icon: "ShieldCheck",
    sortOrder: 3,
  },
  {
    slug: "family-personal-status",
    nameAr: "الأحوال الشخصية والأسرة",
    nameEn: "Family & Personal Status",
    descriptionAr:
      "الزواج، الطلاق، الحضانة، النفقة، الميراث، وكافة قضايا الأحوال الشخصية للمسلمين والأقباط.",
    descriptionEn:
      "Marriage, divorce, custody, alimony, inheritance, and all personal status matters for Muslims and Copts.",
    icon: "Users",
    sortOrder: 4,
  },
  {
    slug: "real-estate",
    nameAr: "العقارات",
    nameEn: "Real Estate Law",
    descriptionAr: "تسجيل العقارات بالشهر العقاري، عقود البيع والإيجار، ونزاعات الملكية.",
    descriptionEn:
      "Property registration with the Real Estate Publicity, sale and lease contracts, and ownership disputes.",
    icon: "Building2",
    sortOrder: 5,
  },
  {
    slug: "labor-employment",
    nameAr: "قانون العمل",
    nameEn: "Labor & Employment",
    descriptionAr:
      "نزاعات العمل، عقود التوظيف، الفصل التعسفي، التعويضات، والتمثيل أمام محاكم العمل.",
    descriptionEn:
      "Labor disputes, employment contracts, unfair dismissal, compensation, and labor court representation.",
    icon: "HardHat",
    sortOrder: 6,
  },
  {
    slug: "tax-law",
    nameAr: "القانون الضريبي",
    nameEn: "Tax Law",
    descriptionAr: "الاستشارات الضريبية، الطعن على القرارات الضريبية، والتخطيط الضريبي للأعمال.",
    descriptionEn:
      "Tax advisory, appeals against tax assessments, and tax planning for businesses.",
    icon: "Receipt",
    sortOrder: 7,
  },
  {
    slug: "intellectual-property",
    nameAr: "الملكية الفكرية",
    nameEn: "Intellectual Property",
    descriptionAr:
      "تسجيل العلامات التجارية وبراءات الاختراع، وحماية حقوق المؤلف والملكية الصناعية.",
    descriptionEn:
      "Trademark and patent registration, copyright protection, and industrial property rights.",
    icon: "Lightbulb",
    sortOrder: 8,
  },
  {
    slug: "arbitration-mediation",
    nameAr: "التحكيم والوساطة",
    nameEn: "Arbitration & Mediation",
    descriptionAr:
      "تمثيل العملاء في مراكز التحكيم المحلية والدولية وفض النزاعات بالطرق البديلة.",
    descriptionEn:
      "Representation in local and international arbitration centers and alternative dispute resolution.",
    icon: "Handshake",
    sortOrder: 9,
  },
  {
    slug: "immigration",
    nameAr: "الهجرة والجنسية",
    nameEn: "Immigration & Nationality",
    descriptionAr: "الجنسية المصرية، تأشيرات الإقامة، وتسوية أوضاع الأجانب في مصر.",
    descriptionEn:
      "Egyptian nationality, residency visas, and regularization of foreign nationals in Egypt.",
    icon: "Plane",
    sortOrder: 10,
  },
];

async function seedPracticeAreas() {
  for (const a of PRACTICE_AREAS) {
    const [existing] = await db
      .select()
      .from(practiceAreasTable)
      .where(eq(practiceAreasTable.slug, a.slug));
    if (!existing) {
      await db.insert(practiceAreasTable).values(a);
    }
  }
  console.log(`Seeded ${PRACTICE_AREAS.length} practice areas`);
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
  const services = [
    {
      slug: "general-legal-consultation",
      nameAr: "استشارة قانونية عامة",
      nameEn: "General Legal Consultation",
      descriptionAr: "جلسة استشارية لمدة 45 دقيقة لمناقشة موقفك القانوني وعرض الخيارات المتاحة.",
      descriptionEn:
        "A 45-minute consultation session to discuss your legal position and review available options.",
      durationMinutes: 45,
      priceEgp: "750",
      deliveryMode: "both",
      practiceAreaId: areaBySlug.get("civil-litigation")?.id ?? null,
    },
    {
      slug: "corporate-formation",
      nameAr: "تأسيس شركة",
      nameEn: "Company Formation",
      descriptionAr:
        "تأسيس كامل لشركة جديدة بكافة المستندات والتسجيل في السجل التجاري والضرائب.",
      descriptionEn:
        "Full incorporation of a new company including all paperwork and registration with commercial and tax authorities.",
      durationMinutes: 60,
      priceEgp: "5000",
      deliveryMode: "both",
      practiceAreaId: areaBySlug.get("corporate-commercial")?.id ?? null,
    },
    {
      slug: "contract-drafting-review",
      nameAr: "صياغة ومراجعة العقود",
      nameEn: "Contract Drafting & Review",
      descriptionAr:
        "صياغة أو مراجعة عقد تجاري بالتفصيل مع التأكد من حماية حقوقك بالكامل.",
      descriptionEn:
        "Drafting or detailed review of a commercial contract ensuring your rights are fully protected.",
      durationMinutes: 90,
      priceEgp: "2500",
      deliveryMode: "both",
      practiceAreaId: areaBySlug.get("corporate-commercial")?.id ?? null,
    },
    {
      slug: "divorce-consultation",
      nameAr: "استشارة طلاق",
      nameEn: "Divorce Consultation",
      descriptionAr:
        "استشارة سرية في إجراءات الطلاق وحقوق الزوجين والأبناء وفقاً للقانون المصري.",
      descriptionEn:
        "Confidential consultation on divorce procedures, spousal and children rights under Egyptian law.",
      durationMinutes: 60,
      priceEgp: "1200",
      deliveryMode: "both",
      practiceAreaId: areaBySlug.get("family-personal-status")?.id ?? null,
    },
    {
      slug: "criminal-defense-retainer",
      nameAr: "توكيل دفاع جنائي",
      nameEn: "Criminal Defense Retainer",
      descriptionAr: "توكيل محام للدفاع في قضية جنائية مع متابعة كاملة لجميع الجلسات.",
      descriptionEn:
        "Engagement of an attorney for criminal defense with full follow-up across all hearings.",
      durationMinutes: 60,
      priceEgp: "8000",
      deliveryMode: "in_office",
      practiceAreaId: areaBySlug.get("criminal-defense")?.id ?? null,
    },
    {
      slug: "real-estate-registration",
      nameAr: "تسجيل عقار في الشهر العقاري",
      nameEn: "Property Registration",
      descriptionAr: "متابعة تسجيل عقار في الشهر العقاري وإصدار صحيفة الملكية.",
      descriptionEn:
        "Handling property registration with the Real Estate Publicity and obtaining title deed.",
      durationMinutes: 60,
      priceEgp: "3500",
      deliveryMode: "in_office",
      practiceAreaId: areaBySlug.get("real-estate")?.id ?? null,
    },
    {
      slug: "labor-dispute-consultation",
      nameAr: "استشارة نزاع عمل",
      nameEn: "Labor Dispute Consultation",
      descriptionAr: "تقييم موقفك في نزاع عمل مع صاحب العمل وتحديد أفضل مسار قانوني.",
      descriptionEn:
        "Assessment of your labor dispute with the employer and identifying the best legal path.",
      durationMinutes: 45,
      priceEgp: "850",
      deliveryMode: "both",
      practiceAreaId: areaBySlug.get("labor-employment")?.id ?? null,
    },
    {
      slug: "trademark-registration",
      nameAr: "تسجيل علامة تجارية",
      nameEn: "Trademark Registration",
      descriptionAr: "تسجيل علامة تجارية محلية أو دولية ومتابعة الإجراءات حتى الإصدار.",
      descriptionEn:
        "Registration of a local or international trademark and follow-up until issuance.",
      durationMinutes: 60,
      priceEgp: "4000",
      deliveryMode: "both",
      practiceAreaId: areaBySlug.get("intellectual-property")?.id ?? null,
    },
  ];
  for (const s of services) {
    const [existing] = await db
      .select()
      .from(servicesTable)
      .where(eq(servicesTable.slug, s.slug));
    if (!existing) await db.insert(servicesTable).values(s as never);
  }
  console.log(`Seeded ${services.length} services`);
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
