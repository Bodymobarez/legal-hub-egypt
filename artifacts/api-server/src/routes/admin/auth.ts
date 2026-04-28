import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, adminUsersTable } from "@workspace/db";
import { AdminLoginBody } from "@workspace/api-zod";
import { verifyPassword, ADMIN_COOKIE_NAME } from "../../lib/auth";
import { requireAdmin } from "../../middlewares/require-admin";

const router: IRouter = Router();

router.post("/admin/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [user] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.email, parsed.data.email.toLowerCase().trim()));
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  res.cookie(ADMIN_COOKIE_NAME, String(user.id), {
    httpOnly: true,
    sameSite: "lax",
    signed: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
});

router.post("/admin/logout", async (_req, res): Promise<void> => {
  res.clearCookie(ADMIN_COOKIE_NAME, { path: "/" });
  res.json({ message: "Logged out" });
});

router.get("/admin/me", requireAdmin, async (req, res): Promise<void> => {
  res.json(req.adminUser);
});

export default router;
