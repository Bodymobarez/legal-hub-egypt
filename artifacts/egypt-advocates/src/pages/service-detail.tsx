import { useLanguage } from "@/lib/i18n";
import { useRoute, Link } from "wouter";
import { useGetService } from "@workspace/api-client-react";
import { Clock, Monitor, Building2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ServiceDetail() {
  const { language, t } = useLanguage();
  const [, params] = useRoute("/services/:id");
  const serviceId = parseInt(params?.id || "0");

  const { data: service, isLoading, isError } = useGetService(serviceId, { query: { enabled: !!serviceId, queryKey: [] as const } as any });

  if (isLoading) {
    return <div className="min-h-[50vh] flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div></div>;
  }

  if (isError || !service) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-2xl font-serif font-bold mb-4">{language === "ar" ? "الخدمة غير موجودة" : "Service not found"}</h2>
        <Button asChild variant="outline"><Link href="/services">{language === "ar" ? "العودة للخدمات" : "Back to Services"}</Link></Button>
      </div>
    );
  }

  const modeLabels: Record<string, string> = {
    online: language === "ar" ? "عن بعد (أونلاين)" : "Online",
    in_office: language === "ar" ? "في المكتب" : "In-Office",
    both: language === "ar" ? "عن بعد وفي المكتب" : "Online & In-Office",
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-primary py-16 text-primary-foreground mb-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 text-sm text-primary-foreground/70 mb-6">
            <Link href="/" className="hover:text-white transition-colors">{t("nav.home")}</Link>
            <span>/</span>
            <Link href="/services" className="hover:text-white transition-colors">{t("nav.services")}</Link>
            <span>/</span>
            <span className="text-white">{language === "ar" ? service.nameAr : service.nameEn}</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-serif font-bold mb-6 max-w-3xl leading-tight">
            {language === "ar" ? service.nameAr : service.nameEn}
          </h1>
        </div>
      </div>

      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8">
            <h2 className="text-2xl font-serif font-bold mb-6 flex items-center gap-3">
              <span className="w-8 h-1 bg-accent inline-block"></span>
              {language === "ar" ? "تفاصيل الخدمة" : "Service Details"}
            </h2>
            <div className="prose max-w-none text-muted-foreground leading-relaxed text-lg">
              {(language === "ar" ? service.descriptionAr : service.descriptionEn).split('\n').map((p, i) => (
                <p key={i} className="mb-4">{p}</p>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="bg-card border border-border p-6 rounded-xl sticky top-28 shadow-sm">
              <h3 className="font-serif font-bold text-xl mb-6 pb-4 border-b border-border">
                {language === "ar" ? "ملخص الخدمة" : "Service Summary"}
              </h3>
              
              <div className="space-y-6 mb-8">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{language === "ar" ? "المدة" : "Duration"}</p>
                    <p className="font-bold text-foreground">{service.durationMinutes} {language === "ar" ? "دقيقة" : "Minutes"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{language === "ar" ? "السعر" : "Price"}</p>
                    <p className="font-bold text-foreground">
                      {new Intl.NumberFormat(language === "ar" ? "ar-EG" : "en-EG", { style: "currency", currency: "EGP" }).format(service.priceEgp)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0">
                    {service.deliveryMode === 'online' ? <Monitor className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{language === "ar" ? "طريقة تقديم الخدمة" : "Delivery Mode"}</p>
                    <p className="font-bold text-foreground">{modeLabels[service.deliveryMode]}</p>
                  </div>
                </div>
              </div>

              <Button asChild size="lg" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-base">
                <Link href={`/book?serviceId=${service.id}`}>{t("nav.bookConsultation")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
