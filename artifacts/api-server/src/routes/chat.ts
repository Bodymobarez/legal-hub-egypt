import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import { db, chatThreadsTable, chatMessagesTable } from "@workspace/db";
import {
  CreateChatThreadBody,
  PostChatMessageBody,
  GetChatThreadResponse,
} from "@workspace/api-zod";
import { botReply, botName } from "../lib/chat-bot";
import { isOfficeOpen } from "../lib/work-hours";

const router: IRouter = Router();

function threadDto(t: typeof chatThreadsTable.$inferSelect) {
  return {
    id: t.id,
    visitorName: t.visitorName,
    visitorEmail: t.visitorEmail,
    language: t.language,
    status: t.status,
    assignedTo: t.assignedTo,
    lastMessageAt: t.lastMessageAt.toISOString(),
    unreadByAdmin: t.unreadByAdmin,
    createdAt: t.createdAt.toISOString(),
  };
}
function messageDto(m: typeof chatMessagesTable.$inferSelect) {
  return {
    id: m.id,
    threadId: m.threadId,
    senderType: m.senderType,
    senderName: m.senderName,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  };
}

router.post("/chat/threads", async (req, res): Promise<void> => {
  const parsed = CreateChatThreadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const [thread] = await db
    .insert(chatThreadsTable)
    .values({
      visitorName: data.visitorName,
      visitorEmail: data.visitorEmail ?? null,
      language: data.language,
      status: "open",
      unreadByAdmin: 1,
    })
    .returning();
  await db.insert(chatMessagesTable).values({
    threadId: thread.id,
    senderType: "visitor",
    senderName: data.visitorName,
    content: data.initialMessage,
  });
  const replies = botReply(data.initialMessage, data.language, true);
  for (const r of replies) {
    await db.insert(chatMessagesTable).values({
      threadId: thread.id,
      senderType: "bot",
      senderName: botName(data.language),
      content: r,
    });
  }
  await db
    .update(chatThreadsTable)
    .set({ lastMessageAt: new Date() })
    .where(eq(chatThreadsTable.id, thread.id));
  const [refreshed] = await db.select().from(chatThreadsTable).where(eq(chatThreadsTable.id, thread.id));
  res.status(201).json(threadDto(refreshed));
});

router.get("/chat/threads/:id", async (req, res): Promise<void> => {
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
  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.threadId, id))
    .orderBy(asc(chatMessagesTable.createdAt), asc(chatMessagesTable.id));
  res.json(
    GetChatThreadResponse.parse({
      thread: threadDto(thread),
      messages: messages.map(messageDto),
    }),
  );
});

router.post("/chat/threads/:id/messages", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = PostChatMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [thread] = await db.select().from(chatThreadsTable).where(eq(chatThreadsTable.id, id));
  if (!thread) {
    res.status(404).json({ error: "Thread not found" });
    return;
  }
  const [userMsg] = await db
    .insert(chatMessagesTable)
    .values({
      threadId: id,
      senderType: "visitor",
      senderName: thread.visitorName,
      content: parsed.data.content,
    })
    .returning();

  const replies = botReply(parsed.data.content, thread.language as "ar" | "en", false);
  const inserted = [];
  for (const r of replies) {
    const [m] = await db
      .insert(chatMessagesTable)
      .values({
        threadId: id,
        senderType: "bot",
        senderName: botName(thread.language as "ar" | "en"),
        content: r,
      })
      .returning();
    inserted.push(m);
  }
  await db
    .update(chatThreadsTable)
    .set({
      lastMessageAt: new Date(),
      unreadByAdmin: thread.unreadByAdmin + 1,
      status: isOfficeOpen(new Date()) ? "awaiting_support" : "open",
    })
    .where(eq(chatThreadsTable.id, id));
  res.status(201).json({
    userMessage: messageDto(userMsg),
    replies: inserted.map(messageDto),
    isSupportOnline: isOfficeOpen(new Date()),
  });
});

export default router;
export { threadDto, messageDto };
