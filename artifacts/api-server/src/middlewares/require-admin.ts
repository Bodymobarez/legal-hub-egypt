import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, adminUsersTable } from "@workspace/db";
import { ADMIN_COOKIE_NAME } from "../lib/auth";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      adminUser?: { id: number; email: string; name: string; role: string };
    }
  }
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const raw = req.signedCookies?.[ADMIN_COOKIE_NAME];
  const id = typeof raw === "string" ? parseInt(raw, 10) : NaN;
  if (!id || Number.isNaN(id)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const [user] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.id, id));
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.adminUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
  next();
}
