import { useLanguage } from "@/lib/i18n";
import { localizedParagraphs } from "@/lib/localized-text";
import { useRoute, Link } from "wouter";
import { useGetLegalArticle } from "@workspace/api-client-react";
import { Calendar, Tag, ChevronRight, ChevronLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function LegalArticleDetail() {
  const { language, isRtl } = useLanguage();
  const [, params] = useRoute("/legal-library/:slug");
  const slug = params?.slug || "";

  const { data: article, isLoading, isError } = useGetLegalArticle(slug, { query: { enabled: !!slug, queryKey: [] as const } as any });

  if (isLoading) {
    return <div className="min-h-[50vh] flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div></div>;
  }

  if (isError || !article) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-2xl font-serif font-bold mb-4">{language === "ar" ? "المقال غير موجود" : "Article not found"}</h2>
        <Button asChild variant="outline"><Link href="/legal-library">{language === "ar" ? "العودة للمكتبة" : "Back to Library"}</Link></Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-muted/30 py-8 border-b border-border">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-8">
            <Link href="/" className="hover:text-accent transition-colors">{language === "ar" ? "الرئيسية" : "Home"}</Link>
            <span>/</span>
            <Link href="/legal-library" className="hover:text-accent transition-colors">{language === "ar" ? "المكتبة القانونية" : "Legal Library"}</Link>
            <span>/</span>
            <span className="text-foreground truncate max-w-[200px] md:max-w-md">
              {language === "ar" ? article.titleAr : article.titleEn}
            </span>
          </div>

          <div className="mb-4 flex items-center gap-3">
            <span className="text-xs font-medium px-3 py-1 bg-primary text-primary-foreground rounded-full">
              {language === "ar" ? article.categoryNameAr : article.categoryNameEn}
            </span>
            {article.lawNumber && (
              <span className="text-xs font-medium px-3 py-1 bg-accent/10 text-accent rounded-full flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {language === "ar" ? `قانون ${article.lawNumber}` : `Law ${article.lawNumber}`}
                {article.year && ` / ${article.year}`}
              </span>
            )}
          </div>

          <h1 className="text-3xl md:text-5xl font-serif font-bold mb-6 leading-tight">
            {language === "ar" ? article.titleAr : article.titleEn}
          </h1>

          <div className="flex items-center gap-6 text-sm text-muted-foreground border-t border-border pt-6">
            {article.publishedAt && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span dir="ltr">{format(new Date(article.publishedAt), "dd MMMM yyyy")}</span>
              </div>
            )}
            {article.tags && article.tags.length > 0 && (
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                <span>{article.tags.join(", ")}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-4xl py-12">
        <div className="prose prose-lg max-w-none prose-headings:font-serif prose-headings:text-foreground prose-p:text-muted-foreground prose-p:leading-relaxed">
          {localizedParagraphs(language, article.contentAr, article.contentEn).map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-border flex justify-between items-center">
          <Button asChild variant="outline">
            <Link href="/legal-library" className="flex items-center gap-2">
              {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              {language === "ar" ? "العودة للمكتبة" : "Back to Library"}
            </Link>
          </Button>
          <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Link href="/contact">
              {language === "ar" ? "طلب استشارة بخصوص هذا الموضوع" : "Request Consultation on this Topic"}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
