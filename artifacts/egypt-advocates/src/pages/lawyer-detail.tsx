import { useLanguage } from "@/lib/i18n";
import { useRoute } from "wouter";
import { useGetLawyer } from "@workspace/api-client-react";
import { Mail, Phone, ArrowRight, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function LawyerDetail() {
  const { language, t, isRtl } = useLanguage();
  const [, params] = useRoute("/lawyers/:id");
  const lawyerId = parseInt(params?.id || "0");

  const { data: lawyer, isLoading, isError } = useGetLawyer(lawyerId, { query: { enabled: !!lawyerId, queryKey: [] as const } as any });

  if (isLoading) {
    return <div className="min-h-[50vh] flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div></div>;
  }

  if (isError || !lawyer) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-2xl font-serif font-bold mb-4">{language === "ar" ? "المحامي غير موجود" : "Lawyer not found"}</h2>
        <Button asChild variant="outline"><Link href="/lawyers">{language === "ar" ? "العودة للقائمة" : "Back to Lawyers"}</Link></Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-muted py-8 mb-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-accent">{t("nav.home")}</Link>
            <span>/</span>
            <Link href="/lawyers" className="hover:text-accent">{t("nav.lawyers")}</Link>
            <span>/</span>
            <span className="text-foreground">{language === "ar" ? lawyer.nameAr : lawyer.nameEn}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Sidebar / Photo */}
          <div className="lg:col-span-4">
            <div className="bg-card border border-border p-4 rounded-xl sticky top-28">
              <div className="aspect-[3/4] bg-muted mb-6 rounded-lg overflow-hidden">
                <img 
                  src={lawyer.photoUrl || "/images/lawyer-male.png"} 
                  alt={lawyer.nameEn} 
                  className="w-full h-full object-cover" 
                />
              </div>
              <h1 className="text-2xl font-serif font-bold text-foreground mb-1 text-center">
                {language === "ar" ? lawyer.nameAr : lawyer.nameEn}
              </h1>
              <p className="text-accent font-medium text-center mb-6">
                {language === "ar" ? lawyer.titleAr : lawyer.titleEn}
              </p>

              <div className="space-y-4 border-t border-border pt-6">
                {lawyer.email && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{language === "ar" ? "البريد الإلكتروني" : "Email"}</p>
                      <a href={`mailto:${lawyer.email}`} className="text-sm font-medium hover:text-accent">{lawyer.email}</a>
                    </div>
                  </div>
                )}
                {lawyer.phone && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{language === "ar" ? "رقم الهاتف" : "Phone"}</p>
                      <a href={`tel:${lawyer.phone}`} dir="ltr" className="text-sm font-medium hover:text-accent block text-left">{lawyer.phone}</a>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8">
                <Button asChild className="w-full">
                  <Link href={`/book?lawyerId=${lawyer.id}`}>{t("nav.bookConsultation")}</Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-8 py-4">
            <div className="mb-12">
              <h2 className="text-2xl font-serif font-bold mb-6 flex items-center gap-3">
                <span className="w-8 h-1 bg-accent inline-block"></span>
                {language === "ar" ? "السيرة الذاتية" : "Biography"}
              </h2>
              <div className="prose max-w-none text-muted-foreground leading-relaxed">
                {(language === "ar" ? lawyer.bioAr : lawyer.bioEn).split('\n').map((paragraph, i) => (
                  <p key={i} className="mb-4">{paragraph}</p>
                ))}
              </div>
            </div>

            {lawyer.specializations && lawyer.specializations.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-serif font-bold mb-6 flex items-center gap-3">
                  <span className="w-8 h-1 bg-accent inline-block"></span>
                  {language === "ar" ? "مجالات التخصص" : "Areas of Expertise"}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {lawyer.specializations.map((spec, i) => (
                    <span key={i} className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium">
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
