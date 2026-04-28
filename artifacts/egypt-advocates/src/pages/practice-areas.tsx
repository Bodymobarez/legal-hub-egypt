import { useLanguage } from "@/lib/i18n";
import { useListPracticeAreas } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Scale, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PracticeAreas() {
  const { language, t, isRtl } = useLanguage();
  const { data: practiceAreas, isLoading } = useListPracticeAreas();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <section className="bg-primary py-20 text-primary-foreground">
        <div className="container px-4 mx-auto text-center max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-6">{t("nav.practiceAreas")}</h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 leading-relaxed">
            {language === "ar" 
              ? "نقدم خدمات قانونية شاملة في مجموعة واسعة من مجالات الممارسة."
              : "We provide comprehensive legal services across a wide range of practice areas."}
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="container px-4 mx-auto">
          {isLoading ? (
            <div className="flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {practiceAreas?.map((area) => (
                <Link key={area.id} href={`/practice-areas/${area.slug}`} className="group block h-full">
                  <div className="bg-card border border-border p-8 rounded-lg h-full transition-all hover:shadow-lg hover:border-accent/50 flex flex-col">
                    <div className="w-14 h-14 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Scale className="w-7 h-7" />
                    </div>
                    <h3 className="text-2xl font-bold font-serif mb-3 text-foreground">{language === "ar" ? area.nameAr : area.nameEn}</h3>
                    <p className="text-muted-foreground flex-1 mb-6">{language === "ar" ? area.descriptionAr : area.descriptionEn}</p>
                    <div className="flex items-center text-accent font-medium mt-auto group-hover:text-primary transition-colors">
                      {t("common.readMore")} {isRtl ? <ArrowLeft className="w-4 h-4 mr-2" /> : <ArrowRight className="w-4 h-4 ml-2" />}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
