import { isOfficeOpen } from "./work-hours";

type Lang = "ar" | "en";

const RULES: Array<{
  match: RegExp;
  ar: string;
  en: string;
}> = [
  {
    match: /(موعد|حجز|استشاره|استشارة|appointment|book|consult)/i,
    ar: "يمكنك حجز استشارة بسهولة عبر صفحة الحجز. اختر الخدمة المناسبة، حدد التاريخ والوقت، ثم أدخل بياناتك ووسيلة الدفع. الفرق القانوني يقوم بمراجعة الطلب فور وصوله.",
    en: "You can book a consultation easily from our booking page. Pick a service, choose a date and time, then enter your details and preferred payment method. Our legal team reviews each request as soon as it arrives.",
  },
  {
    match: /(دفع|انستا|فوري|فودافون|instapay|fawry|vodafone|payment|pay|visa|cash|تحويل)/i,
    ar: "نقبل وسائل الدفع المصرية: إنستاباي، فودافون كاش، فوري، فيزا، التحويل البنكي، أو الدفع نقداً بالمكتب. يتم تأكيد الدفع يدوياً من قبل فريقنا بعد إرسال رقم العملية.",
    en: "We accept Egyptian payment methods: Instapay, Vodafone Cash, Fawry, Visa, Bank Transfer, or cash at our office. Payments are confirmed manually by our team after you share the reference number.",
  },
  {
    match: /(عنوان|مكتب|address|location|where)/i,
    ar: "مكتبنا في القاهرة. يمكنك إيجاد العنوان الكامل وأرقام التواصل في صفحة (تواصل معنا).",
    en: "Our office is in Cairo. You'll find the full address and contact numbers on our contact page.",
  },
  {
    match: /(ساعات|دوام|مفتوح|مغلق|hours|open|closed)/i,
    ar: "نعمل من الأحد إلى الخميس من الساعة 10 صباحًا حتى 6 مساءً، السبت من 11 ص حتى 4 م. يوم الجمعة مغلق.",
    en: "We work Sunday to Thursday from 10:00 AM to 6:00 PM and Saturday from 11:00 AM to 4:00 PM. Closed on Friday.",
  },
  {
    match: /(محامي|محامى|lawyer|attorney|team)/i,
    ar: "يضم فريقنا نخبة من المحامين المتخصصين في مختلف فروع القانون المصري. تفضل بزيارة صفحة (المحامون) للاطلاع على السير الذاتية.",
    en: "Our team includes seasoned attorneys specialized in every branch of Egyptian law. Visit the lawyers page to view their full profiles.",
  },
  {
    match: /(قانون|تشريع|مكتبة|law|library|article)/i,
    ar: "تحتوي مكتبتنا القانونية على ملخصات للقوانين المصرية الأساسية مع روابط للنصوص الكاملة. يمكنك تصفحها من قائمة (المكتبة القانونية).",
    en: "Our legal library contains summaries of the core Egyptian laws with links to the full texts. You can browse it from the Legal Library menu.",
  },
];

const GREETINGS_AR = [
  "أهلاً بك في مكتب مصر للمحاماة. كيف يمكنني مساعدتك اليوم؟",
  "مرحباً، يسعدنا تواصلك معنا. كيف يمكننا خدمتك؟",
];
const GREETINGS_EN = [
  "Welcome to Egypt Advocates. How can I help you today?",
  "Hello, thank you for reaching out. How can we assist you?",
];
const FALLBACK_AR =
  "شكراً لتواصلك. سيقوم أحد المحامين بالرد عليك في أقرب وقت ممكن خلال ساعات العمل. يمكنك أيضاً حجز استشارة من صفحة الحجز.";
const FALLBACK_EN =
  "Thank you for your message. One of our lawyers will reply during working hours. You can also book a consultation from our booking page.";
const OFFLINE_AR =
  "نحن خارج ساعات العمل حالياً. سيتم الرد على رسالتك في أقرب وقت ممكن.";
const OFFLINE_EN =
  "We are currently outside working hours. Your message will be answered as soon as possible.";

export function botReply(userText: string, lang: Lang, isFirstMessage: boolean): string[] {
  const replies: string[] = [];
  const open = isOfficeOpen(new Date());

  if (isFirstMessage) {
    const greetings = lang === "ar" ? GREETINGS_AR : GREETINGS_EN;
    replies.push(greetings[Math.floor(Math.random() * greetings.length)]!);
  }

  const matched = RULES.find((r) => r.match.test(userText));
  if (matched) {
    replies.push(lang === "ar" ? matched.ar : matched.en);
  } else if (!isFirstMessage) {
    replies.push(lang === "ar" ? FALLBACK_AR : FALLBACK_EN);
  }

  if (!open && !isFirstMessage) {
    replies.push(lang === "ar" ? OFFLINE_AR : OFFLINE_EN);
  }

  return replies;
}

export function botName(lang: Lang): string {
  return lang === "ar" ? "المساعد القانوني" : "Legal Assistant";
}
