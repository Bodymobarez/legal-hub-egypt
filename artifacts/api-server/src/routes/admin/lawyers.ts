import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import { db, lawyersTable } from "@workspace/db";
import {
  CreateAdminLawyerBody,
  UpdateAdminLawyerBody,
} from "@workspace/api-zod";
import { requireAdmin } from "../../middlewares/require-admin";

const router: IRouter = Router();
router.use(requireAdmin);

router.get("/admin/lawyers", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(lawyersTable)
    .orderBy(asc(lawyersTable.sortOrder), asc(lawyersTable.id));
  res.json(rows);
});

router.post("/admin/lawyers", async (req, res): Promise<void> => {
  const parsed = CreateAdminLawyerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(lawyersTable).values(parsed.data).returning();
  res.status(201).json(row);
});

router.patch("/admin/lawyers/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateAdminLawyerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .update(lawyersTable)
    .set(parsed.data)
    .where(eq(lawyersTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(row);
});

export default router;
