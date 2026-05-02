import { useLanguage } from "@/lib/i18n";
import { Link } from "wouter";
import { useListServices } from "@workspace/api-client-react";
import { Clock, ArrowRight, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Services() {
  const { language, t, isRtl } = useLanguage();
  const { data: services, isLoading } = useListServices();

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary py-16 text-primary-foreground">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">{t("nav.services")}</h1>
          <p className="text-lg opacity-90 max-w-2xl">
            {language === "ar" 
              ? "نقدم مجموعة شاملة من الخدمات القانونية والاستشارات المتخصصة لتلبية احتياجاتك." 
              : "We offer a comprehensive range of legal services and specialized consultations to meet your needs."}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
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
        ) : services?.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            {language === "ar" ? "لا توجد خدمات متاحة حالياً" : "No services available at the moment."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services?.map((service) => (
              <Link key={service.id} href={`/services/${service.id}`} className="group h-full flex">
                <Card className="overflow-hidden border-border hover:shadow-lg hover:border-accent/50 transition-all w-full flex flex-col">
                  <CardHeader className="bg-muted/30 pb-4 group-hover:bg-muted/60 transition-colors border-b border-border/50">
                    <CardTitle className="text-xl font-serif font-bold group-hover:text-accent transition-colors">
                      {language === "ar" ? service.nameAr : service.nameEn}
                    </CardTitle>
                    <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground mt-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {service.durationMinutes} {language === "ar" ? "دقيقة" : "min"}
                      </span>
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
                      {isRtl ? <ArrowLeft className="w-4 h-4 text-accent" /> : <ArrowRight className="w-4 h-4 text-accent" />}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
