import { pgTable, serial, text, integer, boolean, jsonb } from "drizzle-orm/pg-core";

export const lawyersTable = pgTable("lawyers", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en").notNull(),
  bioAr: text("bio_ar").notNull(),
  bioEn: text("bio_en").notNull(),
  photoUrl: text("photo_url"),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  specializations: jsonb("specializations").$type<string[]>().notNull().default([]),
  yearsExperience: integer("years_experience").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export type Lawyer = typeof lawyersTable.$inferSelect;
export type InsertLawyer = typeof lawyersTable.$inferInsert;
