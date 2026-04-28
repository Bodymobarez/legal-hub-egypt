import { Router, type IRouter } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import {
  db,
  casesTable,
  caseEventsTable,
  clientsTable,
  lawyersTable,
  invoicesTable,
} from "@workspace/db";
import {
  CreateAdminCaseBody,
  UpdateAdminCaseBody,
  AddCaseEventBody,
} from "@workspace/api-zod";
import { requireAdmin } from "../../middlewares/require-admin";
import { caseSummaryDto, invoiceDto, clientDto } from "./clients";

const router: IRouter = Router();
router.use(requireAdmin);

function caseDto(c: typeof casesTable.$inferSelect) {
  return {
    id: c.id,
    caseNumber: c.caseNumber,
    clientId: c.clientId,
    lawyerId: c.lawyerId,
    practiceAreaId: c.practiceAreaId,
    titleAr: c.titleAr,
    titleEn: c.titleEn,
    description: c.description,
    courtName: c.courtName,
    status: c.status,
    priority: c.priority,
    openedAt: c.openedAt.toISOString(),
    closedAt: c.closedAt ? c.closedAt.toISOString() : null,
    nextHearingDate: c.nextHearingDate ? c.nextHearingDate.toISOString() : null,
    feesEgp: Number(c.feesEgp),
    createdAt: c.createdAt.toISOString(),
  };
}
function caseEventDto(e: typeof caseEventsTable.$inferSelect) {
  return {
    id: e.id,
    caseId: e.caseId,
    eventType: e.eventType,
    title: e.title,
    description: e.description,
    occurredAt: e.occurredAt.toISOString(),
    createdAt: e.createdAt.toISOString(),
  };
}

router.get("/admin/cases", async (req, res): Promise<void> => {
  const status = typeof req.query.status === "string" ? req.query.status : "";
  const clientId = req.query.clientId ? parseInt(String(req.query.clientId), 10) : null;
  const lawyerId = req.query.lawyerId ? parseInt(String(req.query.lawyerId), 10) : null;
  const conditions = [];
  if (status) conditions.push(eq(casesTable.status, status));
  if (clientId && !Number.isNaN(clientId)) conditions.push(eq(casesTable.clientId, clientId));
  if (lawyerId && !Number.isNaN(lawyerId)) conditions.push(eq(casesTable.lawyerId, lawyerId));
  const where = conditions.length ? and(...conditions) : undefined;
  const rows = await db
    .select()
    .from(casesTable)
    .leftJoin(clientsTable, eq(casesTable.clientId, clientsTable.id))
    .leftJoin(lawyersTable, eq(casesTable.lawyerId, lawyersTable.id))
    .where(where!)
    .orderBy(desc(casesTable.openedAt));
  res.json(
    rows.map((r) => caseSummaryDto(r.cases, r.clients!, r.lawyers)),
  );
});

router.post("/admin/cases", async (req, res): Promise<void> => {
  const parsed = CreateAdminCaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const caseNumber = `EA-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;
  const [row] = await db
    .insert(casesTable)
    .values({
      caseNumber,
      clientId: data.clientId,
      lawyerId: data.lawyerId ?? null,
      practiceAreaId: data.practiceAreaId ?? null,
      titleAr: data.titleAr,
      titleEn: data.titleEn,
      description: data.description,
      courtName: data.courtName ?? null,
      status: data.status,
      priority: data.priority,
      nextHearingDate: data.nextHearingDate ? new Date(data.nextHearingDate) : null,
      feesEgp: String(data.feesEgp ?? 0),
    })
    .returning();
  res.status(201).json(caseDto(row));
});

router.get("/admin/cases/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [c] = await db.select().from(casesTable).where(eq(casesTable.id, id));
  if (!c) {
    res.status(404).json({ error: "Case not found" });
    return;
  }
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, c.clientId));
  let lawyer: typeof lawyersTable.$inferSelect | null = null;
  if (c.lawyerId) {
    const [l] = await db.select().from(lawyersTable).where(eq(lawyersTable.id, c.lawyerId));
    lawyer = l ?? null;
  }
  const events = await db
    .select()
    .from(caseEventsTable)
    .where(eq(caseEventsTable.caseId, id))
    .orderBy(desc(caseEventsTable.occurredAt));
  const invs = await db.select().from(invoicesTable).where(eq(invoicesTable.caseId, id));
  res.json({
    case: caseDto(c),
    client: clientDto(client),
    lawyer,
    events: events.map(caseEventDto),
    invoices: invs.map((i) => invoiceDto(i, client)),
  });
});

router.patch("/admin/cases/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateAdminCaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const updates: Record<string, unknown> = { ...data };
  if (data.feesEgp != null) updates.feesEgp = String(data.feesEgp);
  if (data.nextHearingDate != null) updates.nextHearingDate = new Date(data.nextHearingDate);
  if (data.status === "closed" || data.status === "won" || data.status === "lost") {
    updates.closedAt = new Date();
  }
  const [row] = await db.update(casesTable).set(updates).where(eq(casesTable.id, id)).returning();
  if (!row) {
    res.status(404).json({ error: "Case not found" });
    return;
  }
  res.json(caseDto(row));
});

router.delete("/admin/cases/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(casesTable).where(eq(casesTable.id, id));
  res.json({ message: "Deleted" });
});

router.post("/admin/cases/:id/events", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = AddCaseEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(caseEventsTable)
    .values({
      caseId: id,
      eventType: parsed.data.eventType,
      title: parsed.data.title,
      description: parsed.data.description,
      occurredAt: new Date(parsed.data.occurredAt),
    })
    .returning();
  res.status(201).json(caseEventDto(row));
});

export default router;
