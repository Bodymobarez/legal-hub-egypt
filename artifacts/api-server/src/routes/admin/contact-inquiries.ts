import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, contactInquiriesTable } from "@workspace/db";
import { requireAdmin } from "../../middlewares/require-admin";

const router: IRouter = Router();
router.use(requireAdmin);

function dto(c: typeof contactInquiriesTable.$inferSelect) {
  return { ...c, createdAt: c.createdAt.toISOString() };
}

router.get("/admin/contact-inquiries", async (req, res): Promise<void> => {
  const status = typeof req.query.status === "string" ? req.query.status : "";
  const where = status ? eq(contactInquiriesTable.status, status) : undefined;
  const rows = await db
    .select()
    .from(contactInquiriesTable)
    .where(where!)
    .orderBy(desc(contactInquiriesTable.createdAt));
  res.json(rows.map(dto));
});

router.post("/admin/contact-inquiries/:id/handle", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db
    .update(contactInquiriesTable)
    .set({ status: "handled" })
    .where(eq(contactInquiriesTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(dto(row));
});

export default router;
