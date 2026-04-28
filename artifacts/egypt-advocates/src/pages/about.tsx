import { useLanguage } from "@/lib/i18n";
import { useGetSiteStats, useGetSiteInfo } from "@workspace/api-client-react";
import { Scale, Users, Award, ShieldCheck } from "lucide-react";

export default function About() {
  const { language, t } = useLanguage();
  const { data: stats } = useGetSiteStats();
  const { data: siteInfo } = useGetSiteInfo();

  return (
    <div className="flex flex-col min-h-screen">
      <section className="bg-primary py-20 text-primary-foreground">
        <div className="container px-4 mx-auto text-center max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-6">{t("nav.about")}</h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 leading-relaxed">
            {language === "ar" 
              ? "نحن مؤسسة قانونية رائدة في مصر، نلتزم بتقديم أعلى مستويات الخدمة القانونية لعملائنا."
              : "We are a leading law firm in Egypt, committed to providing the highest standards of legal service to our clients."}
          </p>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="container px-4 mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <img src="/images/hero-office.png" alt="Office" className="rounded-lg shadow-xl w-full h-auto object-cover aspect-video" />
            </div>
            <div>
              <h2 className="text-3xl font-serif font-bold text-foreground mb-6">
                {language === "ar" ? "قصتنا" : "Our Story"}
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  {language === "ar" 
                    ? `تأسست ${siteInfo?.nameAr || "المؤسسة"} لتكون منارة للعدالة في مصر. لقد بنينا سمعتنا على أسس قوية من النزاهة والاحترافية والنتائج المتميزة.`
                    : `${siteInfo?.nameEn || "The firm"} was established to be a beacon of justice in Egypt. We have built our reputation on strong foundations of integrity, professionalism, and outstanding results.`}
                </p>
                <p>
                  {language === "ar"
                    ? "فريقنا من المحامين المتمرسين يقدم حلولاً قانونية مبتكرة مصممة خصيصاً لتلبية احتياجات كل عميل، سواء كانوا أفراداً أو شركات متعددة الجنسيات."
                    : "Our team of seasoned lawyers provides innovative legal solutions tailored specifically to meet the needs of each client, whether individuals or multinational corporations."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6 mt-10">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg text-primary shrink-0">
                    <Scale className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold mb-1">{language === "ar" ? "العدالة" : "Justice"}</h4>
                    <p className="text-sm text-muted-foreground">{language === "ar" ? "نسعى لتحقيق العدالة" : "We strive for justice"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg text-primary shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold mb-1">{language === "ar" ? "النزاهة" : "Integrity"}</h4>
                    <p className="text-sm text-muted-foreground">{language === "ar" ? "الشفافية في العمل" : "Transparency in work"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg text-primary shrink-0">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold mb-1">{language === "ar" ? "التميز" : "Excellence"}</h4>
                    <p className="text-sm text-muted-foreground">{language === "ar" ? "نتائج مضمونة" : "Guaranteed results"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg text-primary shrink-0">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold mb-1">{language === "ar" ? "العملاء" : "Clients"}</h4>
                    <p className="text-sm text-muted-foreground">{language === "ar" ? "العميل أولاً" : "Client first"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
