import { Router, type IRouter } from "express";
import { asc, desc, eq } from "drizzle-orm";
import { db, chatThreadsTable, chatMessagesTable } from "@workspace/db";
import { AdminReplyChatBody } from "@workspace/api-zod";
import { requireAdmin } from "../../middlewares/require-admin";
import { threadDto, messageDto } from "../chat";

const router: IRouter = Router();
router.use(requireAdmin);

router.get("/admin/chat/threads", async (req, res, next): Promise<void> => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : "";
    /* Drizzle accepts an undefined predicate (drops the WHERE), but only
       when we don't pass it at all. Build the query conditionally to
       avoid the `.where(undefined!)` pattern that bit us in production. */
    const base = db.select().from(chatThreadsTable);
    const rows = await (status
      ? base.where(eq(chatThreadsTable.status, status))
      : base
    ).orderBy(desc(chatThreadsTable.lastMessageAt));
    res.json(rows.map(threadDto));
  } catch (err) {
    next(err);
  }
});

router.get("/admin/chat/threads/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  /**
   * Fetch the thread and its messages in parallel — saves one round-trip on
   * every poll (every ~8s while the admin has a chat open).
   */
  const [threadRows, messages] = await Promise.all([
    db.select().from(chatThreadsTable).where(eq(chatThreadsTable.id, id)),
    db
      .select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.threadId, id))
      .orderBy(asc(chatMessagesTable.createdAt), asc(chatMessagesTable.id)),
  ]);
  const thread = threadRows[0];
  if (!thread) {
    res.status(404).json({ error: "Thread not found" });
    return;
  }
  /** Reset unread counter without making the client wait for the UPDATE. */
  if (thread.unreadByAdmin > 0) {
    void db
      .update(chatThreadsTable)
      .set({ unreadByAdmin: 0 })
      .where(eq(chatThreadsTable.id, id))
      .catch(() => undefined);
  }
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
