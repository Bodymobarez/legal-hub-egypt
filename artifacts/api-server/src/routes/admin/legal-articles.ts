import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, legalArticlesTable, legalCategoriesTable } from "@workspace/db";
import {
  CreateAdminLegalArticleBody,
  UpdateAdminLegalArticleBody,
} from "@workspace/api-zod";
import { requireAdmin } from "../../middlewares/require-admin";
import { articleDto } from "../legal-library";

const router: IRouter = Router();
router.use(requireAdmin);

router.get("/admin/legal-articles", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(legalArticlesTable)
    .leftJoin(legalCategoriesTable, eq(legalArticlesTable.categoryId, legalCategoriesTable.id))
    .orderBy(desc(legalArticlesTable.createdAt));
  res.json(rows.map((r) => articleDto(r.legal_articles, r.legal_categories)));
});

router.post("/admin/legal-articles", async (req, res): Promise<void> => {
  const parsed = CreateAdminLegalArticleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const [row] = await db
    .insert(legalArticlesTable)
    .values({
      slug: data.slug,
      categoryId: data.categoryId,
      titleAr: data.titleAr,
      titleEn: data.titleEn,
      summaryAr: data.summaryAr,
      summaryEn: data.summaryEn,
      contentAr: data.contentAr,
      contentEn: data.contentEn,
      lawNumber: data.lawNumber ?? null,
      year: data.year ?? null,
      tags: data.tags ?? [],
      isPublished: data.isPublished ?? true,
      publishedAt: data.isPublished === false ? null : new Date(),
    })
    .returning();
  res.status(201).json(articleDto(row, null));
});

router.patch("/admin/legal-articles/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateAdminLegalArticleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const updates: Record<string, unknown> = { ...data };
  if (data.isPublished === true) updates.publishedAt = new Date();
  const [row] = await db
    .update(legalArticlesTable)
    .set(updates)
    .where(eq(legalArticlesTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(articleDto(row, null));
});

router.delete("/admin/legal-articles/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(legalArticlesTable).where(eq(legalArticlesTable.id, id));
  res.json({ message: "Deleted" });
});

export default router;
