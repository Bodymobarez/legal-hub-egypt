import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Minus, RotateCcw, ShieldCheck, Loader2, Scale } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useCreateChatThread,
  usePostChatMessage,
  useGetChatThread,
  useGetWorkHoursStatus,
  useCreateAdminClient,
} from "@workspace/api-client-react";
import { toast } from "sonner";

/* ─────────────────────────────────────────
   Auto-reply from localStorage settings
   Key matches admin chat settings: "chat_auto_reply"
   Fields: { enabled, welcomeAr, welcomeEn, offlineAr, offlineEn }
   ───────────────────────────────────────── */
function getAutoReplyMsg(isOnline: boolean, lang: "ar" | "en"): string | null {
  try {
    const raw = localStorage.getItem("chat_auto_reply");
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s.enabled) return null;
    if (!isOnline) {
      return lang === "ar"
        ? s.offlineAr || s.outsideHoursMessageAr || s.outsideHoursMessage || null
        : s.offlineEn || s.outsideHoursMessageEn || s.outsideHoursMessage || null;
    }
    return lang === "ar"
      ? s.welcomeAr || s.welcomeMessageAr || s.welcomeMessage || null
      : s.welcomeEn || s.welcomeMessageEn || s.welcomeMessage || null;
  } catch { /* ignore */ }
  return null;
}

/* ─────────────────────────────────────────
   Main component
   ───────────────────────────────────────── */
