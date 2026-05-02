import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  paymentsTable,
  invoicesTable,
  appointmentsTable,
  clientsTable,
} from "@workspace/db";
import { requireAdmin } from "../../middlewares/require-admin";

const router: IRouter = Router();
router.use(requireAdmin);

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */

const ALLOWED_METHODS = new Set([
  "instapay",
  "vodafone_cash",
  "fawry",
  "visa",
  "cash",
  "bank_transfer",
]);
const ALLOWED_STATUSES = new Set(["pending", "confirmed", "failed", "refunded"]);

async function paymentDtoFromId(id: number) {
  const [row] = await db
    .select()
    .from(paymentsTable)
    .leftJoin(invoicesTable, eq(paymentsTable.invoiceId, invoicesTable.id))
    .leftJoin(appointmentsTable, eq(paymentsTable.appointmentId, appointmentsTable.id))
    .leftJoin(clientsTable, eq(invoicesTable.clientId, clientsTable.id))
    .where(eq(paymentsTable.id, id));
  if (!row) return null;
  return {
    id: row.payments.id,
    invoiceId: row.payments.invoiceId,
    invoiceNumber: row.invoices?.invoiceNumber ?? null,
    appointmentId: row.payments.appointmentId,
    clientName: row.clients?.fullName ?? row.appointments?.clientName ?? null,
    amountEgp: Number(row.payments.amountEgp),
    method: row.payments.method,
    status: row.payments.status,
    referenceNumber: row.payments.referenceNumber,
    paidAt: row.payments.paidAt ? row.payments.paidAt.toISOString() : null,
    createdAt: row.payments.createdAt.toISOString(),
  };
}

/* ──────────────────────────────────────────────
   List + filter
   ────────────────────────────────────────────── */

router.get("/admin/payments", async (req, res): Promise<void> => {
  const status = typeof req.query.status === "string" ? req.query.status : "";
  const where = status ? eq(paymentsTable.status, status) : undefined;
  const rows = await db
    .select()
    .from(paymentsTable)
    .leftJoin(invoicesTable, eq(paymentsTable.invoiceId, invoicesTable.id))
    .leftJoin(appointmentsTable, eq(paymentsTable.appointmentId, appointmentsTable.id))
    .leftJoin(clientsTable, eq(invoicesTable.clientId, clientsTable.id))
    .where(where!)
    .orderBy(desc(paymentsTable.createdAt));
  res.json(
    rows.map((r) => ({
      id: r.payments.id,
      invoiceId: r.payments.invoiceId,
      invoiceNumber: r.invoices?.invoiceNumber ?? null,
      appointmentId: r.payments.appointmentId,
      clientName: r.clients?.fullName ?? r.appointments?.clientName ?? null,
      amountEgp: Number(r.payments.amountEgp),
      method: r.payments.method,
      status: r.payments.status,
      referenceNumber: r.payments.referenceNumber,
      paidAt: r.payments.paidAt ? r.payments.paidAt.toISOString() : null,
      createdAt: r.payments.createdAt.toISOString(),
    })),
  );
});

/* ──────────────────────────────────────────────
   Manually record a payment (walk-in cash, etc.)
   ────────────────────────────────────────────── */

router.post("/admin/payments", async (req, res): Promise<void> => {
  try {
    const body = req.body ?? {};
    const amount = Number(body.amountEgp);
    const method = String(body.method ?? "");
    const status = String(body.status ?? "confirmed");
    const invoiceId = body.invoiceId != null ? Number(body.invoiceId) : null;
    const appointmentId = body.appointmentId != null ? Number(body.appointmentId) : null;
    const referenceNumber = body.referenceNumber ? String(body.referenceNumber) : null;
    const paidAtRaw = body.paidAt ? new Date(String(body.paidAt)) : null;

    if (!Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ error: "Invalid amount" });
      return;
    }
    if (!ALLOWED_METHODS.has(method)) {
      res.status(400).json({ error: "Invalid payment method" });
      return;
    }
    if (!ALLOWED_STATUSES.has(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }
    if (!invoiceId && !appointmentId) {
      res.status(400).json({ error: "Either invoiceId or appointmentId is required" });
      return;
    }

    const paidAt = status === "confirmed" ? (paidAtRaw ?? new Date()) : paidAtRaw;

    const [created] = await db
      .insert(paymentsTable)
      .values({
        invoiceId,
        appointmentId,
        amountEgp: String(amount),
        method,
        status,
        referenceNumber,
        paidAt,
      })
      .returning();

    /* If a payment is recorded for an appointment, mirror its payment status. */
    if (appointmentId) {
      await db
        .update(appointmentsTable)
        .set({ paymentStatus: status === "confirmed" ? "confirmed" : "pending" })
        .where(eq(appointmentsTable.id, appointmentId));
    }

    /* If the invoice is now fully paid, mark it as paid. */
    if (invoiceId && status === "confirmed") {
      const [inv] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, invoiceId));
      if (inv) {
        const allPayments = await db
          .select()
          .from(paymentsTable)
          .where(and(eq(paymentsTable.invoiceId, invoiceId), eq(paymentsTable.status, "confirmed")));
        const totalPaid = allPayments.reduce((s, p) => s + Number(p.amountEgp), 0);
        if (totalPaid >= Number(inv.total)) {
          await db
            .update(invoicesTable)
            .set({ status: "paid", paymentMethod: method, paidAt: paidAt ?? new Date() })
            .where(eq(invoicesTable.id, invoiceId));
        }
      }
    }

    const dto = await paymentDtoFromId(created.id);
    res.status(201).json(dto);
  } catch (e) {
    console.error("[POST /admin/payments]", e);
    res.status(500).json({ error: "Failed to record payment" });
  }
});

