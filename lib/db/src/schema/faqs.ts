import { pgTable, serial, text, integer, boolean } from "drizzle-orm/pg-core";

export const faqsTable = pgTable("faqs", {
  id: serial("id").primaryKey(),
  questionAr: text("question_ar").notNull(),
  questionEn: text("question_en").notNull(),
  answerAr: text("answer_ar").notNull(),
  answerEn: text("answer_en").notNull(),
  category: text("category").notNull().default("general"),
  sortOrder: integer("sort_order").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(true),
});

export type Faq = typeof faqsTable.$inferSelect;
