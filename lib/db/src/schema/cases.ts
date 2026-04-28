import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { clientsTable } from "./clients";
import { lawyersTable } from "./lawyers";
import { practiceAreasTable } from "./practice-areas";

export const casesTable = pgTable("cases", {
  id: serial("id").primaryKey(),
  caseNumber: text("case_number").notNull().unique(),
  clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  lawyerId: integer("lawyer_id").references(() => lawyersTable.id, { onDelete: "set null" }),
  practiceAreaId: integer("practice_area_id").references(() => practiceAreasTable.id, { onDelete: "set null" }),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en").notNull(),
  description: text("description").notNull().default(""),
  courtName: text("court_name"),
  status: text("status").notNull().default("open"),
  priority: text("priority").notNull().default("medium"),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  nextHearingDate: timestamp("next_hearing_date", { withTimezone: true }),
  feesEgp: numeric("fees_egp", { precision: 14, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const caseEventsTable = pgTable("case_events", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull().references(() => casesTable.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull().default("note"),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Case = typeof casesTable.$inferSelect;
export type CaseEvent = typeof caseEventsTable.$inferSelect;
