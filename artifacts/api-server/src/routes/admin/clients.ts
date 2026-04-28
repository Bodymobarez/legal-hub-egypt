import { Router, type IRouter } from "express";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db, clientsTable, casesTable, invoicesTable, lawyersTable } from "@workspace/db";
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

export default router;
export { clientDto, caseSummaryDto, invoiceDto };
