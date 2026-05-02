import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { invoicesTable } from "./invoices";
import { appointmentsTable } from "./appointments";
import { clientsTable } from "./clients";

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  /* `clientId` is the canonical owner of a payment — always set so the
     payment can be linked to a customer statement, even when there is no
     invoice yet (e.g. a deposit / on-account payment). */
  clientId: integer("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  invoiceId: integer("invoice_id").references(() => invoicesTable.id, { onDelete: "set null" }),
  appointmentId: integer("appointment_id").references(() => appointmentsTable.id, { onDelete: "set null" }),
  amountEgp: numeric("amount_egp", { precision: 14, scale: 2 }).notNull().default("0"),
  method: text("method").notNull().default("cash"),
  status: text("status").notNull().default("pending"),
  referenceNumber: text("reference_number"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Payment = typeof paymentsTable.$inferSelect;
