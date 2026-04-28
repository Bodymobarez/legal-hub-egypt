import { pgTable, serial, text, integer, boolean, numeric } from "drizzle-orm/pg-core";
import { practiceAreasTable } from "./practice-areas";

export const servicesTable = pgTable("services", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  descriptionAr: text("description_ar").notNull(),
  descriptionEn: text("description_en").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  priceEgp: numeric("price_egp", { precision: 12, scale: 2 }).notNull().default("0"),
  deliveryMode: text("delivery_mode").notNull().default("both"),
  practiceAreaId: integer("practice_area_id").references(() => practiceAreasTable.id, { onDelete: "set null" }),
  isActive: boolean("is_active").notNull().default(true),
});

export type Service = typeof servicesTable.$inferSelect;
export type InsertService = typeof servicesTable.$inferInsert;
