import { Router, type IRouter } from "express";
import { and, eq, gte, lt } from "drizzle-orm";
import { db, appointmentsTable, servicesTable, lawyersTable, paymentsTable } from "@workspace/db";
import {
  CreateAppointmentBody,
  GetAvailabilityResponse,
} from "@workspace/api-zod";
import { generateTimeSlots } from "../lib/work-hours";

const router: IRouter = Router();

/** DB / drivers may return timestamps as Date or ISO string — normalize for JSON. */
function toIsoUtc(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (value === null || value === undefined) return new Date(0).toISOString();
  const d = new Date(value as string | number);
  return Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
}

function appointmentToDto(
  a: typeof appointmentsTable.$inferSelect,
  service?: typeof servicesTable.$inferSelect | null,
  lawyer?: typeof lawyersTable.$inferSelect | null,
) {
  const amt = a.amountEgp;
  const amountEgp =
    typeof amt === "number" ? amt : typeof amt === "bigint" ? Number(amt) : Number.parseFloat(String(amt ?? 0));
  return {
    id: a.id,
    clientName: a.clientName,
    clientEmail: a.clientEmail,
    clientPhone: a.clientPhone,
    serviceId: a.serviceId,
    serviceNameAr: service?.nameAr ?? null,
    serviceNameEn: service?.nameEn ?? null,
    lawyerId: a.lawyerId,
    lawyerNameAr: lawyer?.nameAr ?? null,
    lawyerNameEn: lawyer?.nameEn ?? null,
    scheduledAt: toIsoUtc(a.scheduledAt),
    durationMinutes: Number(a.durationMinutes ?? 60),
    mode: a.mode,
    notes: a.notes,
    status: a.status,
    meetingLink: a.meetingLink,
    paymentMethod: a.paymentMethod,
    paymentStatus: a.paymentStatus,
    paymentReference: a.paymentReference,
    amountEgp: Number.isFinite(amountEgp) ? amountEgp : 0,
    language: a.language,
    createdAt: toIsoUtc(a.createdAt),
  };
}

router.get("/appointments/availability", async (req, res): Promise<void> => {
  const dateStr = String(req.query.date ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    res.status(400).json({ error: "Invalid date" });
    return;
  }
  const dayStart = new Date(`${dateStr}T00:00:00+02:00`);
  const dayEnd = new Date(`${dateStr}T23:59:59+02:00`);
  const slots = generateTimeSlots(dayStart);

  const taken = await db
    .select({ scheduledAt: appointmentsTable.scheduledAt })
    .from(appointmentsTable)
    .where(
      and(
        gte(appointmentsTable.scheduledAt, dayStart),
        lt(appointmentsTable.scheduledAt, dayEnd),
      ),
    );
  const takenSet = new Set(
    taken.map((t) => {
      const fmt = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Africa/Cairo",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      return fmt.format(t.scheduledAt);
    }),
  );

  res.json(
    GetAvailabilityResponse.parse({
      date: dateStr,
      slots: slots.map((time) => ({ time, available: !takenSet.has(time) })),
    }),
  );
});

router.post("/appointments", async (req, res): Promise<void> => {
  const parsed = CreateAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, data.serviceId));
  if (!service) {
    res.status(400).json({ error: "Service not found" });
    return;
  }
  const scheduledAt = new Date(data.scheduledAt);
  const [appt] = await db
    .insert(appointmentsTable)
    .values({
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientPhone: data.clientPhone,
      serviceId: data.serviceId,
      lawyerId: data.lawyerId ?? null,
      scheduledAt,
      durationMinutes: service.durationMinutes,
      mode: data.mode,
      notes: data.notes ?? null,
      paymentMethod: data.paymentMethod,
      amountEgp: service.priceEgp,
      language: data.language,
    })
    .returning();

  if (Number(service.priceEgp) > 0) {
    await db.insert(paymentsTable).values({
      appointmentId: appt.id,
      amountEgp: service.priceEgp,
      method: data.paymentMethod,
      status: "pending",
    });
  }

  let lawyer: typeof lawyersTable.$inferSelect | null = null;
  if (appt.lawyerId) {
    const [l] = await db.select().from(lawyersTable).where(eq(lawyersTable.id, appt.lawyerId));
    lawyer = l ?? null;
  }
  res.status(201).json(appointmentToDto(appt, service, lawyer));
});

export default router;
export { appointmentToDto };