/* ──────────────────────────────────────────────
   Patch: change status (mark failed/refunded), method, reference
   ────────────────────────────────────────────── */

router.patch("/admin/payments/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const body = req.body ?? {};
    const updates: Record<string, unknown> = {};
    if (body.status !== undefined) {
      if (!ALLOWED_STATUSES.has(String(body.status))) {
        res.status(400).json({ error: "Invalid status" });
        return;
      }
      updates.status = body.status;
      if (body.status === "confirmed" && !body.paidAt) updates.paidAt = new Date();
    }
    if (body.method !== undefined) {
      if (!ALLOWED_METHODS.has(String(body.method))) {
        res.status(400).json({ error: "Invalid method" });
        return;
      }
      updates.method = body.method;
    }
    if (body.referenceNumber !== undefined) {
      updates.referenceNumber = body.referenceNumber || null;
    }
    if (body.paidAt !== undefined) {
      updates.paidAt = body.paidAt ? new Date(String(body.paidAt)) : null;
    }
    if (body.amountEgp !== undefined) {
      const amount = Number(body.amountEgp);
      if (!Number.isFinite(amount) || amount <= 0) {
        res.status(400).json({ error: "Invalid amount" });
        return;
      }
      updates.amountEgp = String(amount);
    }
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const [row] = await db
      .update(paymentsTable)
      .set(updates)
      .where(eq(paymentsTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    /* Sync linked appointment payment status. */
    if (row.appointmentId && body.status !== undefined) {
      await db
        .update(appointmentsTable)
        .set({ paymentStatus: row.status === "confirmed" ? "confirmed" : "pending" })
        .where(eq(appointmentsTable.id, row.appointmentId));
    }

    /* If status changed to refunded/failed, downgrade the invoice from paid back to sent. */
    if (row.invoiceId && (row.status === "refunded" || row.status === "failed")) {
      const [inv] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, row.invoiceId));
      if (inv && inv.status === "paid") {
        await db
          .update(invoicesTable)
          .set({ status: "sent", paidAt: null })
          .where(eq(invoicesTable.id, row.invoiceId));
      }
    }

    const dto = await paymentDtoFromId(row.id);
    res.json(dto);
  } catch (e) {
    console.error("[PATCH /admin/payments/:id]", e);
    res.status(500).json({ error: "Failed to update payment" });
  }
});

/* ──────────────────────────────────────────────
   Confirm shorthand
   ────────────────────────────────────────────── */

router.post("/admin/payments/:id/confirm", async (req, res): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [row] = await db
      .update(paymentsTable)
      .set({ status: "confirmed", paidAt: new Date() })
      .where(eq(paymentsTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (row.appointmentId) {
      await db
        .update(appointmentsTable)
        .set({ paymentStatus: "confirmed" })
        .where(eq(appointmentsTable.id, row.appointmentId));
    }
    /* Auto-mark linked invoice as paid when fully covered. */
    if (row.invoiceId) {
      const [inv] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, row.invoiceId));
      if (inv && inv.status !== "paid") {
        const allPayments = await db
          .select()
          .from(paymentsTable)
          .where(
            and(eq(paymentsTable.invoiceId, row.invoiceId), eq(paymentsTable.status, "confirmed")),
          );
        const totalPaid = allPayments.reduce((s, p) => s + Number(p.amountEgp), 0);
        if (totalPaid >= Number(inv.total)) {
          await db
            .update(invoicesTable)
            .set({ status: "paid", paymentMethod: row.method, paidAt: row.paidAt ?? new Date() })
            .where(eq(invoicesTable.id, row.invoiceId));
        }
      }
    }

    const dto = await paymentDtoFromId(row.id);
    res.json(dto);
  } catch (e) {
    console.error("[POST /admin/payments/:id/confirm]", e);
    res.status(500).json({ error: "Failed to confirm" });
  }
});

export default router;
