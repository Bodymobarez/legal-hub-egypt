import { pgTable, serial, text, integer, boolean } from "drizzle-orm/pg-core";

export const testimonialsTable = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  clientName: text("client_name").notNull(),
  role: text("role").notNull().default(""),
  contentAr: text("content_ar").notNull(),
  contentEn: text("content_en").notNull(),
  rating: integer("rating").notNull().default(5),
  sortOrder: integer("sort_order").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(true),
});

export type Testimonial = typeof testimonialsTable.$inferSelect;
