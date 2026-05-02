import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { format } from "date-fns";
import {
  useListAdminChatThreads,
  useGetAdminChatThread,
  useAdminReplyChat,
  useAdminMe,
  getGetAdminChatThreadQueryKey,
  getListAdminChatThreadsQueryKey,
  type ChatThread,
  type ChatMessage,
  type ChatThreadWithMessages,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Send, Headset, Archive, MessageSquare, Bot,
  Clock, CheckCircle2, Circle, Search, Settings2,
  ChevronRight, RotateCcw, Zap, AlarmClock,
  UserRoundCog, ArrowRightLeft, User, Check,
} from "lucide-react";
import { useAdminI18n } from "@/lib/admin-i18n";
import { useFeatureGate } from "@/lib/tenants";
import { PageHeader, StatusBadge } from "@/components/admin-ui";
import { loadUsers } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

/* ──────────────────────────────────────────────
   Thread assignment helpers (localStorage)
   ────────────────────────────────────────────── */
interface ThreadAssignment {
  userId:   string;
  userName: string;
  userEmail: string;
  assignedAt: string;
}
const ASSIGN_KEY = "chat_thread_assignments";
function loadThreadAssignments(): Record<number, ThreadAssignment> {
  try { return JSON.parse(localStorage.getItem(ASSIGN_KEY) || "{}"); }
  catch { return {}; }
}
function saveThreadAssignment(threadId: number, assignment: ThreadAssignment | null) {
  const all = loadThreadAssignments();
  if (assignment) all[threadId] = assignment;
  else delete all[threadId];
  localStorage.setItem(ASSIGN_KEY, JSON.stringify(all));
}

/* ──────────────────────────────────────────────
   Working hours types & defaults
   ────────────────────────────────────────────── */
interface DaySchedule {
  enabled: boolean;
  from: string; // "09:00"
  to: string;   // "17:00"
}
interface WorkingHours {
  days: Record<string, DaySchedule>;
  timezone: string;
}
interface AutoReplyConfig {
  enabled: boolean;
  welcomeAr: string;
  welcomeEn: string;
  offlineAr: string;
  offlineEn: string;
  quickReplies: string[];
}

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const DEFAULT_WORKING_HOURS: WorkingHours = {
  timezone: "Africa/Cairo",
  days: {
    sun: { enabled: true,  from: "09:00", to: "17:00" },
    mon: { enabled: true,  from: "09:00", to: "17:00" },
    tue: { enabled: true,  from: "09:00", to: "17:00" },
    wed: { enabled: true,  from: "09:00", to: "17:00" },
    thu: { enabled: true,  from: "09:00", to: "17:00" },
    fri: { enabled: false, from: "09:00", to: "17:00" },
    sat: { enabled: false, from: "09:00", to: "17:00" },
  },
};

const DEFAULT_AUTO_REPLY: AutoReplyConfig = {
  enabled: true,
  welcomeAr: "مرحباً! شكراً لتواصلك مع مكتب إيجيبت أدفوكيتس. سيرد عليك أحد المستشارين قريباً.",
  welcomeEn: "Hello! Thank you for contacting Egypt Advocates. One of our legal consultants will reply shortly.",
  offlineAr: "شكراً لرسالتك. مكتبنا مغلق حالياً. أوقات العمل: الأحد–الخميس ٩ ص–٥ م بتوقيت القاهرة.",
  offlineEn: "Thank you for your message. Our office is currently closed. Working hours: Sun–Thu 9am–5pm Cairo time.",
  quickReplies: [
    "سيتم الرد عليك خلال ساعات قليلة.",
    "نشكرك على تواصلك معنا.",
    "هل يمكنك توضيح طبيعة القضية؟",
  ],
};

function loadLS<T>(key: string, def: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : def;
  } catch { return def; }
}
function saveLS<T>(key: string, val: T) {
  localStorage.setItem(key, JSON.stringify(val));
}

/* ──────────────────────────────────────────────
   Status chip helper
   ────────────────────────────────────────────── */
function threadStatusLabel(s: string, isRtl: boolean) {
  const map: Record<string, [string, string]> = {
    open:             ["مفتوح",         "Open"],
    awaiting_support: ["ينتظر الرد",    "Awaiting"],
    closed:           ["مغلق",          "Closed"],
  };
  return (map[s] ?? [s, s])[isRtl ? 0 : 1];
}

function threadStatusDot(s: string) {
  if (s === "open")             return "bg-emerald-500";
  if (s === "awaiting_support") return "bg-amber-500 animate-pulse";
  return "bg-muted-foreground/40";
}

