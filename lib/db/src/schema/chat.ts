import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const chatThreadsTable = pgTable("chat_threads", {
  id: serial("id").primaryKey(),
  visitorName: text("visitor_name").notNull(),
  visitorEmail: text("visitor_email"),
  language: text("language").notNull().default("ar"),
  status: text("status").notNull().default("open"),
  assignedTo: text("assigned_to"),
  unreadByAdmin: integer("unread_by_admin").notNull().default(0),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chatMessagesTable = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").notNull().references(() => chatThreadsTable.id, { onDelete: "cascade" }),
  senderType: text("sender_type").notNull().default("visitor"),
  senderName: text("sender_name").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ChatThread = typeof chatThreadsTable.$inferSelect;
export type ChatMessage = typeof chatMessagesTable.$inferSelect;
