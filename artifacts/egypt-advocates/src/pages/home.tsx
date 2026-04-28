import { useLanguage } from "@/lib/i18n";
import { Link } from "wouter";
import { useGetSiteInfo, useGetSiteStats, useListPracticeAreas, useListLawyers, useListTestimonials, useListBlogPosts, useGetWorkHoursStatus } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Clock, MapPin, Phone, CheckCircle, Scale, Shield, Users, BookOpen } from "lucide-react";

export default function Home() {
  const { language, t, isRtl } = useLanguage();
  const { data: siteInfo } = useGetSiteInfo();
  const { data: stats } = useGetSiteStats();
  const { data: practiceAreas } = useListPracticeAreas();
  const { data: lawyers } = useListLawyers();
  const { data: testimonials } = useListTestimonials();
  const { data: blogPosts } = useListBlogPosts();
  const { data: workHours } = useGetWorkHoursStatus();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-primary text-primary-foreground py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src="/images/hero-office.png" alt="Law Office" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-primary/50"></div>
        </div>
        <div className="container relative z-10 px-4 mx-auto">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold mb-6 leading-tight">
              {language === "ar" ? siteInfo?.nameAr : siteInfo?.nameEn}
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/90 mb-8 max-w-2xl leading-relaxed">
              {language === "ar" ? siteInfo?.taglineAr : siteInfo?.taglineEn}
            </p>
            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href="/book">{t("nav.bookConsultation")}</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-transparent border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10">
                <Link href="/services">{t("nav.services")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Work Hours Indicator */}
      {workHours && (
        <div className="bg-secondary text-secondary-foreground py-3 border-y border-border">
          <div className="container px-4 mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 text-sm font-medium">
            <Clock className="w-4 h-4 text-accent" />
            <span className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${workHours.isOpen ? "bg-green-500" : "bg-destructive"}`}></span>
              {workHours.isOpen ? t("chat.supportOnline") : t("chat.supportOffline")}
            </span>
            {workHours.nextOpenAt && !workHours.isOpen && (
              <span className="text-muted-foreground ml-2">
                (Opens at {new Date(workHours.nextOpenAt).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Stats Section */}
      <section className="py-16 bg-background">
        <div className="container px-4 mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <h3 className="text-4xl font-serif font-bold text-accent mb-2">{stats?.yearsOfExperience || 15}+</h3>
              <p className="text-muted-foreground font-medium">{t("about.yearsExperience")}</p>
            </div>
            <div className="text-center">
              <h3 className="text-4xl font-serif font-bold text-accent mb-2">{stats?.casesHandled || 1000}+</h3>
              <p className="text-muted-foreground font-medium">{t("about.casesHandled")}</p>
            </div>
            <div className="text-center">
              <h3 className="text-4xl font-serif font-bold text-accent mb-2">{stats?.satisfiedClients || 950}+</h3>
              <p className="text-muted-foreground font-medium">{t("about.satisfiedClients")}</p>
            </div>
            <div className="text-center">
              <h3 className="text-4xl font-serif font-bold text-accent mb-2">{stats?.successRate || 98}%</h3>
              <p className="text-muted-foreground font-medium">{t("about.successRate")}</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Featured Practice Areas */}
      <section className="py-20 bg-muted/30">
        <div className="container px-4 mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-serif font-bold text-foreground mb-4">{t("nav.practiceAreas")}</h2>
            <p className="text-muted-foreground">Expert legal representation across multiple domains.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {practiceAreas?.slice(0, 6).map((area) => (
              <Link key={area.id} href={`/practice-areas/${area.slug}`} className="group block h-full">
                <div className="bg-card border border-border p-6 rounded-lg h-full transition-all hover:shadow-md hover:border-accent/50">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Scale className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{language === "ar" ? area.nameAr : area.nameEn}</h3>
                  <p className="text-muted-foreground line-clamp-3">{language === "ar" ? area.descriptionAr : area.descriptionEn}</p>
                  <div className="mt-4 flex items-center text-accent font-medium text-sm">
                    {t("common.readMore")} {isRtl ? <ArrowLeft className="w-4 h-4 mr-1" /> : <ArrowRight className="w-4 h-4 ml-1" />}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-10">
            <Button asChild variant="outline">
              <Link href="/practice-areas">{t("common.viewAll")}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Lawyers Section */}
      <section className="py-20 bg-background">
        <div className="container px-4 mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-serif font-bold text-foreground mb-4">{t("nav.lawyers")}</h2>
            <p className="text-muted-foreground">Meet our dedicated team of legal professionals.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {lawyers?.slice(0, 3).map((lawyer) => (
              <Link key={lawyer.id} href={`/lawyers/${lawyer.id}`} className="group block">
                <div className="bg-card rounded-lg overflow-hidden border border-border transition-all hover:shadow-lg">
                  <div className="aspect-[4/5] bg-muted relative">
                    <img src={lawyer.photoUrl || "/images/lawyer-male.png"} alt={lawyer.nameEn} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-6 text-center">
                    <h3 className="text-xl font-bold font-serif mb-1">{language === "ar" ? lawyer.nameAr : lawyer.nameEn}</h3>
                    <p className="text-accent font-medium mb-3">{language === "ar" ? lawyer.titleAr : lawyer.titleEn}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
