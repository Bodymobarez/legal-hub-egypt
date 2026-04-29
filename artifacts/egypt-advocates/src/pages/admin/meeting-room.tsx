import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { format } from "date-fns";
import { useGetAdminAppointment } from "@workspace/api-client-react";
import { useAdminI18n } from "@/lib/admin-i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  PhoneOff, MessageSquare, Users, Settings, Hand,
  Smile, Paperclip, Send, Copy, ExternalLink, ArrowLeft,
  Volume2, VolumeX, LayoutGrid, Maximize2, Minimize2,
  Shield, Clock, Circle, Hash,
} from "lucide-react";

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */
interface ChatMsg {
  id: string;
  sender: string;
  senderRole: "admin" | "client";
  content: string;
  type: "text" | "file" | "emoji";
  fileName?: string;
  fileUrl?: string;
  fileSize?: string;
  timestamp: Date;
  reactions: Record<string, number>;
}

interface Reaction {
  emoji: string;
  x: number;
  y: number;
  id: string;
}

const EMOJIS = ["👍", "❤️", "😊", "👏", "🎉", "🤔", "✅", "⚖️", "📋", "🔖"];

const QUICK_EMOJIS = ["👍", "❤️", "😊", "👏", "🎉", "🤔", "⚖️", "✅"];

/* derive a consistent Jitsi room name from appointment id */
function getRoomName(apptId: number) {
  return `egypt-advocates-consultation-${apptId}-${btoa(String(apptId + 7919)).replace(/=/g, "")}`;
}

function getJoinUrl(apptId: number) {
  return `${window.location.origin}/join/${getRoomName(apptId)}`;
}

/* ═══════════════════════════════════════════
   Jitsi loader hook
   ═══════════════════════════════════════════ */
function useJitsi(containerRef: React.RefObject<HTMLDivElement>, roomName: string, displayName: string, enabled: boolean) {
  const apiRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled || !containerRef.current || apiRef.current) return;

    const scriptId = "jitsi-api";
    const existing = document.getElementById(scriptId);

    const init = () => {
      if (!(window as any).JitsiMeetExternalAPI) return;
      if (apiRef.current) return;

      const domain = "meet.jit.si";
      const api = new (window as any).JitsiMeetExternalAPI(domain, {
        roomName,
        parentNode: containerRef.current,
        width: "100%",
        height: "100%",
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableDeepLinking: true,
          toolbarButtons: [],          // hide default toolbar — we use our own
          hideConferenceSubject: true,
          subject: " ",
          enableWelcomePage: false,
          prejoinPageEnabled: false,
          startAudioOnly: false,
          disableInviteFunctions: true,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [],
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          BRAND_WATERMARK_LINK: "",
          DEFAULT_BACKGROUND: "#0f172a",
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
        },
        userInfo: { displayName },
      });

      api.addEventListener("videoConferenceJoined", () => setReady(true));
      apiRef.current = api;
    };

    if (!existing) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://meet.jit.si/external_api.js";
      script.onload = init;
      document.head.appendChild(script);
    } else {
      // script already loaded
      setTimeout(init, 100);
    }

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, [enabled, roomName]);

  const toggleAudio  = () => apiRef.current?.executeCommand("toggleAudio");
  const toggleVideo  = () => apiRef.current?.executeCommand("toggleVideo");
  const toggleScreen = () => apiRef.current?.executeCommand("toggleShareScreen");
  const hangUp       = () => apiRef.current?.executeCommand("hangup");
  const sendReaction = (r: string) => apiRef.current?.executeCommand("sendEndpointTextMessage", "", r);

  return { ready, toggleAudio, toggleVideo, toggleScreen, hangUp };
}

/* ═══════════════════════════════════════════
   Main meeting room
   ═══════════════════════════════════════════ */
