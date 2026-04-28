import { Router, type IRouter } from "express";
import { asc, eq, and } from "drizzle-orm";
import { db, servicesTable } from "@workspace/db";
import { ListServicesResponse, GetServiceResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/services", async (req, res): Promise<void> => {
  const practiceAreaId = req.query.practiceAreaId
    ? parseInt(String(req.query.practiceAreaId), 10)
    : null;
  const conditions = [eq(servicesTable.isActive, true)];
  if (practiceAreaId && !Number.isNaN(practiceAreaId)) {
    conditions.push(eq(servicesTable.practiceAreaId, practiceAreaId));
  }
  const rows = await db
    .select()
    .from(servicesTable)
    .where(and(...conditions))
    .orderBy(asc(servicesTable.id));
  res.json(
    ListServicesResponse.parse(
      rows.map((r) => ({ ...r, priceEgp: Number(r.priceEgp) })),
    ),
  );
});

router.get("/services/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db.select().from(servicesTable).where(eq(servicesTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Service not found" });
    return;
  }
  res.json(GetServiceResponse.parse({ ...row, priceEgp: Number(row.priceEgp) }));
});

export default router;
