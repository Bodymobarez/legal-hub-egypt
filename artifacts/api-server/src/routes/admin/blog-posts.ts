import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, blogPostsTable } from "@workspace/db";
import {
  CreateAdminBlogPostBody,
  UpdateAdminBlogPostBody,
} from "@workspace/api-zod";
import { requireAdmin } from "../../middlewares/require-admin";
import { blogDto } from "../blog";

const router: IRouter = Router();
router.use(requireAdmin);

router.get("/admin/blog-posts", async (_req, res): Promise<void> => {
  const rows = await db.select().from(blogPostsTable).orderBy(desc(blogPostsTable.createdAt));
  res.json(rows.map(blogDto));
});

router.post("/admin/blog-posts", async (req, res): Promise<void> => {
  const parsed = CreateAdminBlogPostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const [row] = await db
    .insert(blogPostsTable)
    .values({
      slug: data.slug,
      titleAr: data.titleAr,
      titleEn: data.titleEn,
      summaryAr: data.summaryAr,
      summaryEn: data.summaryEn,
      contentAr: data.contentAr,
      contentEn: data.contentEn,
      coverImageUrl: data.coverImageUrl ?? null,
      authorName: data.authorName,
      tags: data.tags ?? [],
      isPublished: data.isPublished ?? true,
      publishedAt: data.isPublished === false ? null : new Date(),
    })
    .returning();
  res.status(201).json(blogDto(row));
});

router.patch("/admin/blog-posts/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateAdminBlogPostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const updates: Record<string, unknown> = { ...data };
  if (data.isPublished === true) updates.publishedAt = new Date();
  const [row] = await db
    .update(blogPostsTable)
    .set(updates)
    .where(eq(blogPostsTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(blogDto(row));
});

router.delete("/admin/blog-posts/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(blogPostsTable).where(eq(blogPostsTable.id, id));
  res.json({ message: "Deleted" });
});

export default router;
