import { useLanguage } from "@/lib/i18n";
import { Link } from "wouter";
import { useListLawyers } from "@workspace/api-client-react";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Lawyers() {
  const { language, t, isRtl } = useLanguage();
  const { data: lawyers, isLoading } = useListLawyers();

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary py-16 text-primary-foreground">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">{t("nav.lawyers")}</h1>
          <p className="text-lg opacity-90 max-w-2xl">
            {language === "ar" 
              ? "تعرف على فريقنا من المحامين والمستشارين القانونيين ذوي الخبرة" 
              : "Meet our team of experienced lawyers and legal consultants"}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden border-border h-full">
                <Skeleton className="h-[300px] w-full rounded-none" />
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-2/3 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : lawyers?.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            {language === "ar" ? "لا يوجد محامين متاحين حالياً" : "No lawyers available at the moment."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {lawyers?.map((lawyer) => (
              <Link key={lawyer.id} href={`/lawyers/${lawyer.id}`} className="group h-full flex">
                <Card className="overflow-hidden border-border hover:shadow-lg transition-all hover:border-accent/50 w-full flex flex-col">
                  <div className="aspect-[4/5] bg-muted relative shrink-0">
                    <img 
                      src={lawyer.photoUrl || "/images/lawyer-male.png"} 
                      alt={lawyer.nameEn} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  </div>
                  <CardContent className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-bold font-serif mb-1 group-hover:text-accent transition-colors">
                      {language === "ar" ? lawyer.nameAr : lawyer.nameEn}
                    </h3>
                    <p className="text-accent font-medium mb-4 text-sm">
                      {language === "ar" ? lawyer.titleAr : lawyer.titleEn}
                    </p>
                    <div className="mt-auto flex items-center text-sm font-medium text-muted-foreground group-hover:text-accent transition-colors">
                      {t("common.readMore")}
                      {isRtl ? <ArrowLeft className="w-4 h-4 ml-1" /> : <ArrowRight className="w-4 h-4 ml-1" />}
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
