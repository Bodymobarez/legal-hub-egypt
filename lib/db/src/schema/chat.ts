import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";

export const chatThreadsTable = pgTable(
  "chat_threads",
  {
    id: serial("id").primaryKey(),
    visitorName: text("visitor_name").notNull(),
    visitorEmail: text("visitor_email"),
    language: text("language").notNull().default("ar"),
    status: text("status").notNull().default("open"),
    assignedTo: text("assigned_to"),
    unreadByAdmin: integer("unread_by_admin").notNull().default(0),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    /** Admin list orders by lastMessageAt DESC — index keeps it O(log n). */
    lastMessageIdx: index("chat_threads_last_message_idx").on(t.lastMessageAt),
    statusIdx: index("chat_threads_status_idx").on(t.status),
  }),
);

export const chatMessagesTable = pgTable(
  "chat_messages",
  {
    id: serial("id").primaryKey(),
    threadId: integer("thread_id").notNull().references(() => chatThreadsTable.id, { onDelete: "cascade" }),
    senderType: text("sender_type").notNull().default("visitor"),
    senderName: text("sender_name").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    /** Per-thread message lookups happen on every poll — index makes them sub-ms. */
    threadIdIdx: index("chat_messages_thread_id_idx").on(t.threadId, t.createdAt),
  }),
);

export type ChatThread = typeof chatThreadsTable.$inferSelect;
export type ChatMessage = typeof chatMessagesTable.$inferSelect;