export default function AdminMeetingRoom() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const apptId = Number(id);
  const { isRtl } = useAdminI18n();
  const dir = isRtl ? "rtl" : "ltr";

  /* ── Meeting state ── */
  const [joined,     setJoined]    = useState(false);
  const [micOn,      setMicOn]     = useState(true);
  const [videoOn,    setVideoOn]   = useState(true);
  const [screenOn,   setScreenOn]  = useState(false);
  const [handRaised, setHandRaised]= useState(false);
  const [fullscreen, setFullscreen]= useState(false);
  const [sidePanel,  setSidePanel] = useState<"chat" | "people" | null>("chat");
  const [showEmojis, setShowEmojis]= useState(false);
  const [reactions,  setReactions] = useState<Reaction[]>([]);

  /* ── Chat state ── */
  const [chatInput,  setChatInput]  = useState("");
  const [messages,   setMessages]   = useState<ChatMsg[]>([
    { id: "sys-1", sender: "النظام", senderRole: "admin", content: "تم بدء جلسة الاستشارة القانونية. مرحباً بكم.", type: "text", timestamp: new Date(), reactions: {} },
  ]);
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null);
  const fileRef  = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const jitsiRef = useRef<HTMLDivElement>(null);

  const { data: appt } = useGetAdminAppointment(apptId, { query: { queryKey: [] as const } as any });
  const roomName = getRoomName(apptId);
  const joinUrl  = getJoinUrl(apptId);

  const { ready, toggleAudio, toggleVideo, toggleScreen, hangUp } = useJitsi(
    jitsiRef as any, roomName, "مستشار قانوني – Egypt Advocates", joined
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Floating reactions ── */
  const triggerReaction = useCallback((emoji: string) => {
    const rid = Math.random().toString(36).slice(2);
    const x = 20 + Math.random() * 60;
    setReactions(p => [...p, { emoji, x, y: 80, id: rid }]);
    setTimeout(() => setReactions(p => p.filter(r => r.id !== rid)), 3000);
    setShowEmojis(false);
  }, []);

  /* ── Send chat message ── */
  const sendMessage = () => {
    if (!chatInput.trim()) return;
    const msg: ChatMsg = {
      id: Date.now().toString(),
      sender: "أنت (المستشار)",
      senderRole: "admin",
      content: chatInput.trim(),
      type: "text",
      timestamp: new Date(),
      reactions: {},
    };
    setMessages(p => [...p, msg]);
    setChatInput("");
  };

  /* ── File attach ── */
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const msg: ChatMsg = {
      id: Date.now().toString(),
      sender: "أنت (المستشار)",
      senderRole: "admin",
      content: "",
      type: "file",
      fileName: file.name,
      fileUrl: URL.createObjectURL(file),
      fileSize: (file.size / 1024).toFixed(1) + " KB",
      timestamp: new Date(),
      reactions: {},
    };
    setMessages(p => [...p, msg]);
    e.target.value = "";
    toast.success(isRtl ? "تم إرسال الملف" : "File sent");
  };

  /* ── Add reaction to message ── */
  const addMsgReaction = (msgId: string, emoji: string) => {
    setMessages(p => p.map(m => m.id === msgId
      ? { ...m, reactions: { ...m.reactions, [emoji]: (m.reactions[emoji] || 0) + 1 } }
      : m
    ));
    setEmojiPickerFor(null);
  };

  /* ── Copy join link ── */
  const copyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    toast.success(isRtl ? "تم نسخ الرابط" : "Link copied!");
  };

  /* ══════════════════════════════════════════
     PRE-JOIN SCREEN
     ══════════════════════════════════════════ */
  if (!joined) {
    return (
      <div dir={dir} className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5" style={{backgroundImage:"radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "40px 40px"}} />

        <div className="relative w-full max-w-md">
          {/* Logo + back */}
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => setLocation("/admin/appointments")} className="text-white/60 hover:text-white flex items-center gap-2 text-sm transition-colors">
              <ArrowLeft className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} />
              {isRtl ? "العودة" : "Back"}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/80 flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-white/80 text-sm font-serif">Egypt Advocates</span>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            {/* Appointment info */}
            {appt && (
              <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-sm uppercase">
                    {appt.clientName?.[0] ?? "?"}
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{appt.clientName}</p>
                    <p className="text-white/50 text-xs">{appt.clientEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-white/60 text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  {format(new Date(appt.scheduledAt), "d MMM yyyy · h:mm a")}
                  <span className="mx-1">·</span>
                  {appt.durationMinutes} {isRtl ? "دقيقة" : "min"}
                </div>
                {appt.serviceNameAr && (
                  <p className="text-primary/70 text-xs mt-1.5">{isRtl ? appt.serviceNameAr : appt.serviceNameEn}</p>
                )}
              </div>
            )}

            <h1 className="text-2xl font-serif font-bold text-white mb-1 text-center">
              {isRtl ? "قاعة الاستشارة" : "Consultation Room"}
            </h1>
            <p className="text-white/50 text-sm text-center mb-6">
              {isRtl ? "جلسة استشارة قانونية مشفرة" : "Encrypted legal consultation session"}
            </p>

            {/* Room ID */}
            <div className="flex items-center gap-2 mb-6 p-3 rounded-xl bg-white/5 border border-white/10">
              <Hash className="w-3.5 h-3.5 text-white/40 shrink-0" />
              <span className="text-white/50 text-xs font-mono truncate flex-1">{roomName.slice(0, 32)}…</span>
              <button onClick={copyLink} className="text-primary/70 hover:text-primary transition-colors">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Share link */}
            <div className="mb-6 space-y-2">
              <p className="text-white/60 text-xs">{isRtl ? "رابط دخول العميل:" : "Client join link:"}</p>
              <div className="flex gap-2">
                <Input
                  readOnly value={joinUrl}
                  dir="ltr"
                  className="h-9 text-xs bg-white/5 border-white/10 text-white/70 font-mono"
                />
                <Button size="sm" variant="outline" className="h-9 shrink-0 border-white/20 text-white/70 hover:bg-white/10 gap-1.5" onClick={copyLink}>
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Join button */}
            <Button
              className="w-full h-12 text-base rounded-2xl gap-3 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
              onClick={() => setJoined(true)}
            >
              <Video className="w-5 h-5" />
              {isRtl ? "الدخول إلى القاعة" : "Enter Meeting Room"}
            </Button>

            <div className="flex items-center justify-center gap-2 mt-4 text-white/30 text-xs">
              <Shield className="w-3 h-3" />
              {isRtl ? "الجلسة مشفرة ومحمية" : "Session is encrypted & secured"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════
     MEETING ROOM
     ══════════════════════════════════════════ */
  return (
    <div
      dir={dir}
      className="fixed inset-0 z-50 flex flex-col bg-[#0a0e1a] overflow-hidden"
    >
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 bg-[#0d1220] shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-white/80 text-sm font-medium">{isRtl ? "قاعة الاستشارة القانونية" : "Legal Consultation Room"}</span>
          </div>
          {appt && (
            <Badge variant="outline" className="text-white/50 border-white/15 text-[10px] font-mono hidden sm:flex">
              {appt.clientName}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {appt && (
            <div className="flex items-center gap-1.5 text-white/40 text-xs">
              <Clock className="w-3 h-3" />
              <span>{format(new Date(appt.scheduledAt), "h:mm a")}</span>
            </div>
          )}
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 text-white/40 hover:text-white"
            onClick={() => setFullscreen(p => !p)}
          >
            {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* ── Main area ── */}
      <div className="flex-1 flex min-h-0">

        {/* Jitsi video area */}
        <div className="flex-1 relative min-w-0">
          <div ref={jitsiRef} className="w-full h-full" />

          {/* Loading overlay before Jitsi is ready */}
          {!ready && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0e1a] gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-2 border-primary/30 flex items-center justify-center">
                  <Video className="w-8 h-8 text-primary/50" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-t-primary border-transparent animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-white/70 text-sm font-medium">{isRtl ? "جارٍ الاتصال بالقاعة…" : "Connecting to room…"}</p>
                <p className="text-white/30 text-xs mt-1">{roomName.slice(0, 40)}</p>
              </div>
            </div>
          )}

          {/* Floating emoji reactions */}
          {reactions.map(r => (
            <div
              key={r.id}
              className="absolute pointer-events-none text-4xl"
              style={{ left: `${r.x}%`, bottom: "80px", animation: "float-up 3s ease-out forwards" }}
            >
              {r.emoji}
            </div>
          ))}

          {/* Reaction picker overlay */}
          {showEmojis && (
            <div className="absolute bottom-20 inset-s-1/2 -translate-x-1/2 flex gap-2 bg-[#1a2235]/95 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 z-20 shadow-2xl">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => triggerReaction(e)}
                  className="text-2xl hover:scale-125 transition-transform"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Side panel */}
        {sidePanel && (
          <div className="w-[320px] shrink-0 border-s border-white/8 flex flex-col bg-[#0d1220]">
            {/* Panel tabs */}
            <div className="flex border-b border-white/8 shrink-0">
              {([
                { id: "chat",   label: isRtl ? "الشات" : "Chat",    icon: MessageSquare },
                { id: "people", label: isRtl ? "المشاركون" : "People", icon: Users },
              ] as const).map(({ id: pid, label, icon: Icon }) => (
                <button
                  key={pid}
                  onClick={() => setSidePanel(pid)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition-colors ${sidePanel === pid ? "text-primary border-b-2 border-primary" : "text-white/40 hover:text-white/70"}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Chat panel */}
            {sidePanel === "chat" && (
              <>
                <ScrollArea className="flex-1 min-h-0">
                  <div className="p-3 space-y-3">
                    {messages.map(msg => (
                      <div key={msg.id} className={`flex flex-col ${msg.senderRole === "admin" ? "items-end" : "items-start"}`}>
                        <span className="text-[9px] text-white/30 mb-1 px-1">{msg.sender}</span>

                        <div className="relative group max-w-[85%]">
                          {/* Message bubble */}
                          {msg.type === "text" && (
                            <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed wrap-break-word ${
                              msg.senderRole === "admin"
                                ? "bg-primary text-white rounded-se-sm"
                                : "bg-white/10 text-white/90 rounded-ss-sm"
                            }`} dir="rtl">
                              {msg.content}
                            </div>
                          )}
                          {msg.type === "file" && (
                            <a
                              href={msg.fileUrl}
                              download={msg.fileName}
                              className="flex items-center gap-3 rounded-2xl px-3.5 py-3 bg-white/10 border border-white/15 hover:bg-white/15 transition-colors"
                            >
                              <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                                <Paperclip className="w-4 h-4 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-white/90 text-xs font-medium truncate">{msg.fileName}</p>
                                <p className="text-white/40 text-[10px]">{msg.fileSize}</p>
                              </div>
                            </a>
                          )}

                          {/* Reactions on message */}
                          {Object.keys(msg.reactions).length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {Object.entries(msg.reactions).map(([emoji, count]) => (
                                <span key={emoji} className="text-xs bg-white/10 rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
                                  {emoji}<span className="text-white/50 text-[9px]">{count}</span>
                                </span>
                              ))}
                            </div>
                          )}

                          {/* React button (hover) */}
                          {msg.type !== "emoji" && (
                            <div className={`absolute top-0 ${msg.senderRole === "admin" ? "-inset-s-8" : "-inset-e-8"} opacity-0 group-hover:opacity-100 transition-opacity`}>
                              <button
                                onClick={() => setEmojiPickerFor(emojiPickerFor === msg.id ? null : msg.id)}
                                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                              >
                                <Smile className="w-3 h-3 text-white/60" />
                              </button>
                            </div>
                          )}

                          {/* Emoji picker for this message */}
                          {emojiPickerFor === msg.id && (
                            <div className={`absolute top-0 ${msg.senderRole === "admin" ? "end-full me-2" : "start-full ms-2"} flex gap-1 bg-[#1a2235]/95 border border-white/10 rounded-xl px-2 py-1.5 z-30 shadow-xl`}>
                              {QUICK_EMOJIS.map(e => (
                                <button key={e} onClick={() => addMsgReaction(msg.id, e)} className="text-lg hover:scale-125 transition-transform">
                                  {e}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <span className="text-[9px] text-white/20 mt-1 px-1">
                          {format(msg.timestamp, "h:mm a")}
                        </span>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>

                {/* Chat input */}
                <div className="p-3 border-t border-white/8 shrink-0 space-y-2">
                  {/* Quick emojis */}
                  <div className="flex gap-1.5">
                    {QUICK_EMOJIS.slice(0, 6).map(e => (
                      <button
                        key={e}
                        onClick={() => {
                          const msg: ChatMsg = {
                            id: Date.now().toString(),
                            sender: "أنت",
                            senderRole: "admin",
                            content: e,
                            type: "emoji",
                            timestamp: new Date(),
                            reactions: {},
                          };
                          setMessages(p => [...p, msg]);
                        }}
                        className="text-lg hover:scale-110 transition-transform"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                  <Separator className="bg-white/8" />
                  <div className="flex gap-2">
                    <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="shrink-0 w-8 h-8 rounded-xl bg-white/8 hover:bg-white/15 flex items-center justify-center text-white/50 hover:text-white transition-colors"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <input
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
                      placeholder={isRtl ? "اكتب رسالة…" : "Type a message…"}
                      dir="rtl"
                      className="flex-1 h-8 rounded-xl bg-white/8 border-0 text-white/90 text-sm px-3 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                    <button
                      onClick={sendMessage}
                      className="shrink-0 w-8 h-8 rounded-xl bg-primary hover:bg-primary/80 flex items-center justify-center text-white transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* People panel */}
            {sidePanel === "people" && (
              <div className="flex-1 p-4 space-y-3">
                {[
                  { name: "أنت (المستشار)", role: isRtl ? "مضيف" : "Host", active: true, color: "bg-primary" },
                  ...(appt ? [{ name: appt.clientName, role: isRtl ? "عميل" : "Client", active: false, color: "bg-blue-500" }] : []),
                ].map((p, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/8">
                    <div className={`w-9 h-9 rounded-full ${p.color}/20 border border-white/10 flex items-center justify-center font-bold text-sm uppercase text-white`}>
                      {p.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/90 text-sm font-medium truncate">{p.name}</p>
                      <p className="text-white/40 text-xs">{p.role}</p>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${p.active ? "bg-emerald-500" : "bg-white/20"}`} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Control bar ── */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-white/8 bg-[#0d1220]/95 backdrop-blur-md shrink-0">

        {/* Left controls */}
        <div className="flex items-center gap-2">
          <ControlBtn
            active={!micOn}
            danger={!micOn}
            icon={micOn ? Mic : MicOff}
            label={micOn ? (isRtl ? "كتم" : "Mute") : (isRtl ? "رفع الصوت" : "Unmute")}
            onClick={() => { setMicOn(p => !p); toggleAudio(); }}
          />
          <ControlBtn
            active={!videoOn}
            danger={!videoOn}
            icon={videoOn ? Video : VideoOff}
            label={videoOn ? (isRtl ? "إيقاف الكاميرا" : "Stop video") : (isRtl ? "تشغيل الكاميرا" : "Start video")}
            onClick={() => { setVideoOn(p => !p); toggleVideo(); }}
          />
          <ControlBtn
            active={screenOn}
            icon={screenOn ? Monitor : MonitorOff}
            label={isRtl ? "مشاركة الشاشة" : "Share screen"}
            onClick={() => { setScreenOn(p => !p); toggleScreen(); }}
          />
        </div>

        {/* Center */}
        <div className="flex items-center gap-3">
          <ControlBtn
            icon={Hand}
            active={handRaised}
            label={isRtl ? "رفع اليد" : "Raise hand"}
            onClick={() => setHandRaised(p => !p)}
          />
          <div className="relative">
            <ControlBtn
              icon={Smile}
              label={isRtl ? "تفاعل" : "React"}
              onClick={() => setShowEmojis(p => !p)}
            />
          </div>

          {/* End call */}
          <button
            onClick={() => { hangUp(); setJoined(false); setLocation("/admin/appointments"); }}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-red-500 hover:bg-red-400 flex items-center justify-center transition-all shadow-lg shadow-red-500/30 group-hover:scale-105">
              <PhoneOff className="w-5 h-5 text-white" />
            </div>
            <span className="text-[9px] text-white/30 group-hover:text-white/60 transition-colors">{isRtl ? "إنهاء" : "End"}</span>
          </button>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <ControlBtn
            icon={MessageSquare}
            active={sidePanel === "chat"}
            label={isRtl ? "الشات" : "Chat"}
            badge={messages.length > 1 ? String(messages.length - 1) : undefined}
            onClick={() => setSidePanel(p => p === "chat" ? null : "chat")}
          />
          <ControlBtn
            icon={Users}
            active={sidePanel === "people"}
            label={isRtl ? "المشاركون" : "People"}
            onClick={() => setSidePanel(p => p === "people" ? null : "people")}
          />
          <ControlBtn
            icon={LayoutGrid}
            label={isRtl ? "تخطيط" : "Layout"}
            onClick={() => {}}
          />
        </div>
      </div>

      {/* Float-up animation */}
      <style>{`
        @keyframes float-up {
          0%   { transform: translateY(0) scale(1);   opacity: 1; }
          100% { transform: translateY(-200px) scale(1.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ── Control button component ── */
function ControlBtn({
  icon: Icon, label, active = false, danger = false,
  onClick, badge,
}: {
  icon: React.ComponentType<any>;
  label: string;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 group relative">
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105 ${
        danger  ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
        : active ? "bg-primary/20 text-primary hover:bg-primary/30"
        : "bg-white/8 text-white/60 hover:bg-white/15 hover:text-white"
      }`}>
        <Icon className="w-[18px] h-[18px]" />
      </div>
      {badge && (
        <span className="absolute -top-1 -inset-e-1 w-4 h-4 bg-primary rounded-full text-[8px] text-white flex items-center justify-center font-bold">
          {badge}
        </span>
      )}
      <span className="text-[9px] text-white/25 group-hover:text-white/50 transition-colors leading-none">{label}</span>
    </button>
  );
}
