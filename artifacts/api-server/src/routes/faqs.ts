import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import { db, faqsTable } from "@workspace/db";
import { ListFaqsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/faqs", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(faqsTable)
    .where(eq(faqsTable.isPublished, true))
    .orderBy(asc(faqsTable.sortOrder), asc(faqsTable.id));
  res.json(ListFaqsResponse.parse(rows));
});

export default router;
