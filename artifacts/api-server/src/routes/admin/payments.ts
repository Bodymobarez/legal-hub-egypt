import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, paymentsTable, invoicesTable, appointmentsTable, clientsTable } from "@workspace/db";
import { requireAdmin } from "../../middlewares/require-admin";

const router: IRouter = Router();
router.use(requireAdmin);

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

router.post("/admin/payments/:id/confirm", async (req, res): Promise<void> => {
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
  res.json({
    id: row.id,
    invoiceId: row.invoiceId,
    invoiceNumber: null,
    appointmentId: row.appointmentId,
    clientName: null,
    amountEgp: Number(row.amountEgp),
    method: row.method,
    status: row.status,
    referenceNumber: row.referenceNumber,
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  });
});

export default router;
