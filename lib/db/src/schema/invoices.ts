import { pgTable, serial, text, integer, numeric, timestamp, jsonb, date } from "drizzle-orm/pg-core";
import { clientsTable } from "./clients";
import { casesTable } from "./cases";

export type InvoiceItemJson = { description: string; quantity: number; unitPriceEgp: number };

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  caseId: integer("case_id").references(() => casesTable.id, { onDelete: "set null" }),
  items: jsonb("items").$type<InvoiceItemJson[]>().notNull().default([]),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull().default("0"),
  tax: numeric("tax", { precision: 14, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 14, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("EGP"),
  status: text("status").notNull().default("draft"),
  dueDate: date("due_date"),
  issueDate: date("issue_date").notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  paymentMethod: text("payment_method"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Invoice = typeof invoicesTable.$inferSelect;
export type InsertInvoice = typeof invoicesTable.$inferInsert;
