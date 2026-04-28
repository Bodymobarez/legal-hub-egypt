import { pgTable, serial, text, integer, boolean } from "drizzle-orm/pg-core";

export const practiceAreasTable = pgTable("practice_areas", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  descriptionAr: text("description_ar").notNull(),
  descriptionEn: text("description_en").notNull(),
  icon: text("icon").notNull().default("scale"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export type PracticeArea = typeof practiceAreasTable.$inferSelect;
export type InsertPracticeArea = typeof practiceAreasTable.$inferInsert;
