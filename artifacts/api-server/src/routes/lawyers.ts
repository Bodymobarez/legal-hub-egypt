import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import { db, lawyersTable } from "@workspace/db";
import { ListLawyersResponse, GetLawyerResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/lawyers", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(lawyersTable)
    .where(eq(lawyersTable.isActive, true))
    .orderBy(asc(lawyersTable.sortOrder), asc(lawyersTable.id));
  res.json(ListLawyersResponse.parse(rows));
});

router.get("/lawyers/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db.select().from(lawyersTable).where(eq(lawyersTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Lawyer not found" });
    return;
  }
  res.json(GetLawyerResponse.parse(row));
});

export default router;
