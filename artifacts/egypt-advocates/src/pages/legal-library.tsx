import { useLanguage } from "@/lib/i18n";
import { Link, useSearch } from "wouter";
import { useListLegalArticles, useListLegalCategories } from "@workspace/api-client-react";
import { Search, BookOpen, ChevronRight, ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { format } from "date-fns";

export default function LegalLibrary() {
  const { language, t, isRtl } = useLanguage();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  
  const initialQ = params.get("q") || "";
  const initialCategory = params.get("categoryId") ? parseInt(params.get("categoryId") as string) : undefined;
  
  const [q, setQ] = useState(initialQ);
  const [searchInput, setSearchInput] = useState(initialQ);
  const [categoryId, setCategoryId] = useState<number | undefined>(initialCategory);

  const { data: categories } = useListLegalCategories();
  
  const { data: articlesData, isLoading } = useListLegalArticles({
    q: q || undefined,
    categoryId: categoryId,
    limit: 12,
    offset: 0
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQ(searchInput);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary py-16 text-primary-foreground">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">{t("nav.legalLibrary")}</h1>
          <p className="text-lg opacity-90 max-w-2xl mb-8">
            {language === "ar" 
              ? "مكتبة قانونية شاملة تضم أحدث التشريعات والمقالات والأبحاث القانونية." 
              : "A comprehensive legal library featuring the latest legislation, articles, and legal research."}
          </p>
          
          <form onSubmit={handleSearch} className="relative max-w-xl">
            <Input 
              className="bg-card text-foreground pl-12 pr-4 py-6 text-lg rounded-xl border-0 shadow-lg"
              placeholder={language === "ar" ? "ابحث في المكتبة القانونية..." : "Search the legal library..."}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-6 h-6" />
            <Button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 bg-accent hover:bg-accent/90 text-accent-foreground">
              {t("common.search")}
            </Button>
          </form>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Categories */}
          <div className="lg:col-span-1">
            <div className="bg-muted/30 border border-border rounded-xl p-6 sticky top-28">
              <h3 className="font-serif font-bold text-xl mb-4 pb-2 border-b border-border">
                {language === "ar" ? "التصنيفات" : "Categories"}
              </h3>
              <ul className="space-y-2">
                <li>
                  <button 
                    onClick={() => setCategoryId(undefined)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex justify-between items-center ${
                      categoryId === undefined 
                        ? "bg-primary text-primary-foreground font-medium" 
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <span>{language === "ar" ? "الكل" : "All"}</span>
                  </button>
                </li>
                {categories?.map((cat) => (
                  <li key={cat.id}>
                    <button 
                      onClick={() => setCategoryId(cat.id)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex justify-between items-center ${
                        categoryId === cat.id 
                          ? "bg-primary text-primary-foreground font-medium" 
                          : "hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      <span>{language === "ar" ? cat.nameAr : cat.nameEn}</span>
                      <span className="text-xs bg-background/20 px-2 py-0.5 rounded-full">{cat.articleCount}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <Card key={i} className="border-border">
                    <CardContent className="p-6">
                      <Skeleton className="h-4 w-24 mb-4" />
                      <Skeleton className="h-6 w-full mb-3" />
                      <Skeleton className="h-20 w-full mb-4" />
                      <Skeleton className="h-4 w-32" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : articlesData?.items.length === 0 ? (
              <div className="text-center py-20 bg-muted/10 border border-dashed border-border rounded-xl">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-bold mb-2">{language === "ar" ? "لم يتم العثور على نتائج" : "No results found"}</h3>
                <p className="text-muted-foreground">{language === "ar" ? "جرب استخدام كلمات بحث مختلفة أو تغيير التصنيف" : "Try using different keywords or changing the category"}</p>
                {(q || categoryId) && (
                  <Button variant="outline" className="mt-4" onClick={() => { setQ(""); setSearchInput(""); setCategoryId(undefined); }}>
                    {language === "ar" ? "مسح التصفية" : "Clear filters"}
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="mb-6 flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {language === "ar" 
                      ? `تم العثور على ${articlesData?.total || 0} مقال` 
                      : `Found ${articlesData?.total || 0} articles`}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {articlesData?.items.map((article) => (
                    <Card key={article.id} className="border-border hover:shadow-md transition-shadow">
                      <CardContent className="p-6 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-4">
                          <span className="text-xs font-medium px-2.5 py-1 bg-accent/10 text-accent rounded-full">
                            {language === "ar" ? article.categoryNameAr : article.categoryNameEn}
                          </span>
                          {article.publishedAt && (
                            <span className="text-xs text-muted-foreground" dir="ltr">
                              {format(new Date(article.publishedAt), "MMM yyyy")}
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl font-bold font-serif mb-3 line-clamp-2">
                          <Link href={`/legal-library/${article.slug}`} className="hover:text-accent transition-colors">
                            {language === "ar" ? article.titleAr : article.titleEn}
                          </Link>
                        </h3>
                        <p className="text-muted-foreground text-sm line-clamp-3 mb-6 flex-1">
                          {language === "ar" ? article.summaryAr : article.summaryEn}
                        </p>
                        <div className="mt-auto pt-4 border-t border-border flex justify-between items-center">
                          <Link href={`/legal-library/${article.slug}`} className="text-sm font-medium text-foreground hover:text-accent flex items-center transition-colors">
                            {t("common.readMore")}
                            {isRtl ? <ChevronLeft className="w-4 h-4 ml-1" /> : <ChevronRight className="w-4 h-4 ml-1" />}
                          </Link>
                          {article.lawNumber && (
                            <span className="text-xs text-muted-foreground border px-2 py-1 rounded-md">
                              {language === "ar" ? `قانون ${article.lawNumber}` : `Law ${article.lawNumber}`}
                              {article.year && ` / ${article.year}`}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
