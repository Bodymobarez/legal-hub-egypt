import { useState, useEffect } from "react";
import { MessageCircle, X, Send, MinusCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateChatThread, usePostChatMessage, useGetChatThread, useGetWorkHoursStatus } from "@workspace/api-client-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export default function ChatWidget() {
  const { language, t, isRtl } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  
  const [threadId, setThreadId] = useState<number | null>(() => {
    const saved = localStorage.getItem("chat-thread-id");
    return saved ? parseInt(saved, 10) : null;
  });

  const { data: workHours } = useGetWorkHoursStatus();
  const { data: threadData, refetch: refetchThread } = useGetChatThread(threadId as number, { query: { enabled: !!threadId && isOpen && !isMinimized,
      refetchInterval: 5000, queryKey: [] as const } as any });

  const createThread = useCreateChatThread();
  const postMessage = usePostChatMessage();

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;

    try {
      const res = await createThread.mutateAsync({
        data: {
          visitorName: name,
          language,
          initialMessage: message,
        }
      });
      
      // The backend creates the thread and the first message
      // Note: we'd ideally get the thread ID back from the response, assuming it returns it
      // Let's just assume we can fetch by thread ID. If the API returns the thread, set it.
      if (res && (res as any).id) {
        setThreadId((res as any).id);
        localStorage.setItem("chat-thread-id", (res as any).id.toString());
        setMessage("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !threadId) return;

    try {
      await postMessage.mutateAsync({ id: threadId,
        data: { content: message }
      });
      setMessage("");
      refetchThread();
    } catch (err) {
      console.error(err);
    }
  };

  // Determine if support is online
  const isSupportOnline = workHours?.isOpen;

  return (
    <div className={`fixed bottom-4 z-50 transition-all duration-300 ${isRtl ? 'left-4' : 'right-4'}`}>
      {!isOpen ? (
        <Button 
          size="icon" 
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl bg-primary hover:bg-primary/90"
          onClick={() => setIsOpen(true)}
        >
          <MessageCircle className="h-6 w-6 text-primary-foreground" />
        </Button>
      ) : (
        <div className={`flex flex-col bg-card border border-border rounded-xl shadow-2xl overflow-hidden transition-all duration-300 ${isMinimized ? 'h-14 w-72' : 'h-[450px] w-80 sm:w-96'}`}>
          {/* Header */}
          <div className="bg-primary text-primary-foreground p-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <span className="font-medium text-sm">
                Egypt Advocates Support
              </span>
              {!isMinimized && (
                <Badge variant={isSupportOnline ? "default" : "secondary"} className="text-[10px] ml-2 h-5 bg-accent text-accent-foreground border-none">
                  {isSupportOnline ? t("chat.supportOnline") : t("chat.supportOffline")}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20" onClick={() => setIsMinimized(!isMinimized)}>
                <MinusCircle className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Body */}
          {!isMinimized && (
            <>
              {!threadId ? (
                <div className="p-4 flex-1 flex flex-col justify-center">
                  <div className="text-center mb-6">
                    <h3 className="font-serif font-bold text-lg mb-2">Welcome</h3>
                    <p className="text-sm text-muted-foreground">Please enter your name to start chatting with our legal team.</p>
                  </div>
                  <form onSubmit={handleStart} className="space-y-4">
                    <div>
                      <Input
                        placeholder={t("chat.name")}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="bg-background"
                      />
                    </div>
                    <div>
                      <Input
                        placeholder={t("chat.typeMessage")}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                        className="bg-background"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={createThread.isPending}>
                      {t("chat.start")}
                    </Button>
                  </form>
                </div>
              ) : (
                <>
                  <ScrollArea className="flex-1 p-4 bg-muted/30">
                    <div className="space-y-4 flex flex-col">
                      {threadData?.messages?.map((msg, idx) => {
                        const isVisitor = msg.senderType === "visitor";
                        return (
                          <div 
                            key={msg.id || idx} 
                            className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                              isVisitor 
                                ? 'bg-primary text-primary-foreground self-end rounded-br-none' 
                                : 'bg-card border border-border text-foreground self-start rounded-bl-none'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            <span className={`text-[10px] block mt-1 opacity-70 ${isVisitor ? 'text-right' : 'text-left'}`}>
                              {new Date(msg.createdAt).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })}
                      {threadData?.messages?.length === 0 && (
                        <div className="text-center text-sm text-muted-foreground mt-4">
                          Connecting to support...
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  
                  <form onSubmit={handleSend} className="p-3 border-t border-border bg-card flex gap-2 shrink-0">
                    <Input
                      placeholder={t("chat.typeMessage")}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="flex-1 bg-background"
                    />
                    <Button type="submit" size="icon" disabled={!message.trim() || postMessage.isPending} className="shrink-0 bg-accent hover:bg-accent/90 text-accent-foreground">
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
