import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import { db, testimonialsTable } from "@workspace/db";
import { ListTestimonialsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/testimonials", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(testimonialsTable)
    .where(eq(testimonialsTable.isPublished, true))
    .orderBy(asc(testimonialsTable.sortOrder), asc(testimonialsTable.id));
  res.json(ListTestimonialsResponse.parse(rows));
});

export default router;
