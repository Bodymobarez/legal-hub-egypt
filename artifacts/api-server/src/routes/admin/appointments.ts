import { Router, type IRouter } from "express";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { db, appointmentsTable, servicesTable, lawyersTable } from "@workspace/db";
import {
  UpdateAdminAppointmentBody,
  ApproveAppointmentBody,
  RejectAppointmentBody,
} from "@workspace/api-zod";
import { requireAdmin } from "../../middlewares/require-admin";
import { appointmentToDto } from "../appointments";

const router: IRouter = Router();
router.use(requireAdmin);

async function loadDeps(a: typeof appointmentsTable.$inferSelect) {
  const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, a.serviceId));
  let lawyer: typeof lawyersTable.$inferSelect | null = null;
  if (a.lawyerId) {
    const [l] = await db.select().from(lawyersTable).where(eq(lawyersTable.id, a.lawyerId));
    lawyer = l ?? null;
  }
  return { service: service ?? null, lawyer };
}

router.get("/admin/appointments", async (req, res): Promise<void> => {
  const status = typeof req.query.status === "string" ? req.query.status : "";
  const from = typeof req.query.from === "string" ? req.query.from : "";
  const to = typeof req.query.to === "string" ? req.query.to : "";
  const conditions = [];
  if (status) conditions.push(eq(appointmentsTable.status, status));
  if (from) conditions.push(gte(appointmentsTable.scheduledAt, new Date(`${from}T00:00:00+02:00`)));
  if (to) conditions.push(lt(appointmentsTable.scheduledAt, new Date(`${to}T23:59:59+02:00`)));
  const base = db
    .select()
    .from(appointmentsTable)
    .leftJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
    .leftJoin(lawyersTable, eq(appointmentsTable.lawyerId, lawyersTable.id));

  const rows = conditions.length
    ? await base.where(and(...conditions)).orderBy(desc(appointmentsTable.scheduledAt))
    : await base.orderBy(desc(appointmentsTable.scheduledAt));

  res.json(rows.map((r) => appointmentToDto(r.appointments, r.services, r.lawyers)));
});

router.get("/admin/appointments/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [a] = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, id));
    if (!a) {
      res.status(404).json({ error: "Appointment not found" });
      return;
    }
    const { service, lawyer } = await loadDeps(a);
    res.json(appointmentToDto(a, service, lawyer));
  } catch (e) {
    console.error("[GET /admin/appointments/:id]", e);
    res.status(500).json({ error: "Failed to load appointment" });
  }
});

router.patch("/admin/appointments/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateAdminAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const updates: Record<string, unknown> = {};
  if (data.scheduledAt) updates.scheduledAt = new Date(data.scheduledAt);
  if (data.lawyerId !== undefined) updates.lawyerId = data.lawyerId;
  if (data.notes !== undefined) updates.notes = data.notes;
  if (data.meetingLink !== undefined) updates.meetingLink = data.meetingLink;
  if (data.status !== undefined) updates.status = data.status;
  if (Object.keys(updates).length === 0) {
    const [existing] = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const { service, lawyer } = await loadDeps(existing);
    res.json(appointmentToDto(existing, service, lawyer));
    return;
  }
  const [row] = await db
    .update(appointmentsTable)
    .set(updates)
    .where(eq(appointmentsTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const { service, lawyer } = await loadDeps(row);
  res.json(appointmentToDto(row, service, lawyer));
});

router.post("/admin/appointments/:id/approve", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = ApproveAppointmentBody.safeParse(req.body ?? {});
  const meetingLink = parsed.success ? (parsed.data.meetingLink ?? null) : null;
  const [row] = await db
    .update(appointmentsTable)
    .set({ status: "approved", meetingLink })
    .where(eq(appointmentsTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const { service, lawyer } = await loadDeps(row);
  res.json(appointmentToDto(row, service, lawyer));
});

router.post("/admin/appointments/:id/reject", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = RejectAppointmentBody.safeParse(req.body ?? {});
  const reason = parsed.success ? (parsed.data.reason ?? null) : null;
  const [row] = await db
    .update(appointmentsTable)
    .set({ status: "rejected", notes: reason ?? undefined })
    .where(eq(appointmentsTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const { service, lawyer } = await loadDeps(row);
  res.json(appointmentToDto(row, service, lawyer));
});

router.post("/admin/appointments/:id/complete", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db
    .update(appointmentsTable)
    .set({ status: "completed" })
    .where(eq(appointmentsTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const { service, lawyer } = await loadDeps(row);
  res.json(appointmentToDto(row, service, lawyer));
});

export default router;
