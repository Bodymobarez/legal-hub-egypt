import { Router, type IRouter } from "express";
import { asc, desc, eq } from "drizzle-orm";
import { db, chatThreadsTable, chatMessagesTable } from "@workspace/db";
import { AdminReplyChatBody } from "@workspace/api-zod";
import { requireAdmin } from "../../middlewares/require-admin";
import { threadDto, messageDto } from "../chat";

const router: IRouter = Router();
router.use(requireAdmin);

router.get("/admin/chat/threads", async (req, res): Promise<void> => {
  const status = typeof req.query.status === "string" ? req.query.status : "";
  const where = status ? eq(chatThreadsTable.status, status) : undefined;
  const rows = await db
    .select()
    .from(chatThreadsTable)
    .where(where!)
    .orderBy(desc(chatThreadsTable.lastMessageAt));
  res.json(rows.map(threadDto));
});

router.get("/admin/chat/threads/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [thread] = await db.select().from(chatThreadsTable).where(eq(chatThreadsTable.id, id));
  if (!thread) {
    res.status(404).json({ error: "Thread not found" });
    return;
  }
  await db
    .update(chatThreadsTable)
    .set({ unreadByAdmin: 0 })
    .where(eq(chatThreadsTable.id, id));
  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.threadId, id))
    .orderBy(asc(chatMessagesTable.createdAt), asc(chatMessagesTable.id));
  res.json({
    thread: threadDto({ ...thread, unreadByAdmin: 0 }),
    messages: messages.map(messageDto),
  });
});

router.post("/admin/chat/threads/:id/reply", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = AdminReplyChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const agentName = parsed.data.agentName ?? req.adminUser?.name ?? "Support";
  const [m] = await db
    .insert(chatMessagesTable)
    .values({
      threadId: id,
      senderType: "agent",
      senderName: agentName,
      content: parsed.data.content,
    })
    .returning();
  await db
    .update(chatThreadsTable)
    .set({ lastMessageAt: new Date(), assignedTo: agentName })
    .where(eq(chatThreadsTable.id, id));
  res.status(201).json(messageDto(m));
});

router.post("/admin/chat/threads/:id/close", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db
    .update(chatThreadsTable)
    .set({ status: "closed" })
    .where(eq(chatThreadsTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(threadDto(row));
});

export default router;
