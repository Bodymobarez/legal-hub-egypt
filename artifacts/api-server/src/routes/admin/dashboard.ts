import { Router, type IRouter } from "express";
import { and, count, desc, eq, gte, lt, sql, sum } from "drizzle-orm";
import {
  db,
  clientsTable,
  casesTable,
  appointmentsTable,
  chatThreadsTable,
  invoicesTable,
  contactInquiriesTable,
  paymentsTable,
} from "@workspace/db";
import { requireAdmin } from "../../middlewares/require-admin";

const router: IRouter = Router();

router.use(requireAdmin);

router.get("/admin/dashboard", async (_req, res): Promise<void> => {
  const [{ value: clients }] = await db.select({ value: count() }).from(clientsTable);
  const openCases = await db
    .select({ value: count() })
    .from(casesTable)
    .where(sql`${casesTable.status} IN ('open','in_progress')`);
  const pendingAppointments = await db
    .select({ value: count() })
    .from(appointmentsTable)
    .where(eq(appointmentsTable.status, "pending"));
  const openChats = await db
    .select({ value: count() })
    .from(chatThreadsTable)
    .where(sql`${chatThreadsTable.status} IN ('open','awaiting_support')`);
  const unpaidInvoices = await db
    .select({ value: count() })
    .from(invoicesTable)
    .where(sql`${invoicesTable.status} IN ('sent','overdue')`);
  const newInquiries = await db
    .select({ value: count() })
    .from(contactInquiriesTable)
    .where(eq(contactInquiriesTable.status, "new"));

  const now = new Date();
  const todayStart = new Date(now.toISOString().slice(0, 10) + "T00:00:00.000Z");
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
  const weekEnd = new Date(todayStart.getTime() + 1 * 24 * 60 * 60 * 1000);

  const [today] = await db
    .select({ value: count() })
    .from(appointmentsTable)
    .where(
      and(
        gte(appointmentsTable.scheduledAt, todayStart),
        lt(appointmentsTable.scheduledAt, todayEnd),
      ),
    );
  const [thisWeek] = await db
    .select({ value: count() })
    .from(appointmentsTable)
    .where(
      and(
        gte(appointmentsTable.scheduledAt, weekStart),
        lt(appointmentsTable.scheduledAt, weekEnd),
      ),
    );
  const apptByStatus = await db
    .select({ status: appointmentsTable.status, c: count() })
    .from(appointmentsTable)
    .groupBy(appointmentsTable.status);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [thisMonthRevRow] = await db
    .select({ value: sum(paymentsTable.amountEgp) })
    .from(paymentsTable)
    .where(
      and(
        eq(paymentsTable.status, "confirmed"),
        gte(paymentsTable.createdAt, monthStart),
        lt(paymentsTable.createdAt, monthEnd),
      ),
    );
  const [lastMonthRevRow] = await db
    .select({ value: sum(paymentsTable.amountEgp) })
    .from(paymentsTable)
    .where(
      and(
        eq(paymentsTable.status, "confirmed"),
        gte(paymentsTable.createdAt, lastMonthStart),
        lt(paymentsTable.createdAt, monthStart),
      ),
    );
  const [outstandingRow] = await db
    .select({ value: sum(invoicesTable.total) })
    .from(invoicesTable)
    .where(sql`${invoicesTable.status} IN ('sent','overdue')`);
  const byMethod = await db
    .select({ method: paymentsTable.method, totalEgp: sum(paymentsTable.amountEgp) })
    .from(paymentsTable)
    .where(eq(paymentsTable.status, "confirmed"))
    .groupBy(paymentsTable.method);

  const pipeline = await db
    .select({ status: casesTable.status, c: count() })
    .from(casesTable)
    .groupBy(casesTable.status);

  res.json({
    totals: {
      clients,
      openCases: Number(openCases[0]?.value ?? 0),
      pendingAppointments: Number(pendingAppointments[0]?.value ?? 0),
      openChats: Number(openChats[0]?.value ?? 0),
      unpaidInvoices: Number(unpaidInvoices[0]?.value ?? 0),
      newInquiries: Number(newInquiries[0]?.value ?? 0),
    },
    appointments: {
      today: Number(today?.value ?? 0),
      thisWeek: Number(thisWeek?.value ?? 0),
      byStatus: apptByStatus.map((r) => ({ status: r.status, count: Number(r.c) })),
    },
    revenue: {
      thisMonthEgp: Number(thisMonthRevRow?.value ?? 0),
      lastMonthEgp: Number(lastMonthRevRow?.value ?? 0),
      outstandingEgp: Number(outstandingRow?.value ?? 0),
      byMethod: byMethod.map((r) => ({ method: r.method, totalEgp: Number(r.totalEgp ?? 0) })),
    },
    pipeline: pipeline.map((p) => ({ status: p.status, count: Number(p.c) })),
  });
});

router.get("/admin/recent-activity", async (_req, res): Promise<void> => {
  const appts = await db
    .select()
    .from(appointmentsTable)
    .orderBy(desc(appointmentsTable.createdAt))
    .limit(8);
  const inquiries = await db
    .select()
    .from(contactInquiriesTable)
    .orderBy(desc(contactInquiriesTable.createdAt))
    .limit(5);
  const payments = await db
    .select()
    .from(paymentsTable)
    .orderBy(desc(paymentsTable.createdAt))
    .limit(5);
  const chats = await db
    .select()
    .from(chatThreadsTable)
    .orderBy(desc(chatThreadsTable.lastMessageAt))
    .limit(5);

  type Item = {
    id: string;
    type: "appointment" | "inquiry" | "payment" | "chat" | "case";
    title: string;
    description: string;
    occurredAt: string;
  };
  const items: Item[] = [];
  for (const a of appts) {
    items.push({
      id: `appt-${a.id}`,
      type: "appointment",
      title: `Appointment from ${a.clientName}`,
      description: `${a.status} · ${a.mode}`,
      occurredAt: a.createdAt.toISOString(),
    });
  }
  for (const i of inquiries) {
    items.push({
      id: `inq-${i.id}`,
      type: "inquiry",
      title: `Inquiry: ${i.subject}`,
      description: `From ${i.fullName}`,
      occurredAt: i.createdAt.toISOString(),
    });
  }
  for (const p of payments) {
    items.push({
      id: `pay-${p.id}`,
      type: "payment",
      title: `Payment ${Number(p.amountEgp).toFixed(2)} EGP`,
      description: `${p.method} · ${p.status}`,
      occurredAt: p.createdAt.toISOString(),
    });
  }
  for (const c of chats) {
    items.push({
      id: `chat-${c.id}`,
      type: "chat",
      title: `Chat with ${c.visitorName}`,
      description: c.status,
      occurredAt: c.lastMessageAt.toISOString(),
    });
  }
  items.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
  res.json(items.slice(0, 20));
});

export default router;
