import { Router, type IRouter } from "express";
import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db, legalCategoriesTable, legalArticlesTable } from "@workspace/db";
import {
  ListLegalCategoriesResponse,
  ListLegalArticlesResponse,
  GetLegalArticleResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function articleDto(
  a: typeof legalArticlesTable.$inferSelect,
  cat?: typeof legalCategoriesTable.$inferSelect | null,
) {
  return {
    id: a.id,
    slug: a.slug,
    categoryId: a.categoryId,
    categoryNameAr: cat?.nameAr ?? null,
    categoryNameEn: cat?.nameEn ?? null,
    titleAr: a.titleAr,
    titleEn: a.titleEn,
    summaryAr: a.summaryAr,
    summaryEn: a.summaryEn,
    contentAr: a.contentAr,
    contentEn: a.contentEn,
    lawNumber: a.lawNumber,
    year: a.year,
    tags: a.tags,
    publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
    isPublished: a.isPublished,
    createdAt: a.createdAt.toISOString(),
  };
}

router.get("/legal-categories", async (_req, res): Promise<void> => {
  const cats = await db
    .select()
    .from(legalCategoriesTable)
    .orderBy(asc(legalCategoriesTable.sortOrder), asc(legalCategoriesTable.id));
  const counts = await db
    .select({
      categoryId: legalArticlesTable.categoryId,
      c: count(),
    })
    .from(legalArticlesTable)
    .where(eq(legalArticlesTable.isPublished, true))
    .groupBy(legalArticlesTable.categoryId);
  const countMap = new Map(counts.map((r) => [r.categoryId, Number(r.c)]));
  res.json(
    ListLegalCategoriesResponse.parse(
      cats.map((c) => ({ ...c, articleCount: countMap.get(c.id) ?? 0 })),
    ),
  );
});

router.get("/legal-articles", async (req, res): Promise<void> => {
  const q = typeof req.query.q === "string" ? req.query.q : "";
  const categoryId = req.query.categoryId ? parseInt(String(req.query.categoryId), 10) : null;
  const limit = Math.min(parseInt(String(req.query.limit ?? "20"), 10) || 20, 100);
  const offset = parseInt(String(req.query.offset ?? "0"), 10) || 0;

  const conditions = [eq(legalArticlesTable.isPublished, true)];
  if (categoryId && !Number.isNaN(categoryId)) {
    conditions.push(eq(legalArticlesTable.categoryId, categoryId));
  }
  if (q.trim()) {
    const like = `%${q.trim()}%`;
    conditions.push(
      or(
        ilike(legalArticlesTable.titleAr, like),
        ilike(legalArticlesTable.titleEn, like),
        ilike(legalArticlesTable.summaryAr, like),
        ilike(legalArticlesTable.summaryEn, like),
        ilike(legalArticlesTable.contentAr, like),
        ilike(legalArticlesTable.contentEn, like),
      )!,
    );
  }
  const where = and(...conditions);

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(legalArticlesTable)
    .where(where);

  const rows = await db
    .select()
    .from(legalArticlesTable)
    .leftJoin(legalCategoriesTable, eq(legalArticlesTable.categoryId, legalCategoriesTable.id))
    .where(where)
    .orderBy(desc(legalArticlesTable.publishedAt), desc(legalArticlesTable.id))
    .limit(limit)
    .offset(offset);

  res.json(
    ListLegalArticlesResponse.parse({
      items: rows.map((r) => articleDto(r.legal_articles, r.legal_categories)),
      total: Number(total),
    }),
  );
});

router.get("/legal-articles/:slug", async (req, res): Promise<void> => {
  const slug = String(req.params.slug);
  const [row] = await db
    .select()
    .from(legalArticlesTable)
    .leftJoin(legalCategoriesTable, eq(legalArticlesTable.categoryId, legalCategoriesTable.id))
    .where(and(eq(legalArticlesTable.slug, slug), eq(legalArticlesTable.isPublished, true)));
  if (!row) {
    res.status(404).json({ error: "Article not found" });
    return;
  }
  res.json(GetLegalArticleResponse.parse(articleDto(row.legal_articles, row.legal_categories)));
});

export default router;
export { articleDto };
