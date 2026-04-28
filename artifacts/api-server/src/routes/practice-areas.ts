import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import { db, practiceAreasTable } from "@workspace/db";
import { ListPracticeAreasResponse, GetPracticeAreaResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/practice-areas", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(practiceAreasTable)
    .where(eq(practiceAreasTable.isActive, true))
    .orderBy(asc(practiceAreasTable.sortOrder), asc(practiceAreasTable.id));
  res.json(ListPracticeAreasResponse.parse(rows));
});

router.get("/practice-areas/:slug", async (req, res): Promise<void> => {
  const slug = String(req.params.slug);
  const [row] = await db
    .select()
    .from(practiceAreasTable)
    .where(eq(practiceAreasTable.slug, slug));
  if (!row) {
    res.status(404).json({ error: "Practice area not found" });
    return;
  }
  res.json(GetPracticeAreaResponse.parse(row));
});

export default router;
