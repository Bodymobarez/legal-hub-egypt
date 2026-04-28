import { useLanguage } from "@/lib/i18n";
import { useGetPracticeArea, useListServices } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Scale, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PracticeAreaDetail() {
  const { slug } = useParams();
  const { language, t, isRtl } = useLanguage();
  
  const { data: area, isLoading: isLoadingArea } = useGetPracticeArea(slug || "");
  const { data: services, isLoading: isLoadingServices } = useListServices(
    area ? { practiceAreaId: area.id } : undefined, { query: { enabled: !!area, queryKey: [] as const } as any });

  if (isLoadingArea) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  if (!area) {
    return <div className="min-h-screen flex items-center justify-center">Practice Area Not Found</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <section className="bg-primary py-20 text-primary-foreground">
        <div className="container px-4 mx-auto">
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
            <div className="w-20 h-20 bg-primary-foreground/10 text-accent rounded-2xl flex items-center justify-center shrink-0">
              <Scale className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-serif font-bold mb-6">
                {language === "ar" ? area.nameAr : area.nameEn}
              </h1>
              <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link href="/book">{t("nav.bookConsultation")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 border-b border-border">
        <div className="container px-4 mx-auto max-w-4xl">
          <h2 className="text-2xl font-serif font-bold mb-6">{t("common.overview")}</h2>
          <div className="prose dark:prose-invert max-w-none text-muted-foreground text-lg leading-relaxed">
            {language === "ar" ? area.descriptionAr : area.descriptionEn}
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/20">
        <div className="container px-4 mx-auto max-w-5xl">
          <h2 className="text-3xl font-serif font-bold mb-8 text-center">{t("nav.services")}</h2>
          
          {isLoadingServices ? (
            <div className="flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : services && services.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {services.map((service) => (
                <div key={service.id} className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
                  <h3 className="text-xl font-bold mb-3">{language === "ar" ? service.nameAr : service.nameEn}</h3>
                  <p className="text-muted-foreground mb-4 line-clamp-2 text-sm">{language === "ar" ? service.descriptionAr : service.descriptionEn}</p>
                  <div className="flex items-center justify-between mt-4">
                    <span className="font-semibold text-accent">
                      {language === "ar" ? `${service.priceEgp} ج.م` : `EGP ${service.priceEgp}`}
                    </span>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/services/${service.id}`}>{t("common.viewDetails")}</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No specific services listed for this area yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
