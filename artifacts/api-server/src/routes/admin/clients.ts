import { Router, type IRouter } from "express";
import { and, asc, desc, eq, ilike, inArray, or } from "drizzle-orm";
import {
  db,
  clientsTable,
  casesTable,
  invoicesTable,
  lawyersTable,
  paymentsTable,
} from "@workspace/db";
import {
  CreateAdminClientBody,
  UpdateAdminClientBody,
} from "@workspace/api-zod";
import { requireAdmin } from "../../middlewares/require-admin";

const router: IRouter = Router();
router.use(requireAdmin);

function clientDto(c: typeof clientsTable.$inferSelect) {
  return {
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}
function caseSummaryDto(
  c: typeof casesTable.$inferSelect,
  client: typeof clientsTable.$inferSelect,
  lawyer?: typeof lawyersTable.$inferSelect | null,
) {
  return {
    id: c.id,
    caseNumber: c.caseNumber,
    clientId: c.clientId,
    clientName: client.fullName,
    lawyerId: c.lawyerId,
    lawyerName: lawyer?.nameEn ?? null,
    practiceAreaId: c.practiceAreaId,
    titleAr: c.titleAr,
    titleEn: c.titleEn,
    status: c.status,
    priority: c.priority,
    openedAt: c.openedAt.toISOString(),
    nextHearingDate: c.nextHearingDate ? c.nextHearingDate.toISOString() : null,
    feesEgp: Number(c.feesEgp),
  };
}
function invoiceDto(i: typeof invoicesTable.$inferSelect, client: typeof clientsTable.$inferSelect) {
  return {
    id: i.id,
    invoiceNumber: i.invoiceNumber,
    clientId: i.clientId,
    clientName: client.fullName,
    caseId: i.caseId,
    items: i.items,
    subtotal: Number(i.subtotal),
    tax: Number(i.tax),
    total: Number(i.total),
    currency: i.currency,
    status: i.status,
    dueDate: i.dueDate,
    issueDate: i.issueDate,
    paidAt: i.paidAt ? i.paidAt.toISOString() : null,
    paymentMethod: i.paymentMethod,
    notes: i.notes,
    createdAt: i.createdAt.toISOString(),
  };
}

router.get("/admin/clients", async (req, res): Promise<void> => {
  const q = typeof req.query.q === "string" ? req.query.q : "";
  const status = typeof req.query.status === "string" ? req.query.status : "";
  const conditions = [];
  if (q.trim()) {
    const like = `%${q.trim()}%`;
    conditions.push(
      or(
        ilike(clientsTable.fullName, like),
        ilike(clientsTable.email, like),
        ilike(clientsTable.phone, like),
      )!,
    );
  }
  if (status) conditions.push(eq(clientsTable.status, status));
  const where = conditions.length ? and(...conditions) : undefined;
  const rows = await db
    .select()
    .from(clientsTable)
    .where(where!)
    .orderBy(desc(clientsTable.createdAt));
  res.json(rows.map(clientDto));
});

router.post("/admin/clients", async (req, res): Promise<void> => {
  const parsed = CreateAdminClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(clientsTable).values(parsed.data).returning();
  res.status(201).json(clientDto(row));
});

router.get("/admin/clients/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, id));
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  const cases = await db
    .select()
    .from(casesTable)
    .leftJoin(lawyersTable, eq(casesTable.lawyerId, lawyersTable.id))
    .where(eq(casesTable.clientId, id));
  const invoices = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.clientId, id));
  res.json({
    client: clientDto(client),
    cases: cases.map((r) => caseSummaryDto(r.cases, client, r.lawyers)),
    invoices: invoices.map((i) => invoiceDto(i, client)),
  });
});

router.patch("/admin/clients/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateAdminClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .update(clientsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(clientsTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  res.json(clientDto(row));
});

router.delete("/admin/clients/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(clientsTable).where(eq(clientsTable.id, id));
  res.json({ message: "Deleted" });
});

/* ──────────────────────────────────────────────
   Customer statement (كشف حساب)
   Returns the full ledger for one client:
   - all invoices issued
   - all payments received against those invoices
   - running totals (invoiced / paid / outstanding)
   ────────────────────────────────────────────── */