/* ══════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════ */
const CHAT_TAB_IDS = ["conversations", "autoreply", "hours"] as const;

export default function AdminChat() {
  const { ta, isRtl } = useAdminI18n();
  const dir = isRtl ? "rtl" : "ltr";

  const gate = useFeatureGate("chat");
  const enabledTabs = CHAT_TAB_IDS.filter(id => gate(id));
  const defaultTab = enabledTabs[0] ?? "conversations";
  const tabKey = enabledTabs.join(",");

  /* ── Chat state ── */
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [replyText, setReplyText]               = useState("");
  const [searchQ, setSearchQ]                   = useState("");
  const [statusFilter, setStatusFilter]         = useState<string>("all");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* ── Transfer dialog ── */
  const [showTransfer,    setShowTransfer]    = useState(false);
  const [transferSearch,  setTransferSearch]  = useState("");
  const [assignments,     setAssignments]     = useState<Record<number, ThreadAssignment>>(loadThreadAssignments);

  /* ── Settings state ── */
  const [autoReply, setAutoReply] = useState<AutoReplyConfig>(() => loadLS("chat_auto_reply", DEFAULT_AUTO_REPLY));
  const [wh, setWh]               = useState<WorkingHours>(() => loadLS("chat_working_hours", DEFAULT_WORKING_HOURS));
  const [newQr, setNewQr]         = useState("");

  /* ── API ── */
  const queryClient = useQueryClient();
  const { data: currentUser } = useAdminMe();
  /** Display name for outgoing messages (used by optimistic update + send). */
  const myAgentName = currentUser?.name ?? (isRtl ? "فريق الدعم" : "Support Team");

  const { data: _raw, isLoading } = useListAdminChatThreads(
    {},
    {
      query: {
        queryKey: getListAdminChatThreadsQueryKey({}),
        // Background refresh — keeps the list near-real-time without redundant fetches when nothing changed.
        refetchInterval: 15_000,
        refetchIntervalInBackground: false,
        staleTime: 5_000,
      },
    },
  );
  const threads: ChatThread[] = useMemo(() => {
    if (Array.isArray(_raw)) return _raw;
    const r = _raw as { data?: ChatThread[]; items?: ChatThread[] } | undefined;
    return r?.data ?? r?.items ?? [];
  }, [_raw]);

  const { data: _activeRaw, isLoading: loadingThread } = useGetAdminChatThread(
    selectedThreadId ?? 0,
    {
      query: {
        queryKey: getGetAdminChatThreadQueryKey(selectedThreadId ?? 0),
        enabled: selectedThreadId != null,
        refetchInterval: 8_000,
        refetchIntervalInBackground: false,
        staleTime: 3_000,
        // Keep showing previous thread while new one loads → no flash of empty state.
        placeholderData: (prev) => prev,
      },
    },
  );

  /** Normalize: API may return `{ thread, messages }` OR a flat row with messages array. */
  const activeData: ChatThreadWithMessages | undefined = useMemo(() => {
    if (!_activeRaw) return undefined;
    const raw = _activeRaw as ChatThreadWithMessages | (ChatThread & { messages?: ChatMessage[] }) | { data?: ChatThreadWithMessages };
    if ("thread" in raw && raw.thread && typeof raw.thread === "object") {
      return raw as ChatThreadWithMessages;
    }
    if ("visitorName" in raw && raw.visitorName !== undefined) {
      const { messages, ...threadFields } = raw as ChatThread & { messages?: ChatMessage[] };
      return { thread: threadFields as ChatThread, messages: Array.isArray(messages) ? messages : [] };
    }
    if ("data" in raw && raw.data) return raw.data as ChatThreadWithMessages;
    return undefined;
  }, [_activeRaw]);

  /**
   * Optimistic reply: append the message into the cache immediately so the UI
   * feels instantaneous, then reconcile with the server response.
   */
  const replyChat = useAdminReplyChat({
    mutation: {
      onMutate: async ({ id, data }) => {
        const key = getGetAdminChatThreadQueryKey(id);
        await queryClient.cancelQueries({ queryKey: key });
        const previous = queryClient.getQueryData<ChatThreadWithMessages>(key);
        if (previous) {
          const optimistic: ChatMessage = {
            id: -Date.now(),
            threadId: id,
            senderType: "agent",
            senderName: data.agentName ?? myAgentName,
            content: data.content,
            createdAt: new Date().toISOString(),
          };
          queryClient.setQueryData<ChatThreadWithMessages>(key, {
            ...previous,
            thread: { ...previous.thread, lastMessageAt: optimistic.createdAt },
            messages: [...previous.messages, optimistic],
          });
        }
        return { previous };
      },
      onError: (_err, vars, ctx) => {
        if (ctx?.previous) {
          queryClient.setQueryData(getGetAdminChatThreadQueryKey(vars.id), ctx.previous);
        }
      },
      onSettled: (_d, _e, vars) => {
        queryClient.invalidateQueries({ queryKey: getGetAdminChatThreadQueryKey(vars.id) });
        queryClient.invalidateQueries({ queryKey: getListAdminChatThreadsQueryKey() });
      },
    },
  });

  /* Team members list (from localStorage) for transfer */
  const teamUsers = useMemo(() => loadUsers().filter(u => u.isActive), []);

  /**
   * Smart auto-scroll: only scrolls when the message count actually grew, and
   * jumps instantly on thread switch. Prevents the constant smooth-scroll
   * jitter that the 5s polling caused on every re-render.
   */
  const lastMsgCount = useRef(0);
  const lastThreadId = useRef<number | null>(null);
  useEffect(() => {
    const count = activeData?.messages.length ?? 0;
    const threadChanged = lastThreadId.current !== selectedThreadId;
    if (count > lastMsgCount.current || threadChanged) {
      messagesEndRef.current?.scrollIntoView({ behavior: threadChanged ? "auto" : "smooth", block: "end" });
    }
    lastMsgCount.current = count;
    lastThreadId.current = selectedThreadId;
  }, [activeData?.messages.length, selectedThreadId]);

  /* ── Handlers ── */
  const handleSend = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedThreadId) return;
    const content = replyText.trim();
    setReplyText("");
    try {
      await replyChat.mutateAsync({ id: selectedThreadId, data: { content, agentName: myAgentName } });
    } catch {
      setReplyText(content);
      toast.error(isRtl ? "فشل إرسال الرسالة" : "Failed to send");
    }
  }, [replyText, selectedThreadId, replyChat, myAgentName, isRtl]);

  /* ── Transfer handler ── */
  const handleTransfer = (user: ReturnType<typeof loadUsers>[0]) => {
    if (!selectedThreadId) return;
    const assignment: ThreadAssignment = {
      userId:    user.id,
      userName:  user.name,
      userEmail: user.email,
      assignedAt: new Date().toISOString(),
    };
    saveThreadAssignment(selectedThreadId, assignment);
    setAssignments(loadThreadAssignments());
    setShowTransfer(false);
    setTransferSearch("");
    toast.success(
      isRtl
        ? `تم تحويل المحادثة إلى ${user.name}`
        : `Conversation transferred to ${user.name}`
    );
  };

  const clearAssignment = () => {
    if (!selectedThreadId) return;
    saveThreadAssignment(selectedThreadId, null);
    setAssignments(loadThreadAssignments());
    toast.success(isRtl ? "تم إلغاء التعيين" : "Assignment cleared");
  };

  const saveAutoReply = (next: AutoReplyConfig) => {
    setAutoReply(next);
    saveLS("chat_auto_reply", next);
    toast.success(isRtl ? "تم الحفظ" : "Saved");
  };

  const saveWH = (next: WorkingHours) => {
    setWh(next);
    saveLS("chat_working_hours", next);
    toast.success(isRtl ? "تم الحفظ" : "Saved");
  };

  const addQR = () => {
    if (!newQr.trim()) return;
    saveAutoReply({ ...autoReply, quickReplies: [...autoReply.quickReplies, newQr.trim()] });
    setNewQr("");
  };

  /* ── Filtered threads ── */
  const filtered = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return threads.filter(t => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (q && !t.visitorName?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [threads, statusFilter, searchQ]);

  const unreadTotal = useMemo(
    () => threads.reduce((s, t) => s + (t.unreadByAdmin ?? 0), 0),
    [threads],
  );

  const DAY_NAMES: Record<string, [string, string]> = {
    sun: ["الأحد",    "Sunday"],
    mon: ["الإثنين",  "Monday"],
    tue: ["الثلاثاء", "Tuesday"],
    wed: ["الأربعاء", "Wednesday"],
    thu: ["الخميس",   "Thursday"],
    fri: ["الجمعة",   "Friday"],
    sat: ["السبت",    "Saturday"],
  };

  /* ══════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════ */
  return (
    <div dir={dir} className="space-y-5">
      <PageHeader
        title={isRtl ? "المحادثات والدعم" : "Chat & Support"}
        subtitle={isRtl ? "إدارة محادثات العملاء والرد التلقائي" : "Manage client conversations and auto-replies"}
        icon={<Headset className="w-5 h-5" />}
        action={
          unreadTotal > 0
            ? <Badge className="bg-amber-500 text-white border-0 gap-1 text-xs"><Circle className="w-2 h-2 fill-current" />{unreadTotal} {isRtl ? "غير مقروء" : "unread"}</Badge>
            : undefined
        }
      />

      <Tabs key={tabKey} defaultValue={defaultTab} className="w-full">
        <TabsList className="mb-4 h-10 bg-muted/30 border border-border/50 p-1 gap-1">
          {gate("conversations") && (
            <TabsTrigger value="conversations" className="gap-2 text-xs">
              <MessageSquare className="w-3.5 h-3.5" />
              {isRtl ? "المحادثات" : "Conversations"}
              {unreadTotal > 0 && <Badge className="h-4 min-w-4 px-1 bg-primary text-[10px]">{unreadTotal}</Badge>}
            </TabsTrigger>
          )}
          {gate("autoreply") && (
            <TabsTrigger value="autoreply" className="gap-2 text-xs">
              <Bot className="w-3.5 h-3.5" />
              {isRtl ? "الرد التلقائي" : "Auto-Reply"}
            </TabsTrigger>
          )}
          {gate("hours") && (
            <TabsTrigger value="hours" className="gap-2 text-xs">
              <AlarmClock className="w-3.5 h-3.5" />
              {isRtl ? "أوقات العمل" : "Working Hours"}
            </TabsTrigger>
          )}
        </TabsList>

        {/* ══ TAB: CONVERSATIONS ══ */}
        <TabsContent value="conversations" className="mt-0">
          <div className="flex flex-col sm:flex-row gap-4 h-[calc(100vh-15rem)]">

            {/* Thread list */}
            <div className="w-full sm:w-[300px] shrink-0 flex flex-col rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
              {/* Search + filter */}
              <div className="p-3 border-b bg-muted/10 space-y-2 shrink-0">
                <div className="relative">
                  <Search className="absolute inset-s-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    placeholder={isRtl ? "بحث…" : "Search…"}
                    className="ps-8 h-8 text-xs"
                  />
                </div>
                <div className="flex gap-1 flex-wrap">
                  {["all", "open", "awaiting_support", "closed"].map(s => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-border/60 text-muted-foreground hover:bg-muted/30"}`}
                    >
                      {s === "all" ? (isRtl ? "الكل" : "All")
                        : s === "open" ? (isRtl ? "مفتوح" : "Open")
                        : s === "awaiting_support" ? (isRtl ? "انتظار" : "Waiting")
                        : (isRtl ? "مغلق" : "Closed")}
                    </button>
                  ))}
                </div>
              </div>

              <ScrollArea className="flex-1">
                {isLoading ? (
                  <div className="p-4 space-y-3">
                    {[1,2,3].map(i => <div key={i} className="h-14 rounded-lg bg-muted/30 animate-pulse" />)}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
                    <MessageSquare className="w-8 h-8 opacity-20" />
                    <p className="text-xs">{isRtl ? "لا توجد محادثات" : "No conversations"}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {filtered.map(thread => {
                      const isActive = selectedThreadId === thread.id;
                      return (
                        <button
                          key={thread.id}
                          className={`w-full text-start p-3 transition-colors relative flex items-start gap-3 ${isActive ? "bg-primary/8 border-s-2 border-s-primary" : "hover:bg-muted/20"}`}
                          onClick={() => setSelectedThreadId(thread.id)}
                        >
                          {/* Avatar */}
                          <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold uppercase ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                            {thread.visitorName?.[0] ?? "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-medium text-xs truncate">{thread.visitorName}</span>
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {format(new Date(thread.lastMessageAt), "h:mm a")}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <div className={`w-1.5 h-1.5 rounded-full ${threadStatusDot(thread.status)}`} />
                              <span className="text-[10px] text-muted-foreground">
                                {threadStatusLabel(thread.status, isRtl)}
                              </span>
                              <span className="text-[10px] text-muted-foreground/50">· {thread.language?.toUpperCase()}</span>
                              {/* Assigned agent badge in thread list */}
                              {assignments[thread.id] && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium flex items-center gap-0.5 truncate max-w-[80px]">
                                  <UserRoundCog className="w-2.5 h-2.5 shrink-0" />
                                  {assignments[thread.id].userName}
                                </span>
                              )}
                            </div>
                          </div>
                          {(thread.unreadByAdmin ?? 0) > 0 && (
                            <span className="absolute inset-e-2 top-3 h-4 min-w-4 px-1 bg-primary text-primary-foreground rounded-full text-[9px] flex items-center justify-center font-bold">
                              {thread.unreadByAdmin}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              <div className="p-2 border-t bg-muted/5 shrink-0 text-center text-[10px] text-muted-foreground">
                {threads.length} {isRtl ? "محادثة" : "conversations"}
              </div>
            </div>

            {/* Message pane */}
            <div className="flex-1 flex flex-col rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
              {selectedThreadId && activeData ? (
                <>
                  {/* Thread header */}
                  <div className="px-4 py-3 border-b bg-muted/10 flex items-center justify-between shrink-0 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold text-sm uppercase shrink-0">
                        {activeData.thread.visitorName?.[0] ?? "?"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm truncate">{activeData.thread.visitorName}</span>
                          <Badge variant="outline" className="text-[9px] uppercase shrink-0">
                            {threadStatusLabel(activeData.thread.status, isRtl)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          <p className="text-[10px] text-muted-foreground">
                            {isRtl ? "بدأ في" : "Started"} {format(new Date(activeData.thread.createdAt), "MMM d, yyyy")}
                            {" · "}{activeData.messages.length} {isRtl ? "رسالة" : "messages"}
                          </p>
                          {/* Assigned agent chip */}
                          {selectedThreadId && assignments[selectedThreadId] && (
                            <button
                              onClick={clearAssignment}
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium hover:bg-destructive/10 hover:text-destructive transition-colors"
                              title={isRtl ? "اضغط لإلغاء التعيين" : "Click to unassign"}
                            >
                              <UserRoundCog className="w-2.5 h-2.5" />
                              {assignments[selectedThreadId].userName}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Transfer button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs shrink-0"
                      onClick={() => setShowTransfer(true)}
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5" />
                      {isRtl ? "تحويل" : "Transfer"}
                    </Button>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 bg-muted/5">
                    <div className="p-4 space-y-3">
                      {loadingThread && !activeData.messages.length ? (
                        <div className="space-y-3">
                          {[1,2,3].map(i => <div key={i} className={`h-12 rounded-2xl bg-muted/30 animate-pulse ${i % 2 === 0 ? "ms-auto w-48" : "w-56"}`} />)}
                        </div>
                      ) : activeData.messages.map((msg, idx) => {
                        const isVisitor = msg.senderType === "visitor";
                        const isBot     = msg.senderType === "bot";
                        const agentLabel = (msg as any).agentName || (msg as any).senderName;
                        return (
                          <div key={idx} className={`flex flex-col ${isVisitor ? "items-start" : "items-end"}`}>
                            {/* Visitor name */}
                            {isVisitor && (
                              <span className="text-[10px] text-muted-foreground mb-1 ms-1">{msg.senderName}</span>
                            )}
                            {/* Bot indicator */}
                            {isBot && (
                              <div className="flex items-center gap-1 mb-1">
                                <Bot className="w-3 h-3 text-amber-500" />
                                <span className="text-[10px] text-muted-foreground">{isRtl ? "رد تلقائي" : "Auto-reply"}</span>
                              </div>
                            )}
                            {/* Agent name above their message */}
                            {!isVisitor && !isBot && agentLabel && (
                              <div className="flex items-center gap-1 mb-1">
                                <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                                  <User className="w-2.5 h-2.5 text-primary" />
                                </div>
                                <span className="text-[10px] font-medium text-primary/80">{agentLabel}</span>
                              </div>
                            )}
                            <div className={`max-w-[72%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                              isVisitor ? "bg-card border border-border/60 text-foreground rounded-ss-sm"
                                : isBot ? "bg-amber-50 border border-amber-200 text-amber-900 rounded-se-sm dark:bg-amber-900/20 dark:text-amber-200"
                                : "bg-primary text-primary-foreground rounded-se-sm"
                            }`}>
                              {msg.content}
                            </div>
                            <span className="text-[9px] text-muted-foreground mt-1 mx-1">
                              {format(new Date(msg.createdAt), "h:mm a")}
                            </span>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Quick replies */}
                  {autoReply.quickReplies.length > 0 && activeData.thread.status !== "closed" && (
                    <div className="px-4 py-2 border-t bg-muted/5 flex gap-2 flex-wrap shrink-0">
                      <Zap className="w-3.5 h-3.5 text-primary/60 shrink-0 mt-0.5" />
                      {autoReply.quickReplies.slice(0, 3).map((qr, i) => (
                        <button
                          key={i}
                          onClick={() => setReplyText(qr)}
                          className="text-[10px] px-2 py-1 rounded-full border border-border/60 hover:border-primary hover:text-primary transition-colors truncate max-w-[180px]"
                        >
                          {qr}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Reply input */}
                  <div className="p-3 border-t bg-card shrink-0">
                    {activeData.thread.status === "closed" ? (
                      <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
                        <Archive className="w-4 h-4" />
                        {isRtl ? "هذه المحادثة مغلقة" : "This conversation is closed"}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* "Replying as" bar */}
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/8 text-primary border border-primary/15">
                            <div className="w-3 h-3 rounded-full bg-primary/20 flex items-center justify-center">
                              <User className="w-2 h-2" />
                            </div>
                            <span className="font-medium">{myAgentName}</span>
                          </div>
                          <span>{isRtl ? "يرد الآن" : "replying now"}</span>
                        </div>
                        <form onSubmit={handleSend} className="flex items-end gap-2">
                          <Textarea
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
                            placeholder={isRtl ? "اكتب ردك… (Enter للإرسال)" : "Type reply… (Enter to send)"}
                            className="flex-1 min-h-[60px] max-h-[120px] resize-none text-sm"
                            dir={dir}
                          />
                          <Button type="submit" size="icon" className="h-10 w-10 shrink-0" disabled={!replyText.trim() || replyChat.isPending}>
                            <Send className="h-4 w-4" />
                          </Button>
                        </form>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-4">
                  <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center">
                    <Headset className="h-7 w-7 opacity-30" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">{isRtl ? "اختر محادثة" : "Select a conversation"}</p>
                    <p className="text-xs text-muted-foreground mt-1">{isRtl ? "اضغط على محادثة من القائمة للبدء" : "Click a thread on the left to start"}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ══ TAB: AUTO-REPLY ══ */}
        <TabsContent value="autoreply" className="mt-0">
          <div className="max-w-2xl space-y-5">
            {/* Master toggle */}
            <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{isRtl ? "تفعيل الرد التلقائي" : "Enable Auto-Reply"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isRtl ? "إرسال رسائل تلقائية للزوار فور تواصلهم" : "Send automatic messages when visitors start a chat"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={autoReply.enabled}
                  onCheckedChange={v => saveAutoReply({ ...autoReply, enabled: v })}
                />
              </div>
            </div>

            {/* Welcome messages */}
            <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4 text-primary/70" />
                <h3 className="font-semibold text-sm">{isRtl ? "رسالة الترحيب" : "Welcome Message"}</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                    {isRtl ? "النص العربي" : "Arabic Text"}
                    <span className="bg-primary/10 text-primary text-[9px] px-1.5 py-0.5 rounded font-mono">AR</span>
                  </Label>
                  <Textarea
                    dir="rtl"
                    rows={3}
                    value={autoReply.welcomeAr}
                    onChange={e => setAutoReply(p => ({ ...p, welcomeAr: e.target.value }))}
                    className="text-sm"
                    placeholder="رسالة الترحيب بالعربية"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                    {isRtl ? "النص الإنجليزي" : "English Text"}
                    <span className="bg-blue-500/10 text-blue-500 text-[9px] px-1.5 py-0.5 rounded font-mono">EN</span>
                  </Label>
                  <Textarea
                    dir="ltr"
                    rows={3}
                    value={autoReply.welcomeEn}
                    onChange={e => setAutoReply(p => ({ ...p, welcomeEn: e.target.value }))}
                    className="text-sm"
                    placeholder="Welcome message in English"
                  />
                </div>
              </div>
            </div>

            {/* Offline messages */}
            <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-amber-500" />
                <h3 className="font-semibold text-sm">{isRtl ? "رسالة خارج أوقات العمل" : "Outside Working Hours Message"}</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                    {isRtl ? "النص العربي" : "Arabic Text"}
                    <span className="bg-primary/10 text-primary text-[9px] px-1.5 py-0.5 rounded font-mono">AR</span>
                  </Label>
                  <Textarea
                    dir="rtl"
                    rows={3}
                    value={autoReply.offlineAr}
                    onChange={e => setAutoReply(p => ({ ...p, offlineAr: e.target.value }))}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                    {isRtl ? "النص الإنجليزي" : "English Text"}
                    <span className="bg-blue-500/10 text-blue-500 text-[9px] px-1.5 py-0.5 rounded font-mono">EN</span>
                  </Label>
                  <Textarea
                    dir="ltr"
                    rows={3}
                    value={autoReply.offlineEn}
                    onChange={e => setAutoReply(p => ({ ...p, offlineEn: e.target.value }))}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Quick replies */}
            <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary/70" />
                <h3 className="font-semibold text-sm">{isRtl ? "الردود السريعة" : "Quick Replies"}</h3>
              </div>
              <p className="text-xs text-muted-foreground">{isRtl ? "نصوص جاهزة تظهر في شريط المحادثة لإرسالها بضغطة واحدة" : "Preset texts shown in the chat bar for one-click sending"}</p>
              <div className="space-y-2">
                {autoReply.quickReplies.map((qr, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/40">
                    <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-sm">{qr}</span>
                    <button
                      onClick={() => saveAutoReply({ ...autoReply, quickReplies: autoReply.quickReplies.filter((_, j) => j !== i) })}
                      className="text-muted-foreground hover:text-destructive transition-colors text-xs shrink-0"
                    >×</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newQr}
                  onChange={e => setNewQr(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addQR()}
                  placeholder={isRtl ? "أضف رداً سريعاً…" : "Add quick reply…"}
                  className="flex-1 text-sm h-9"
                />
                <Button size="sm" variant="outline" onClick={addQR} className="shrink-0">
                  {isRtl ? "إضافة" : "Add"}
                </Button>
              </div>
            </div>

            {/* Save */}
            <div className="flex justify-end gap-3 pt-1">
              <Button
                variant="outline" size="sm"
                onClick={() => { setAutoReply(DEFAULT_AUTO_REPLY); saveLS("chat_auto_reply", DEFAULT_AUTO_REPLY); toast.info(isRtl ? "تم الاستعادة" : "Reset"); }}
                className="gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {isRtl ? "استعادة الافتراضي" : "Reset defaults"}
              </Button>
              <Button size="sm" onClick={() => saveAutoReply(autoReply)} className="gap-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isRtl ? "حفظ الإعدادات" : "Save settings"}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* ══ TAB: WORKING HOURS ══ */}
        <TabsContent value="hours" className="mt-0">
          <div className="max-w-2xl space-y-5">
            {/* Timezone */}
            <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{isRtl ? "المنطقة الزمنية" : "Timezone"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{wh.timezone}</p>
                </div>
                <Badge variant="outline" className="text-xs">{isRtl ? "القاهرة UTC+3" : "Cairo UTC+3"}</Badge>
              </div>
            </div>

            {/* Days grid */}
            <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b bg-muted/10">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <AlarmClock className="w-4 h-4 text-primary/70" />
                  {isRtl ? "جدول أوقات العمل" : "Working Hours Schedule"}
                </h3>
              </div>
              <div className="divide-y divide-border/40">
                {DAY_KEYS.map(day => {
                  const s = wh.days[day];
                  return (
                    <div key={day} className={`px-5 py-3.5 flex items-center gap-4 transition-colors ${s.enabled ? "" : "opacity-50"}`}>
                      <Switch
                        checked={s.enabled}
                        onCheckedChange={v => setWh(p => ({ ...p, days: { ...p.days, [day]: { ...s, enabled: v } } }))}
                        className="shrink-0"
                      />
                      <span className="w-24 text-sm font-medium shrink-0">{DAY_NAMES[day]?.[isRtl ? 0 : 1]}</span>
                      {s.enabled ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="time"
                            value={s.from}
                            onChange={e => setWh(p => ({ ...p, days: { ...p.days, [day]: { ...s, from: e.target.value } } }))}
                            className="h-8 rounded-md border border-border/60 bg-background px-2 text-sm text-center w-28 focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                          <span className="text-muted-foreground text-xs shrink-0">{isRtl ? "إلى" : "to"}</span>
                          <input
                            type="time"
                            value={s.to}
                            onChange={e => setWh(p => ({ ...p, days: { ...p.days, [day]: { ...s, to: e.target.value } } }))}
                            className="h-8 rounded-md border border-border/60 bg-background px-2 text-sm text-center w-28 focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                          <span className="text-xs text-muted-foreground ms-1 hidden sm:block">
                            ({Math.round((parseInt(s.to) - parseInt(s.from)) || 0)}{isRtl ? " ساعة" : "h"})
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">{isRtl ? "إجازة" : "Day off"}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Preview */}
            <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-primary/70" />
                {isRtl ? "ملخص أوقات العمل" : "Schedule Summary"}
              </h3>
              <div className="space-y-1.5">
                {DAY_KEYS.filter(d => wh.days[d].enabled).map(d => (
                  <div key={d} className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="font-medium w-20">{DAY_NAMES[d]?.[isRtl ? 0 : 1]}</span>
                    <span className="text-muted-foreground">{wh.days[d].from} – {wh.days[d].to}</span>
                  </div>
                ))}
                {DAY_KEYS.filter(d => !wh.days[d].enabled).length > 0 && (
                  <>
                    <Separator className="my-2" />
                    {DAY_KEYS.filter(d => !wh.days[d].enabled).map(d => (
                      <div key={d} className="flex items-center gap-2 text-xs opacity-50">
                        <Circle className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-medium w-20">{DAY_NAMES[d]?.[isRtl ? 0 : 1]}</span>
                        <span className="text-muted-foreground">{isRtl ? "إجازة" : "Closed"}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Save */}
            <div className="flex justify-end gap-3 pt-1">
              <Button
                variant="outline" size="sm"
                onClick={() => { setWh(DEFAULT_WORKING_HOURS); saveLS("chat_working_hours", DEFAULT_WORKING_HOURS); toast.info(isRtl ? "تم الاستعادة" : "Reset"); }}
                className="gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {isRtl ? "استعادة الافتراضي" : "Reset defaults"}
              </Button>
              <Button size="sm" onClick={() => saveWH(wh)} className="gap-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isRtl ? "حفظ الجدول" : "Save schedule"}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ══ Transfer Conversation Dialog ══ */}
      <Dialog open={showTransfer} onOpenChange={v => { setShowTransfer(v); if (!v) setTransferSearch(""); }}>
        <DialogContent className="max-w-sm" dir={dir}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ArrowRightLeft className="w-4 h-4 text-primary" />
              {isRtl ? "تحويل المحادثة" : "Transfer Conversation"}
            </DialogTitle>
          </DialogHeader>

          {/* Current assignment info */}
          {selectedThreadId && assignments[selectedThreadId] && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/8 border border-primary/15 text-xs">
              <UserRoundCog className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-muted-foreground">
                {isRtl ? "مُعيَّن حالياً إلى" : "Currently assigned to"}
              </span>
              <span className="font-semibold text-primary">{assignments[selectedThreadId].userName}</span>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute inset-y-0 inset-s-3 my-auto w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={transferSearch}
              onChange={e => setTransferSearch(e.target.value)}
              placeholder={isRtl ? "ابحث عن مستخدم…" : "Search users…"}
              className="ps-9 h-8 text-sm"
              dir={dir}
            />
          </div>

          {/* Team list */}
          <div className="max-h-72 overflow-y-auto rounded-xl border border-border/60 divide-y divide-border/30">
            {teamUsers.length === 0 && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                {isRtl ? "لا يوجد مستخدمون مضافون. أضف فريقك من صفحة المستخدمين." : "No team members added. Add your team from the Users page."}
              </div>
            )}
            {teamUsers
              .filter(u => !transferSearch || u.name.toLowerCase().includes(transferSearch.toLowerCase()) || u.email.toLowerCase().includes(transferSearch.toLowerCase()))
              .map(u => {
                const isAssigned = selectedThreadId ? assignments[selectedThreadId]?.userId === u.id : false;
                const isMe = u.email.toLowerCase() === (currentUser?.email ?? "").toLowerCase();
                return (
                  <button
                    key={u.id}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-start hover:bg-muted/40 transition-colors ${isAssigned ? "bg-primary/5" : ""}`}
                    onClick={() => handleTransfer(u)}
                  >
                    <Avatar className="w-8 h-8 border border-border shrink-0">
                      <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                        {u.name[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm truncate">{u.name}</span>
                        {isMe && <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{isRtl ? "أنت" : "You"}</span>}
                        {isAssigned && <Check className="w-3 h-3 text-primary shrink-0" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      u.role === "super_admin" ? "bg-purple-50 text-purple-700 border-purple-200"
                      : u.role === "admin"    ? "bg-blue-50 text-blue-700 border-blue-200"
                      : u.role === "lawyer"   ? "bg-primary/8 text-primary border-primary/20"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}>
                      {isRtl
                        ? { super_admin: "مشرف عام", admin: "مدير", lawyer: "محامٍ", support: "دعم" }[u.role] ?? u.role
                        : { super_admin: "Super Admin", admin: "Admin", lawyer: "Lawyer", support: "Support" }[u.role] ?? u.role
                      }
                    </span>
                  </button>
                );
              })
            }
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            {isRtl
              ? "سيظهر اسم المستخدم المُعيَّن على المحادثة في القائمة ويُرسَل باسمه"
              : "The assigned user's name will appear on the conversation and they will reply under their name"
            }
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
