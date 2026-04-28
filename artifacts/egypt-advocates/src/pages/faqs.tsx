import { useLanguage } from "@/lib/i18n";
import { useListFaqs } from "@workspace/api-client-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function FAQs() {
  const { language, t } = useLanguage();
  const { data: faqs, isLoading } = useListFaqs();

  // Group FAQs by category
  const groupedFaqs = faqs?.reduce((acc, faq) => {
    const cat = faq.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(faq);
    return acc;
  }, {} as Record<string, typeof faqs>) || {};

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-primary py-16 text-primary-foreground mb-12">
        <div className="container mx-auto px-4 text-center">
          <HelpCircle className="w-12 h-12 mx-auto mb-6 text-accent" />
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">{t("nav.faqs")}</h1>
          <p className="text-lg opacity-90 max-w-2xl mx-auto">
            {language === "ar" 
              ? "إجابات على الأسئلة الشائعة حول خدماتنا القانونية وإجراءات التقاضي." 
              : "Answers to frequently asked questions about our legal services and litigation procedures."}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-3xl">
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i}>
                <Skeleton className="h-8 w-48 mb-4" />
                <div className="space-y-2">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : Object.keys(groupedFaqs).length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            {language === "ar" ? "لا توجد أسئلة شائعة حالياً." : "No FAQs available at the moment."}
          </div>
        ) : (
          <div className="space-y-12">
            {Object.entries(groupedFaqs).map(([category, categoryFaqs]) => (
              <div key={category}>
                <h2 className="text-2xl font-serif font-bold mb-6 text-foreground border-b border-border pb-2">
                  {category}
                </h2>
                <Accordion type="single" collapsible className="w-full">
                  {categoryFaqs.map((faq) => (
                    <AccordionItem key={faq.id} value={`item-${faq.id}`} className="border-border">
                      <AccordionTrigger className="text-left font-semibold text-lg hover:text-accent">
                        {language === "ar" ? faq.questionAr : faq.questionEn}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground leading-relaxed text-base">
                        {language === "ar" ? faq.answerAr : faq.answerEn}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