router.get("/admin/clients/:id/statement", async (req, res): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, id));
    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    /** Fetch invoices + payments in parallel for snappier response.
        Payments belong to a client either directly (via payments.client_id —
        e.g. a deposit / on-account payment without an invoice yet) or
        indirectly through one of the client's invoices. We union both. */
    const [invoices, allInvoiceIds] = await (async () => {
      const inv = await db
        .select()
        .from(invoicesTable)
        .where(eq(invoicesTable.clientId, id))
        .orderBy(desc(invoicesTable.issueDate));
      return [inv, inv.map((i) => i.id)] as const;
    })();

    const paymentConds = [eq(paymentsTable.clientId, id)];
    if (allInvoiceIds.length) {
      paymentConds.push(inArray(paymentsTable.invoiceId, allInvoiceIds));
    }
    const paymentsRaw = await db
      .select()
      .from(paymentsTable)
      .where(or(...paymentConds))
      .orderBy(asc(paymentsTable.createdAt));

    /* Deduplicate (invoice match + direct match could double-count). */
    const seen = new Set<number>();
    const payments = paymentsRaw.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    /** Build a unified ledger entries list (invoice = debit, payment = credit). */
    type LedgerEntry =
      | {
          type: "invoice";
          date: string;
          invoiceId: number;
          invoiceNumber: string;
          description: string;
          debit: number;
          credit: 0;
          status: string;
          dueDate: string | null;
        }
      | {
          type: "payment";
          date: string;
          paymentId: number;
          invoiceId: number | null;
          invoiceNumber: string | null;
          description: string;
          debit: 0;
          credit: number;
          method: string;
          referenceNumber: string | null;
        };

    const invoiceLookup = new Map(invoices.map((i) => [i.id, i] as const));

    const invoiceEntries: LedgerEntry[] = invoices.map((i) => ({
      type: "invoice",
      date: i.issueDate as unknown as string,
      invoiceId: i.id,
      invoiceNumber: i.invoiceNumber,
      description: `Invoice ${i.invoiceNumber}`,
      debit: Number(i.total),
      credit: 0,
      status: i.status,
      dueDate: (i.dueDate as unknown as string | null) ?? null,
    }));

    const paymentEntries: LedgerEntry[] = payments
      .filter((p) => p.status !== "rejected" && p.status !== "cancelled")
      .map((p) => {
        const inv = p.invoiceId ? invoiceLookup.get(p.invoiceId) : null;
        const dateIso = (p.paidAt ?? p.createdAt).toISOString();
        return {
          type: "payment",
          date: dateIso.slice(0, 10),
          paymentId: p.id,
          invoiceId: p.invoiceId,
          invoiceNumber: inv?.invoiceNumber ?? null,
          description: inv
            ? `Payment for ${inv.invoiceNumber}`
            : p.appointmentId
              ? `Payment for appointment #${p.appointmentId}`
              : "Payment on account",
          debit: 0,
          credit: Number(p.amountEgp),
          method: p.method,
          referenceNumber: p.referenceNumber,
        } as LedgerEntry;
      });

    /** Sort chronologically with invoices preceding payments on the same date. */
    const ledger = [...invoiceEntries, ...paymentEntries].sort((a, b) => {
      if (a.date === b.date) return a.type === "invoice" ? -1 : 1;
      return a.date < b.date ? -1 : 1;
    });

    /** Add a running balance to each entry. */
    let running = 0;
    const ledgerWithBalance = ledger.map((entry) => {
      running = +(running + entry.debit - entry.credit).toFixed(2);
      return { ...entry, balance: running };
    });

    const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total), 0);
    const totalPaid = paymentEntries.reduce((s, p) => s + p.credit, 0);
    const outstanding = +(totalInvoiced - totalPaid).toFixed(2);

    /** Aggregate by status for quick overview. */
    const byStatus = invoices.reduce<Record<string, { count: number; total: number }>>((acc, i) => {
      const s = i.status;
      if (!acc[s]) acc[s] = { count: 0, total: 0 };
      acc[s].count += 1;
      acc[s].total += Number(i.total);
      return acc;
    }, {});

    res.json({
      client: clientDto(client),
      invoices: invoices.map((i) => invoiceDto(i, client)),
      payments: payments.map((p) => ({
        id: p.id,
        invoiceId: p.invoiceId,
        invoiceNumber: invoiceLookup.get(p.invoiceId ?? -1)?.invoiceNumber ?? null,
        amountEgp: Number(p.amountEgp),
        method: p.method,
        status: p.status,
        referenceNumber: p.referenceNumber,
        paidAt: p.paidAt ? p.paidAt.toISOString() : null,
        createdAt: p.createdAt.toISOString(),
      })),
      ledger: ledgerWithBalance,
      totals: {
        invoiced: +totalInvoiced.toFixed(2),
        paid: +totalPaid.toFixed(2),
        outstanding,
        invoiceCount: invoices.length,
        paymentCount: paymentEntries.length,
      },
      byStatus,
    });
  } catch (e) {
    console.error("[GET /admin/clients/:id/statement]", e);
    res.status(500).json({ error: "Failed to load statement" });
  }
});

export default router;
export { clientDto, caseSummaryDto, invoiceDto };
