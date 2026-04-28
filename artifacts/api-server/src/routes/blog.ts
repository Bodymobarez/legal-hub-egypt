import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, blogPostsTable } from "@workspace/db";
import { ListBlogPostsResponse, GetBlogPostResponse } from "@workspace/api-zod";

const router: IRouter = Router();

function blogDto(p: typeof blogPostsTable.$inferSelect) {
  return {
    id: p.id,
    slug: p.slug,
    titleAr: p.titleAr,
    titleEn: p.titleEn,
    summaryAr: p.summaryAr,
    summaryEn: p.summaryEn,
    contentAr: p.contentAr,
    contentEn: p.contentEn,
    coverImageUrl: p.coverImageUrl,
    authorName: p.authorName,
    publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
    isPublished: p.isPublished,
    tags: p.tags,
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/blog-posts", async (req, res): Promise<void> => {
  const limit = Math.min(parseInt(String(req.query.limit ?? "12"), 10) || 12, 50);
  const offset = parseInt(String(req.query.offset ?? "0"), 10) || 0;
  const rows = await db
    .select()
    .from(blogPostsTable)
    .where(eq(blogPostsTable.isPublished, true))
    .orderBy(desc(blogPostsTable.publishedAt), desc(blogPostsTable.id))
    .limit(limit)
    .offset(offset);
  res.json(ListBlogPostsResponse.parse(rows.map(blogDto)));
});

router.get("/blog-posts/:slug", async (req, res): Promise<void> => {
  const slug = String(req.params.slug);
  const [row] = await db
    .select()
    .from(blogPostsTable)
    .where(and(eq(blogPostsTable.slug, slug), eq(blogPostsTable.isPublished, true)));
  if (!row) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  res.json(GetBlogPostResponse.parse(blogDto(row)));
});

export default router;
export { blogDto };
