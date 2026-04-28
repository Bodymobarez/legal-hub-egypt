import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import { db, servicesTable } from "@workspace/db";
import {
  CreateAdminServiceBody,
  UpdateAdminServiceBody,
} from "@workspace/api-zod";
import { requireAdmin } from "../../middlewares/require-admin";

const router: IRouter = Router();
router.use(requireAdmin);

function dto(s: typeof servicesTable.$inferSelect) {
  return { ...s, priceEgp: Number(s.priceEgp) };
}

router.get("/admin/services", async (_req, res): Promise<void> => {
  const rows = await db.select().from(servicesTable).orderBy(asc(servicesTable.id));
  res.json(rows.map(dto));
});

router.post("/admin/services", async (req, res): Promise<void> => {
  const parsed = CreateAdminServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const [row] = await db
    .insert(servicesTable)
    .values({
      slug: data.slug,
      nameAr: data.nameAr,
      nameEn: data.nameEn,
      descriptionAr: data.descriptionAr,
      descriptionEn: data.descriptionEn,
      durationMinutes: data.durationMinutes,
      priceEgp: String(data.priceEgp),
      deliveryMode: data.deliveryMode,
      practiceAreaId: data.practiceAreaId ?? null,
      isActive: data.isActive ?? true,
    })
    .returning();
  res.status(201).json(dto(row));
});

router.patch("/admin/services/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateAdminServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const updates: Record<string, unknown> = { ...data };
  if (data.priceEgp != null) updates.priceEgp = String(data.priceEgp);
  const [row] = await db
    .update(servicesTable)
    .set(updates)
    .where(eq(servicesTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(dto(row));
});

router.delete("/admin/services/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(servicesTable).where(eq(servicesTable.id, id));
  res.json({ message: "Deleted" });
});

export default router;
