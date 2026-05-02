import { Router, type IRouter } from "express";
import { and, desc, eq, gte, ilike, lt, or } from "drizzle-orm";
import {
  db,
  appointmentsTable,
  servicesTable,
  lawyersTable,
  clientsTable,
} from "@workspace/db";
import {
  UpdateAdminAppointmentBody,
  ApproveAppointmentBody,
  RejectAppointmentBody,
} from "@workspace/api-zod";
import { requireAdmin } from "../../middlewares/require-admin";
import { appointmentToDto } from "../appointments";

const router: IRouter = Router();
router.use(requireAdmin);

const APPOINTMENT_STATUSES = ["pending", "approved", "rejected", "completed", "cancelled"] as const;
type AppointmentStatusLiteral = (typeof APPOINTMENT_STATUSES)[number];

/**
 * Ensure a client record exists for an approved appointment.
 *
 * Behaviour:
 *   - If a client with the same (case-insensitive) email *or* matching phone
 *     already exists, do nothing (we don't want to demote an active client
 *     back to "lead" or duplicate them).
 *   - Otherwise insert a new lead record sourced from the appointment.
 *
 * Always swallows errors — failing to create the lead must NEVER block
 * the appointment update itself.
 */
async function ensureClientFromAppointment(
  apt: typeof appointmentsTable.$inferSelect,
): Promise<void> {
  try {
    const email = (apt.clientEmail ?? "").trim();
    const phone = (apt.clientPhone ?? "").trim();
    if (!email && !phone) return;

    const conditions = [];
    if (email) conditions.push(ilike(clientsTable.email, email));
    if (phone) conditions.push(eq(clientsTable.phone, phone));
    const where = conditions.length > 1 ? or(...conditions)! : conditions[0];

    const existing = where
      ? await db.select().from(clientsTable).where(where).limit(1)
      : [];

    if (existing.length > 0) return;

    const noteParts: string[] = [
      `Auto-created from appointment #${apt.id}`,
      apt.scheduledAt ? `scheduled ${apt.scheduledAt.toISOString()}` : null,
      apt.notes ? `Initial notes: ${apt.notes}` : null,
    ].filter(Boolean) as string[];

    await db.insert(clientsTable).values({
      fullName: apt.clientName,
      email,
      phone,
      source: "appointment",
      status: "lead",
      notes: noteParts.join(" · "),
    });
  } catch (e) {
    /* Don't break the approval flow — the appointment update has already happened. */
    console.warn("[ensureClientFromAppointment] failed:", e);
  }
}

function statusFromBody(
  data: { status?: string | undefined },
  raw: unknown,
): AppointmentStatusLiteral | undefined {
  if (data.status && (APPOINTMENT_STATUSES as readonly string[]).includes(data.status)) {
    return data.status as AppointmentStatusLiteral;
  }
  if (raw && typeof raw === "object" && "status" in raw) {
    const s = (raw as { status?: unknown }).status;
    if (typeof s === "string" && (APPOINTMENT_STATUSES as readonly string[]).includes(s)) {
      return s as AppointmentStatusLiteral;
    }
  }
  return undefined;
}

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
  try {
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
    /** Prefer parsed fields; fall back to raw `status` if bundler inlined an older Zod schema. */
    const nextStatus = statusFromBody(data, req.body);

    const patch: Partial<{
      scheduledAt: Date;
      lawyerId: number | null;
      notes: string | null;
      meetingLink: string | null;
      status: string;
    }> = {};
    if (data.scheduledAt !== undefined) patch.scheduledAt = new Date(data.scheduledAt);
    if (data.lawyerId !== undefined) patch.lawyerId = data.lawyerId;
    if (data.notes !== undefined) patch.notes = data.notes;
    if (data.meetingLink !== undefined) patch.meetingLink = data.meetingLink;
    if (nextStatus !== undefined) patch.status = nextStatus;

    if (Object.keys(patch).length === 0) {
      const [existing] = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, id));
      if (!existing) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const { service, lawyer } = await loadDeps(existing);
      res.json(appointmentToDto(existing, service, lawyer));
      return;
    }

    /* Detect whether THIS update transitioned the status into "approved"
       so we can mirror the client-creation behaviour the approve endpoint has. */
    const [previous] = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, id));

    const [row] = await db
      .update(appointmentsTable)
      .set(patch)
      .where(eq(appointmentsTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    if (
      patch.status === "approved" &&
      (!previous || previous.status !== "approved")
    ) {
      await ensureClientFromAppointment(row);
    }

    const { service, lawyer } = await loadDeps(row);
    res.json(appointmentToDto(row, service, lawyer));
  } catch (e) {
    console.error("[PATCH /admin/appointments/:id]", e);
    const detail =
      process.env.NODE_ENV !== "production" && e instanceof Error ? e.message : undefined;
    res.status(500).json({
      error: "Failed to update appointment",
      ...(detail ? { detail } : {}),
    });
  }
});

router.post("/admin/appointments/:id/approve", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = ApproveAppointmentBody.safeParse(req.body ?? {});
  const meetingLink = parsed.success ? (parsed.data.meetingLink ?? null) : null;

  const [previous] = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, id));

  const [row] = await db
    .update(appointmentsTable)
    .set({ status: "approved", meetingLink })
    .where(eq(appointmentsTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (!previous || previous.status !== "approved") {
    await ensureClientFromAppointment(row);
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
