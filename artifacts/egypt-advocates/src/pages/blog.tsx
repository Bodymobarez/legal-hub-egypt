import { useLanguage } from "@/lib/i18n";
import { Link } from "wouter";
import { useListBlogPosts } from "@workspace/api-client-react";
import { Calendar, User, ChevronRight, ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function Blog() {
  const { language, t, isRtl } = useLanguage();
  const { data: blogData, isLoading } = useListBlogPosts({ limit: 12 });

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary py-16 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">{t("nav.blog")}</h1>
          <p className="text-lg opacity-90 max-w-2xl mx-auto">
            {language === "ar" 
              ? "أحدث الأخبار القانونية والتحليلات ونصائح الخبراء من فريقنا" 
              : "The latest legal news, analysis, and expert advice from our team"}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden border-border h-full">
                <Skeleton className="h-48 w-full rounded-none" />
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-24 mb-4" />
                  <Skeleton className="h-6 w-full mb-2" />
                  <Skeleton className="h-6 w-2/3 mb-4" />
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (blogData?.length ?? 0) === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            {language === "ar" ? "لا توجد مقالات متاحة حالياً" : "No blog posts available at the moment."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {(blogData ?? []).map((post) => (
              <Card key={post.id} className="overflow-hidden border-border hover:shadow-lg transition-all hover:border-accent/50 flex flex-col group h-full">
                {post.coverImageUrl && (
                  <div className="aspect-video overflow-hidden">
                    <img 
                      src={post.coverImageUrl} 
                      alt={language === "ar" ? post.titleAr : post.titleEn} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  </div>
                )}
                <CardContent className="p-6 flex-1 flex flex-col">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                    {post.publishedAt && (
                      <span className="flex items-center gap-1" dir="ltr">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(post.publishedAt), "dd MMM yyyy")}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {post.authorName}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold font-serif mb-3 line-clamp-2 group-hover:text-accent transition-colors">
                    <Link href={`/blog/${post.slug}`}>
                      {language === "ar" ? post.titleAr : post.titleEn}
                    </Link>
                  </h2>
                  <p className="text-muted-foreground text-sm line-clamp-3 mb-6 flex-1">
                    {language === "ar" ? post.summaryAr : post.summaryEn}
                  </p>
                  <div className="mt-auto">
                    <Link href={`/blog/${post.slug}`} className="text-sm font-medium text-foreground hover:text-accent flex items-center transition-colors">
                      {t("common.readMore")}
                      {isRtl ? <ChevronLeft className="w-4 h-4 ml-1" /> : <ChevronRight className="w-4 h-4 ml-1" />}
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
