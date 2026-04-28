import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { servicesTable } from "./services";
import { lawyersTable } from "./lawyers";

export const appointmentsTable = pgTable("appointments", {
  id: serial("id").primaryKey(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").notNull(),
  clientPhone: text("client_phone").notNull(),
  serviceId: integer("service_id").notNull().references(() => servicesTable.id),
  lawyerId: integer("lawyer_id").references(() => lawyersTable.id, { onDelete: "set null" }),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  mode: text("mode").notNull().default("in_office"),
  notes: text("notes"),
  status: text("status").notNull().default("pending"),
  meetingLink: text("meeting_link"),
  paymentMethod: text("payment_method").notNull().default("cash"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  paymentReference: text("payment_reference"),
  amountEgp: numeric("amount_egp", { precision: 12, scale: 2 }).notNull().default("0"),
  language: text("language").notNull().default("ar"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Appointment = typeof appointmentsTable.$inferSelect;
export type InsertAppointment = typeof appointmentsTable.$inferInsert;
