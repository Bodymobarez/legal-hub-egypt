import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, invoicesTable, clientsTable, paymentsTable } from "@workspace/db";
import {
  CreateAdminInvoiceBody,
  UpdateAdminInvoiceBody,
  MarkInvoicePaidBody,
} from "@workspace/api-zod";
import { requireAdmin } from "../../middlewares/require-admin";
import { invoiceDto } from "./clients";

const router: IRouter = Router();
router.use(requireAdmin);

function computeTotals(items: { quantity: number; unitPriceEgp: number }[], taxPct: number) {
  const subtotal = items.reduce((s, it) => s + it.quantity * it.unitPriceEgp, 0);
  const tax = +(subtotal * (taxPct / 100)).toFixed(2);
  const total = +(subtotal + tax).toFixed(2);
  return { subtotal: +subtotal.toFixed(2), tax, total };
}

router.get("/admin/invoices", async (req, res): Promise<void> => {
  const status = typeof req.query.status === "string" ? req.query.status : "";
  const clientId = req.query.clientId ? parseInt(String(req.query.clientId), 10) : null;
  const conditions = [];
  if (status) conditions.push(eq(invoicesTable.status, status));
  if (clientId && !Number.isNaN(clientId)) conditions.push(eq(invoicesTable.clientId, clientId));
  const where = conditions.length ? and(...conditions) : undefined;
  const rows = await db
    .select()
    .from(invoicesTable)
    .leftJoin(clientsTable, eq(invoicesTable.clientId, clientsTable.id))
    .where(where!)
    .orderBy(desc(invoicesTable.createdAt));
  res.json(rows.map((r) => invoiceDto(r.invoices, r.clients!)));
});

router.post("/admin/invoices", async (req, res): Promise<void> => {
  const parsed = CreateAdminInvoiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const totals = computeTotals(data.items, data.taxPercentage ?? 0);
  const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;
  const [row] = await db
    .insert(invoicesTable)
    .values({
      invoiceNumber,
      clientId: data.clientId,
      caseId: data.caseId ?? null,
      items: data.items,
      subtotal: String(totals.subtotal),
      tax: String(totals.tax),
      total: String(totals.total),
      status: data.status,
      issueDate: data.issueDate,
      dueDate: data.dueDate ?? null,
      notes: data.notes ?? null,
    })
    .returning();
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, row.clientId));
  res.status(201).json(invoiceDto(row, client));
});

router.get("/admin/invoices/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, row.clientId));
  res.json(invoiceDto(row, client));
});

router.patch("/admin/invoices/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateAdminInvoiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const updates: Record<string, unknown> = {};
  if (data.items != null) {
    const totals = computeTotals(data.items, data.taxPercentage ?? 0);
    updates.items = data.items;
    updates.subtotal = String(totals.subtotal);
    updates.tax = String(totals.tax);
    updates.total = String(totals.total);
  }
  if (data.status) updates.status = data.status;
  if (data.dueDate !== undefined) updates.dueDate = data.dueDate;
  if (data.notes !== undefined) updates.notes = data.notes;
  const [row] = await db
    .update(invoicesTable)
    .set(updates)
    .where(eq(invoicesTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, row.clientId));
  res.json(invoiceDto(row, client));
});

router.post("/admin/invoices/:id/mark-paid", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = MarkInvoicePaidBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const paidAt = parsed.data.paidAt ? new Date(parsed.data.paidAt) : new Date();
  const [row] = await db
    .update(invoicesTable)
    .set({
      status: "paid",
      paymentMethod: parsed.data.paymentMethod,
      paidAt,
    })
    .where(eq(invoicesTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await db.insert(paymentsTable).values({
    invoiceId: row.id,
    amountEgp: row.total,
    method: parsed.data.paymentMethod,
    status: "confirmed",
    referenceNumber: parsed.data.referenceNumber ?? null,
    paidAt,
  });
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, row.clientId));
  res.json(invoiceDto(row, client));
});

export default router;
