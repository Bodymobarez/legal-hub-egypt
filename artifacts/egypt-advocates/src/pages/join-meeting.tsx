/**
 * Public join-meeting page — /join/:roomName
 * Embeds Jitsi Meet so the client can join without an admin account.
 */
import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { format } from "date-fns";
import { Shield, Video, Mic, MicOff, VideoOff, PhoneOff, MessageSquare,
         Send, Paperclip, Smile, Users, Copy, Clock, Hash, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const QUICK_EMOJIS = ["👍", "❤️", "😊", "👏", "🎉", "🤔", "⚖️", "✅"];

interface ChatMsg {
  id: string;
  sender: string;
  role: "client" | "system";
  content: string;
  type: "text" | "file" | "emoji";
  fileName?: string;
  fileUrl?: string;
  fileSize?: string;
  time: Date;
  reactions: Record<string, number>;
}

function ControlBtn({ icon: Icon, label, active = false, danger = false, onClick }: {
  icon: React.ComponentType<any>; label: string; active?: boolean; danger?: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 group">
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105 ${
        danger ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
        : active ? "bg-primary/20 text-primary hover:bg-primary/30"
        : "bg-white/8 text-white/60 hover:bg-white/15 hover:text-white"
      }`}>
        <Icon className="w-[18px] h-[18px]" />
      </div>
      <span className="text-[9px] text-white/25 group-hover:text-white/50">{label}</span>
    </button>
  );
}

export default function JoinMeeting() {
  const { roomName } = useParams<{ roomName: string }>();
  const [displayName, setDisplayName] = useState("");
  const [joined,    setJoined]   = useState(false);
  const [micOn,     setMicOn]    = useState(true);
  const [videoOn,   setVideoOn]  = useState(true);
  const [chatOpen,  setChatOpen] = useState(true);
  const [chatInput, setChatInput]= useState("");
  const [messages,  setMessages] = useState<ChatMsg[]>([
    { id: "s0", sender: "النظام", role: "system", content: "مرحباً بك في جلسة الاستشارة القانونية مع مكتب إيجيبت أدفوكيتس. سيتصل بك المستشار قريباً.", type: "text", time: new Date(), reactions: {} },
  ]);
  const [emojiFor, setEmojiFor] = useState<string | null>(null);
  const jitsiRef  = useRef<HTMLDivElement>(null);
  const apiRef    = useRef<any>(null);
  const fileRef   = useRef<HTMLInputElement>(null);
  const chatEndRef= useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  /* Load Jitsi when joined */
  useEffect(() => {
    if (!joined || !jitsiRef.current || apiRef.current) return;
    const init = () => {
      if (!(window as any).JitsiMeetExternalAPI || apiRef.current) return;
      const api = new (window as any).JitsiMeetExternalAPI("meet.jit.si", {
        roomName,
        parentNode: jitsiRef.current,
        width: "100%",
        height: "100%",
        configOverwrite: {
          startWithAudioMuted: !micOn,
          startWithVideoMuted: !videoOn,
          disableDeepLinking: true,
          toolbarButtons: [],
          hideConferenceSubject: true,
          subject: " ",
          enableWelcomePage: false,
          prejoinPageEnabled: false,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [],
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DEFAULT_BACKGROUND: "#0a0e1a",
        },
        userInfo: { displayName: displayName || "عميل" },
      });
      apiRef.current = api;
    };

    const existing = document.getElementById("jitsi-api");
    if (!existing) {
      const s = document.createElement("script");
      s.id = "jitsi-api";
      s.src = "https://meet.jit.si/external_api.js";
      s.onload = init;
      document.head.appendChild(s);
    } else { setTimeout(init, 100); }

    return () => { apiRef.current?.dispose(); apiRef.current = null; };
  }, [joined]);

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    setMessages(p => [...p, {
      id: Date.now().toString(), sender: displayName || "أنت",
      role: "client", content: chatInput.trim(), type: "text",
      time: new Date(), reactions: {},
    }]);
    setChatInput("");
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessages(p => [...p, {
      id: Date.now().toString(), sender: displayName || "أنت", role: "client",
      content: "", type: "file", fileName: file.name,
      fileUrl: URL.createObjectURL(file), fileSize: (file.size/1024).toFixed(1)+" KB",
      time: new Date(), reactions: {},
    }]);
    e.target.value = "";
    toast.success("تم إرسال الملف");
  };

  const addReaction = (msgId: string, emoji: string) => {
    setMessages(p => p.map(m => m.id === msgId
      ? { ...m, reactions: { ...m.reactions, [emoji]: (m.reactions[emoji]||0)+1 } }
      : m
    ));
    setEmojiFor(null);
  };

  /* ── Pre-join screen ── */
  if (!joined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="absolute inset-0 opacity-5" style={{backgroundImage:"radial-gradient(circle at 2px 2px,white 1px,transparent 0)",backgroundSize:"40px 40px"}} />

        <div className="relative w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
            </div>
            <h1 className="text-white font-serif text-2xl font-bold">Egypt Advocates</h1>
            <p className="text-white/40 text-sm mt-1">مكتب محاماة إيجيبت أدفوكيتس</p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center mx-auto mb-3">
                <Video className="w-8 h-8 text-primary/80" />
              </div>
              <h2 className="text-white text-lg font-semibold">{displayName ? `مرحباً، ${displayName}` : "استشارة قانونية"}</h2>
              <p className="text-white/40 text-xs mt-1">جلسة مشفرة وآمنة</p>
            </div>

            <div className="mb-5">
              <label className="text-white/50 text-xs block mb-2">اسمك (للمحادثة)</label>
              <Input
                dir="rtl"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && displayName && setJoined(true)}
                placeholder="أدخل اسمك…"
                className="h-11 bg-white/8 border-white/15 text-white placeholder:text-white/25 rounded-xl"
              />
            </div>

            <div className="flex gap-3 mb-6">
              <button
                onClick={() => setMicOn(p => !p)}
                className={`flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-xs font-medium border transition-colors ${micOn ? "bg-white/8 border-white/15 text-white/70" : "bg-red-500/15 border-red-500/30 text-red-400"}`}
              >
                {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                {micOn ? "الميكروفون مفعّل" : "الميكروفون معطّل"}
              </button>
              <button
                onClick={() => setVideoOn(p => !p)}
                className={`flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-xs font-medium border transition-colors ${videoOn ? "bg-white/8 border-white/15 text-white/70" : "bg-red-500/15 border-red-500/30 text-red-400"}`}
              >
                {videoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                {videoOn ? "الكاميرا مفعّلة" : "الكاميرا معطّلة"}
              </button>
            </div>

            <Button
              disabled={!displayName.trim()}
              className="w-full h-12 rounded-2xl text-base gap-3 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
              onClick={() => setJoined(true)}
            >
              <Video className="w-5 h-5" />
              دخول الاجتماع
            </Button>

            <div className="flex items-center justify-center gap-2 mt-4 text-white/25 text-xs">
              <Shield className="w-3 h-3" />
              الجلسة مشفرة بالكامل
            </div>

            {/* Room ID badge */}
            <div className="mt-4 flex items-center gap-2 p-2.5 rounded-xl bg-white/4 border border-white/8">
              <Hash className="w-3 h-3 text-white/30 shrink-0" />
              <span className="text-white/30 text-[10px] font-mono truncate flex-1">{roomName?.slice(0, 36)}…</span>
            </div>
          </div>

          <div className="text-center mt-4 text-white/20 text-xs">
            © {new Date().getFullYear()} Egypt Advocates Law Firm
          </div>
        </div>
      </div>
    );
  }

  /* ── Meeting room ── */
  return (
    <div dir="rtl" className="fixed inset-0 z-50 flex flex-col bg-[#0a0e1a] overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 bg-[#0d1220] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-white/80 text-sm font-serif">استشارة قانونية — Egypt Advocates</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-white/40 border-white/15 text-[10px]">
            {displayName}
          </Badge>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex min-h-0">
        {/* Video */}
        <div className="flex-1 relative min-w-0">
          <div ref={jitsiRef} className="w-full h-full" />
        </div>

        {/* Chat */}
        {chatOpen && (
          <div className="w-[300px] shrink-0 border-s border-white/8 flex flex-col bg-[#0d1220]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 shrink-0">
              <span className="text-white/70 text-xs font-semibold flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5" />شات الجلسة
              </span>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="p-3 space-y-3">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex flex-col ${msg.role === "client" ? "items-end" : "items-start"}`}>
                    <span className="text-[9px] text-white/30 mb-1 px-1">{msg.sender}</span>
                    <div className="relative group max-w-[85%]">
                      {msg.type === "text" && (
                        <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed wrap-break-word ${
                          msg.role === "system" ? "bg-primary/10 border border-primary/20 text-primary/80 text-xs"
                          : msg.role === "client" ? "bg-primary text-white rounded-se-sm"
                          : "bg-white/10 text-white/90 rounded-ss-sm"
                        }`} dir="rtl">
                          {msg.content}
                        </div>
                      )}
                      {msg.type === "emoji" && (
                        <div className="text-3xl">{msg.content}</div>
                      )}
                      {msg.type === "file" && (
                        <a href={msg.fileUrl} download={msg.fileName}
                           className="flex items-center gap-3 rounded-2xl px-3.5 py-3 bg-white/10 border border-white/15 hover:bg-white/15 transition-colors">
                          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                            <Paperclip className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-white/90 text-xs font-medium truncate">{msg.fileName}</p>
                            <p className="text-white/40 text-[10px]">{msg.fileSize}</p>
                          </div>
                        </a>
                      )}

                      {/* Reactions */}
                      {Object.keys(msg.reactions).length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {Object.entries(msg.reactions).map(([e, n]) => (
                            <span key={e} className="text-xs bg-white/10 rounded-full px-1.5 py-0.5">{e} <span className="text-white/40">{n}</span></span>
                          ))}
                        </div>
                      )}

                      {/* Hover react */}
                      {msg.type !== "emoji" && msg.role !== "system" && (
                        <div className={`absolute top-0 ${msg.role === "client" ? "-inset-s-8" : "-inset-e-8"} opacity-0 group-hover:opacity-100 transition-opacity`}>
                          <button
                            onClick={() => setEmojiFor(emojiFor === msg.id ? null : msg.id)}
                            className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center"
                          >
                            <Smile className="w-3 h-3 text-white/50" />
                          </button>
                        </div>
                      )}

                      {emojiFor === msg.id && (
                        <div className={`absolute top-0 ${msg.role === "client" ? "end-full me-2" : "start-full ms-2"} flex gap-1 bg-[#1a2235]/95 border border-white/10 rounded-xl px-2 py-1.5 z-30`}>
                          {QUICK_EMOJIS.map(e => (
                            <button key={e} onClick={() => addReaction(msg.id, e)} className="text-lg hover:scale-125 transition-transform">{e}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-white/20 mt-1 px-1">{format(msg.time, "h:mm a")}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-3 border-t border-white/8 shrink-0 space-y-2">
              <div className="flex gap-1.5">
                {QUICK_EMOJIS.slice(0, 6).map(e => (
                  <button key={e} onClick={() => setMessages(p => [...p, { id: Date.now().toString(), sender: displayName||"أنت", role:"client", content:e, type:"emoji", time:new Date(), reactions:{} }])} className="text-lg hover:scale-110 transition-transform">{e}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
                <button onClick={() => fileRef.current?.click()} className="w-8 h-8 rounded-xl bg-white/8 hover:bg-white/15 flex items-center justify-center text-white/50 hover:text-white shrink-0">
                  <Paperclip className="w-4 h-4" />
                </button>
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key==="Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
                  placeholder="اكتب رسالة…"
                  dir="rtl"
                  className="flex-1 h-8 rounded-xl bg-white/8 border-0 text-white/90 text-sm px-3 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
                <button onClick={sendMessage} className="w-8 h-8 rounded-xl bg-primary hover:bg-primary/80 flex items-center justify-center text-white shrink-0">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-white/8 bg-[#0d1220]/95 backdrop-blur-md shrink-0">
        <div className="flex gap-2">
          <ControlBtn icon={micOn ? Mic : MicOff} label={micOn ? "كتم" : "رفع الصوت"} danger={!micOn} onClick={() => setMicOn(p=>!p)} />
          <ControlBtn icon={videoOn ? Video : VideoOff} label={videoOn ? "إيقاف" : "تشغيل"} danger={!videoOn} onClick={() => setVideoOn(p=>!p)} />
        </div>

        <button
          onClick={() => { apiRef.current?.executeCommand("hangup"); window.close(); setJoined(false); }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-14 h-14 rounded-2xl bg-red-500 hover:bg-red-400 flex items-center justify-center transition-all shadow-lg shadow-red-500/30 hover:scale-105">
            <PhoneOff className="w-6 h-6 text-white" />
          </div>
          <span className="text-[9px] text-white/30">مغادرة</span>
        </button>

        <div className="flex gap-2">
          <ControlBtn icon={MessageSquare} label="الشات" active={chatOpen} onClick={() => setChatOpen(p=>!p)} />
        </div>
      </div>
    </div>
  );
}