export default function ChatWidget() {
  const { language, t, isRtl } = useLanguage();
  const dir = isRtl ? "rtl" : "ltr";

  const [isOpen,       setIsOpen]       = useState(false);
  const [isMinimized,  setIsMinimized]  = useState(false);

  /* lead form state */
  const [name,    setName]    = useState("");
  const [phone,   setPhone]   = useState("");
  const [email,   setEmail]   = useState("");
  const [initMsg, setInitMsg] = useState("");
  const [formErr, setFormErr] = useState("");

  /* chat state */
  const [message,  setMessage]  = useState("");
  const [threadId, setThreadId] = useState<number | null>(() => {
    const s = localStorage.getItem("chat-thread-id");
    return s ? parseInt(s, 10) : null;
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);

  const { data: workHours } = useGetWorkHoursStatus();
  const isSupportOnline = !!workHours?.isOpen;

  const { data: threadData, refetch } = useGetChatThread(
    threadId as number,
    { query: { enabled: !!threadId && isOpen && !isMinimized, refetchInterval: 4000, queryKey: [] as const } as any },
  );

  const createThread  = useCreateChatThread();
  const postMessage   = usePostChatMessage();
  const createClient  = useCreateAdminClient();

  /* auto-scroll */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadData?.messages]);

  /* focus input when chat opens */
  useEffect(() => {
    if (isOpen && !isMinimized && threadId) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen, isMinimized, threadId]);

  /* ── Start conversation + create lead ── */
  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErr("");
    if (!name.trim() || !phone.trim() || !email.trim() || !initMsg.trim()) {
      setFormErr(isRtl ? "يرجى ملء جميع الحقول" : "Please fill in all fields");
      return;
    }

    try {
      /* 1. Create chat thread */
      const res = await createThread.mutateAsync({
        data: { visitorName: name, language, initialMessage: initMsg },
      });
      const newId: number = (res as any)?.id ?? (res as any)?.thread?.id;
      if (newId) {
        setThreadId(newId);
        localStorage.setItem("chat-thread-id", String(newId));
      }

      /* 2. Save as potential client (lead) — fire & forget, don't block UX */
      createClient.mutateAsync({
        data: {
          fullName: name,
          email,
          phone,
          source: "chat_widget",
          notes: `[${language.toUpperCase()} Lead via Chat] ${initMsg}`,
        },
      }).catch(() => { /* silently ignore if endpoint fails */ });

      toast.success(t("chat.leadSaved"));
    } catch (err) {
      console.error(err);
      setFormErr(isRtl ? "حدث خطأ. يرجى المحاولة مرة أخرى." : "An error occurred. Please try again.");
    }
  };

  /* ── Send message ── */
  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!message.trim() || !threadId) return;
    const content = message.trim();
    setMessage("");
    try {
      await postMessage.mutateAsync({ id: threadId, data: { content } });
      refetch();
    } catch (err) { console.error(err); }
  };

  /* ── Reset chat ── */
  const handleReset = () => {
    localStorage.removeItem("chat-thread-id");
    setThreadId(null);
    setName(""); setPhone(""); setEmail(""); setInitMsg(""); setMessage("");
  };

  /* ── Normalize messages from thread ── */
  const rawThread = threadData as any;
  const messages: Array<{ id: number; content: string; senderType: string; createdAt: string }> =
    Array.isArray(rawThread?.messages) ? rawThread.messages
    : Array.isArray(rawThread?.data?.messages) ? rawThread.data.messages
    : [];

  /* ── Auto-reply message to show as first bot message ── */
  const autoReplyText = getAutoReplyMsg(isSupportOnline, language)
    || t(isSupportOnline ? "chat.autoReply" : "chat.autoReplyOffline");

  /* ════════════════════════════════
     FAB button (closed state)
     ════════════════════════════════ */
  if (!isOpen) {
    return (
      <div className={`fixed bottom-20 lg:bottom-6 z-50 ${isRtl ? "left-4 sm:left-6" : "right-4 sm:right-6"}`}>
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping" style={{ animationDuration: "2.5s" }} />
        <button
          onClick={() => setIsOpen(true)}
          className="relative w-14 h-14 rounded-full bg-primary shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 flex items-center justify-center transition-all duration-200"
          aria-label={t("chat.start")}
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </button>
      </div>
    );
  }

  /* ════════════════════════════════
     Chat panel (open state)
     ════════════════════════════════ */
  return (
    <div dir={dir} className={`fixed bottom-20 lg:bottom-6 z-50 ${isRtl ? "left-4 sm:left-6" : "right-4 sm:right-6"}`}>
      <div
        className={`flex flex-col rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 border border-border/60 bg-card ${
          isMinimized ? "h-14 w-72" : "h-[520px] w-[360px] sm:w-[390px]"
        }`}
        style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}
      >
        {/* ── Header ── */}
        <div className="bg-primary shrink-0 px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            {/* Logo */}
            <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/40 shrink-0">
              <img src="/logo.jpeg" alt="Egypt Advocates" className="w-full h-full object-cover" />
            </div>
            {!isMinimized && (
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm leading-tight">{t("chat.headerTitle")}</p>
                <p className="text-white/70 text-[10px] leading-tight">{t("chat.headerSub")}</p>
              </div>
            )}
            {isMinimized && (
              <p className="text-white font-semibold text-sm truncate">{t("chat.headerTitle")}</p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Online dot */}
            {!isMinimized && (
              <div className="flex items-center gap-1.5 me-1">
                <span className={`w-2 h-2 rounded-full ${isSupportOnline ? "bg-emerald-400" : "bg-amber-400"}`} />
                <span className="text-white/80 text-[10px] whitespace-nowrap">
                  {t(isSupportOnline ? "chat.supportOnline" : "chat.supportOffline")}
                </span>
              </div>
            )}
            <button
              onClick={() => setIsMinimized(p => !p)}
              className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        {!isMinimized && (
          <>
            {!threadId ? (
              /* ── LEAD FORM ── */
              <div className="flex-1 overflow-y-auto">
                {/* Top banner */}
                <div className="px-5 pt-5 pb-3 text-center">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-md mx-auto mb-3">
                    <img src="/logo.jpeg" alt="Egypt Advocates" className="w-full h-full object-cover" />
                  </div>
                  <h3 className="font-serif font-bold text-base text-foreground leading-snug">{t("chat.welcome")}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t("chat.welcomeSub")}</p>
                </div>

                <form onSubmit={handleStart} className="px-4 pb-5 space-y-3">
                  <Input
                    dir={dir}
                    placeholder={t("chat.name")}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="h-10 text-sm bg-muted/40 border-border/60 focus-visible:ring-primary/30"
                  />
                  <Input
                    dir="ltr"
                    type="tel"
                    placeholder={t("chat.phone")}
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="h-10 text-sm bg-muted/40 border-border/60 focus-visible:ring-primary/30"
                  />
                  <Input
                    dir="ltr"
                    type="email"
                    placeholder={t("chat.email")}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="h-10 text-sm bg-muted/40 border-border/60 focus-visible:ring-primary/30"
                  />
                  <Textarea
                    dir={dir}
                    placeholder={t("chat.message")}
                    value={initMsg}
                    onChange={e => setInitMsg(e.target.value)}
                    rows={3}
                    className="text-sm bg-muted/40 border-border/60 focus-visible:ring-primary/30 resize-none"
                  />

                  {formErr && (
                    <p className="text-xs text-destructive text-center">{formErr}</p>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-10 gap-2 rounded-xl font-semibold"
                    disabled={createThread.isPending}
                  >
                    {createThread.isPending
                      ? <><Loader2 className="w-4 h-4 animate-spin" />{t("chat.sending")}</>
                      : <><Send className="w-4 h-4" />{t("chat.start")}</>
                    }
                  </Button>

                  <div className="flex items-center justify-center gap-1.5 text-muted-foreground/70 text-[10px] pt-1">
                    <ShieldCheck className="w-3 h-3" />
                    {t("chat.privacy")}
                  </div>
                </form>
              </div>
            ) : (
              /* ── CHAT MESSAGES ── */
              <>
                <ScrollArea className="flex-1 bg-muted/20">
                  <div className="flex flex-col gap-2.5 p-4">
                    {/* Auto-reply first message */}
                    <BotBubble text={autoReplyText} label={t("chat.botLabel")} />

                    {messages.map((msg, idx) => {
                      const isVisitor = msg.senderType === "visitor";
                      return (
                        <div key={msg.id ?? idx} className={`flex flex-col ${isVisitor ? "items-end" : "items-start"}`}>
                          <span className="text-[9px] text-muted-foreground mb-0.5 px-1">
                            {isVisitor ? t("chat.youLabel") : t("chat.teamLabel")}
                          </span>
                          <div
                            className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed wrap-break-word ${
                              isVisitor
                                ? "bg-primary text-primary-foreground rounded-se-sm"
                                : "bg-card border border-border/60 text-foreground rounded-ss-sm shadow-sm"
                            }`}
                            dir={dir}
                          >
                            {msg.content}
                          </div>
                          <span className="text-[9px] text-muted-foreground/60 mt-0.5 px-1">
                            {new Date(msg.createdAt).toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      );
                    })}

                    {messages.length === 0 && (
                      <p className="text-center text-xs text-muted-foreground mt-4 animate-pulse">
                        {t("chat.connecting")}
                      </p>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* ── Input bar ── */}
                <form onSubmit={handleSend} className="p-3 border-t border-border/50 bg-card shrink-0 flex flex-col gap-2">
                  <div className="flex items-end gap-2">
                    <Textarea
                      ref={inputRef}
                      dir={dir}
                      placeholder={t("chat.typeMessage")}
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                      }}
                      rows={1}
                      className="flex-1 min-h-[36px] max-h-[100px] text-sm bg-muted/40 border-border/60 resize-none focus-visible:ring-primary/30 py-2"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      className="h-9 w-9 shrink-0 rounded-xl bg-primary hover:bg-primary/90"
                      disabled={!message.trim() || postMessage.isPending}
                    >
                      {postMessage.isPending
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Send className="w-3.5 h-3.5" />
                      }
                    </Button>
                  </div>
                  {/* New chat link */}
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors mx-auto"
                  >
                    <RotateCcw className="w-3 h-3" />
                    {t("chat.newChat")}
                  </button>
                </form>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Bot bubble sub-component ── */
function BotBubble({ text, label }: { text: string; label: string }) {
  return (
    <div className="flex flex-col items-start">
      <span className="text-[9px] text-muted-foreground mb-0.5 px-1 flex items-center gap-1">
        <Scale className="w-2.5 h-2.5" />{label}
      </span>
      <div className="max-w-[88%] rounded-2xl rounded-ss-sm px-3.5 py-2.5 text-xs leading-relaxed bg-primary/8 border border-primary/15 text-foreground/80">
        {text}
      </div>
    </div>
  );
}
