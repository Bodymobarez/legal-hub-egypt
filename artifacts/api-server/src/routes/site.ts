import { Router, type IRouter } from "express";
import { count, eq } from "drizzle-orm";
import {
  db,
  siteSettingsTable,
  lawyersTable,
  practiceAreasTable,
  casesTable,
  clientsTable,
} from "@workspace/db";
import {
  GetSiteInfoResponse,
  GetWorkHoursStatusResponse,
  GetSiteStatsResponse,
} from "@workspace/api-zod";
import {
  isOfficeOpen,
  getNextOpenAt,
  TIMEZONE,
  DEFAULT_WORK_HOURS,
  type WorkHourEntry,
} from "../lib/work-hours";

const router: IRouter = Router();

async function loadSettings(): Promise<Record<string, unknown>> {
  const rows = await db.select().from(siteSettingsTable);
  const out: Record<string, unknown> = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

router.get("/site/info", async (_req, res): Promise<void> => {
  const s = await loadSettings();
  const info = (s["site_info"] as Record<string, unknown>) ?? {};
  const workHours = (s["work_hours"] as WorkHourEntry[]) ?? DEFAULT_WORK_HOURS;
  const social = (s["social"] as Record<string, string | null>) ?? {};

  const payload = {
    nameAr: (info["nameAr"] as string) ?? "مكتب مصر للمحاماة",
    nameEn: (info["nameEn"] as string) ?? "Egypt Advocates",
    taglineAr: (info["taglineAr"] as string) ?? "محمد أ. عثمان للمحاماة والاستشارات القانونية",
    taglineEn: (info["taglineEn"] as string) ?? "Mohamed A. Osaman Law Firm — Legal Consultants",
    addressAr: (info["addressAr"] as string) ?? "القاهرة، جمهورية مصر العربية",
    addressEn: (info["addressEn"] as string) ?? "Cairo, Arab Republic of Egypt",
    phone: (info["phone"] as string) ?? "+20 100 000 0000",
    whatsapp: (info["whatsapp"] as string) ?? "+20 100 000 0000",
    email: (info["email"] as string) ?? "info@egypt-advocates.com",
    established: (info["established"] as number) ?? 2008,
    workHours,
    social: {
      facebook: social["facebook"] ?? null,
      instagram: social["instagram"] ?? null,
      twitter: social["twitter"] ?? null,
      linkedin: social["linkedin"] ?? null,
      youtube: social["youtube"] ?? null,
    },
  };
  res.json(GetSiteInfoResponse.parse(payload));
});

router.get("/site/work-hours-status", async (_req, res): Promise<void> => {
  const s = await loadSettings();
  const workHours = (s["work_hours"] as WorkHourEntry[]) ?? DEFAULT_WORK_HOURS;
  const now = new Date();
  const open = isOfficeOpen(now, workHours);
  const next = open ? null : getNextOpenAt(now, workHours);
  res.json(
    GetWorkHoursStatusResponse.parse({
      isOpen: open,
      timezone: TIMEZONE,
      currentTime: now.toISOString(),
      nextOpenAt: next ? next.toISOString() : null,
      message: open ? "Office is open" : "Office is currently closed",
    }),
  );
});

router.get("/stats/site", async (_req, res): Promise<void> => {
  const s = await loadSettings();
  const overrides = (s["site_stats"] as Record<string, number>) ?? {};
  const [{ value: lawyersCount }] = await db
    .select({ value: count() })
    .from(lawyersTable)
    .where(eq(lawyersTable.isActive, true));
  const [{ value: areasCount }] = await db
    .select({ value: count() })
    .from(practiceAreasTable)
    .where(eq(practiceAreasTable.isActive, true));
  const [{ value: casesCount }] = await db.select({ value: count() }).from(casesTable);
  const [{ value: clientsCount }] = await db.select({ value: count() }).from(clientsTable);

  res.json(
    GetSiteStatsResponse.parse({
      casesHandled: overrides["casesHandled"] ?? Math.max(casesCount, 1500),
      satisfiedClients: overrides["satisfiedClients"] ?? Math.max(clientsCount, 1200),
      yearsOfExperience: overrides["yearsOfExperience"] ?? 18,
      successRate: overrides["successRate"] ?? 96,
      lawyersCount,
      practiceAreasCount: areasCount,
    }),
  );
});

export default router;
