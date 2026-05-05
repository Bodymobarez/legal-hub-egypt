import { useMemo } from "react";
import { useLanguage } from "@/lib/i18n";
import { localizedParagraphs } from "@/lib/localized-text";
import { useGetPracticeArea, useListServices } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Scale, ArrowRight, ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PracticeAreaDetail() {
  const { slug } = useParams();
  const { language, t, isRtl } = useLanguage();

  const { data: area, isLoading: isLoadingArea } = useGetPracticeArea(slug || "");
  /* Same payload as /services — filter client-side so prod DB/proxy quirks on
   * `?practiceAreaId=` cannot hide services that are already grouped by area there. */
  const {
    data: allServices,
    isLoading: isLoadingServices,
    isError: servicesError,
    refetch: refetchServices,
  } = useListServices();

  const servicesForArea = useMemo(() => {
    if (!area?.id || !allServices) return undefined;
    return allServices.filter((s) => s.practiceAreaId === area.id);
  }, [area?.id, allServices]);

  const overviewParagraphs = useMemo(
    () =>
      area
        ? localizedParagraphs(language, area.descriptionAr, area.descriptionEn)
        : [],
    [area, language],
  );

  if (isLoadingArea) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!area) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-muted-foreground">{t("practiceArea.notFound")}</p>
        <Button asChild variant="outline">
          <Link href="/practice-areas">{t("nav.practiceAreas")}</Link>
        </Button>
      </div>
    );
  }

  const overviewHeading =
    language === "ar" ? "نظرة عامة" : "Overview";

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <section className="bg-primary py-20 text-primary-foreground">
        <div className="container px-4 mx-auto">
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 bg-amber-400/15 ring-1 ring-amber-400/45 shadow-[0_0_28px_-6px_rgba(251,191,36,0.55)]">
              <Scale className="w-10 h-10 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" aria-hidden />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-serif font-bold mb-6">
                {language === "ar" ? area.nameAr : area.nameEn}
              </h1>
              <Button
                asChild
                size="lg"
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                <Link href="/book">{t("nav.bookConsultation")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 border-b border-border">
        <div className="container px-4 mx-auto max-w-4xl">
          <h2 className="text-2xl font-serif font-bold mb-6">{overviewHeading}</h2>
          <div className="prose dark:prose-invert max-w-none text-muted-foreground text-lg leading-relaxed">
            {overviewParagraphs.length > 0 ? (
              overviewParagraphs.map((p, i) => (
                <p key={i} className="mb-4 last:mb-0">
                  {p}
                </p>
              ))
            ) : (
              <p className="text-muted-foreground/90">
                {language === "ar"
                  ? "لم يُضف وصف لهذا المجال بعد."
                  : "No description has been added for this practice area yet."}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/20">
        <div className="container px-4 mx-auto max-w-5xl">
          <h2 className="text-3xl font-serif font-bold mb-8 text-center">
            {t("nav.services")}
          </h2>

          {servicesError ? (
            <div className="text-center space-y-4 py-8 max-w-lg mx-auto">
              <p className="text-muted-foreground">{t("practiceArea.servicesError")}</p>
              <Button type="button" variant="outline" onClick={() => refetchServices()}>
                {t("practiceArea.retry")}
              </Button>
            </div>
          ) : isLoadingServices ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : servicesForArea && servicesForArea.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {servicesForArea.map((service) => (
                <div
                  key={service.id}
                  className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <h3 className="text-xl font-bold mb-3">
                    {language === "ar" ? service.nameAr : service.nameEn}
                  </h3>
                  <p className="text-muted-foreground mb-4 line-clamp-2 text-sm">
                    {language === "ar" ? service.descriptionAr : service.descriptionEn}
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                    <span className="text-sm text-foreground/80 inline-flex items-center gap-1.5 shrink-0">
                      <Clock
                        className="w-4 h-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      <span>
                        {typeof service.durationMinutes === "number" &&
                        Number.isFinite(service.durationMinutes)
                          ? `${service.durationMinutes} ${t("common.minutes")}`
                          : "—"}
                      </span>
                    </span>
                    <Button asChild variant="outline" size="sm" className="shrink-0">
                      <Link href={`/services/${service.id}`}>
                        {t("common.viewDetails")}
                        {isRtl ? (
                          <ArrowLeft className="w-3.5 h-3.5 ms-1" />
                        ) : (
                          <ArrowRight className="w-3.5 h-3.5 ms-1" />
                        )}
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8 space-y-4 max-w-xl mx-auto">
              <p>
                {allServices && allServices.length > 0
                  ? t("practiceArea.noServicesLinked")
                  : t("practiceArea.noServicesAtAll")}
              </p>
              <Button asChild variant="outline">
                <Link href="/services">{t("practiceArea.browseAllServices")}</Link>
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
