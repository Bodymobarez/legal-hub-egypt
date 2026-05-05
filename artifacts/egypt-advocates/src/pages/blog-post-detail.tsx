import { useLanguage } from "@/lib/i18n";
import { localizedParagraphs } from "@/lib/localized-text";
import { useRoute, Link } from "wouter";
import { useGetBlogPost } from "@workspace/api-client-react";
import { Calendar, User, Tag, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function BlogPostDetail() {
  const { language, isRtl } = useLanguage();
  const [, params] = useRoute("/blog/:slug");
  const slug = params?.slug || "";

  const { data: post, isLoading, isError } = useGetBlogPost(slug, { query: { enabled: !!slug, queryKey: [] as const } as any });

  if (isLoading) {
    return <div className="min-h-[50vh] flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div></div>;
  }

  if (isError || !post) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-2xl font-serif font-bold mb-4">{language === "ar" ? "المقال غير موجود" : "Post not found"}</h2>
        <Button asChild variant="outline"><Link href="/blog">{language === "ar" ? "العودة للمدونة" : "Back to Blog"}</Link></Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {post.coverImageUrl ? (
        <div className="relative h-[40vh] md:h-[60vh] bg-primary flex items-end">
          <div className="absolute inset-0 z-0">
            <img src={post.coverImageUrl} alt="" className="w-full h-full object-cover opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/80 to-transparent"></div>
          </div>
          <div className="container relative z-10 mx-auto px-4 pb-12 max-w-4xl">
            <div className="flex flex-wrap gap-2 text-primary-foreground/80 mb-4 text-sm font-medium">
              {post.tags?.map(tag => (
                <span key={tag} className="bg-accent/20 text-accent px-2 py-1 rounded">{tag}</span>
              ))}
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-serif font-bold text-primary-foreground mb-6 leading-tight">
              {language === "ar" ? post.titleAr : post.titleEn}
            </h1>
            <div className="flex flex-wrap items-center gap-6 text-sm text-primary-foreground/90">
              {post.publishedAt && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span dir="ltr">{format(new Date(post.publishedAt), "dd MMMM yyyy")}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{post.authorName}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-muted py-16 mb-12 border-b border-border">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-6">
              <Link href="/" className="hover:text-accent transition-colors">{language === "ar" ? "الرئيسية" : "Home"}</Link>
              <span>/</span>
              <Link href="/blog" className="hover:text-accent transition-colors">{language === "ar" ? "المدونة" : "Blog"}</Link>
            </div>
            <h1 className="text-3xl md:text-5xl font-serif font-bold mb-6 leading-tight">
              {language === "ar" ? post.titleAr : post.titleEn}
            </h1>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              {post.publishedAt && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span dir="ltr">{format(new Date(post.publishedAt), "dd MMMM yyyy")}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{post.authorName}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 max-w-4xl py-12">
        <div className="prose prose-lg max-w-none prose-headings:font-serif prose-headings:text-foreground prose-p:text-muted-foreground prose-p:leading-relaxed">
          {localizedParagraphs(language, post.contentAr, post.contentEn).map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-border">
          <Button asChild variant="outline">
            <Link href="/blog" className="flex items-center gap-2">
              {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              {language === "ar" ? "العودة للمدونة" : "Back to Blog"}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
