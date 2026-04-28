import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { 
  useListAdminChatThreads,
  useGetAdminChatThread,
  useAdminReplyChat,
  // useCloseChatThread if available
  ChatThreadStatus
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send, User, Bot, Headset, MoreVertical, Archive } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AdminChat() {
  const queryClient = useQueryClient();
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: threadsData, isLoading: isLoadingThreads } = useListAdminChatThreads(
    {
}, { query: { refetchInterval: 10000, queryKey: [] as const } as any });
  
  const { data: activeThreadData, isLoading: isLoadingThread } = useGetAdminChatThread(
    selectedThreadId || 0, { query: { enabled: !!selectedThreadId, refetchInterval: 5000, queryKey: [] as const } as any });

  const replyChat = useAdminReplyChat();

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeThreadData?.messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedThreadId) return;

    try {
      await replyChat.mutateAsync({ 
        id: selectedThreadId, 
        data: { content: replyText, agentName: "Support Team" } 
      });
      setReplyText("");
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case "open": return "bg-emerald-500";
      case "awaiting_support": return "bg-amber-500";
      case "closed": return "bg-gray-400";
      default: return "bg-gray-400";
    }
  };

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col sm:flex-row gap-6">
      {/* Threads List */}
      <Card className="w-full sm:w-1/3 flex flex-col border-border/50 overflow-hidden h-full">
        <CardHeader className="p-4 border-b bg-muted/20 shrink-0">
          <CardTitle className="text-lg">Conversations</CardTitle>
        </CardHeader>
        <ScrollArea className="flex-1">
          {isLoadingThreads ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
          ) : threadsData?.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No active chats</div>
          ) : (
            <div className="divide-y divide-border/50">
              {threadsData?.map(thread => (
                <div 
                  key={thread.id} 
                  className={`p-4 cursor-pointer hover:bg-accent/5 transition-colors relative ${selectedThreadId === thread.id ? 'bg-accent/10 border-l-2 border-primary' : ''}`}
                  onClick={() => setSelectedThreadId(thread.id)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(thread.status)}`} />
                      {thread.visitorName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(thread.lastMessageAt), "h:mm a")}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate pr-6">
                    {thread.language.toUpperCase()} • ID: {thread.id}
                  </div>
                  {thread.unreadByAdmin ? (
                    <Badge className="absolute right-4 bottom-4 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px]">
                      {thread.unreadByAdmin}
                    </Badge>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Active Thread */}
      <Card className="w-full sm:w-2/3 flex flex-col border-border/50 overflow-hidden h-full">
        {selectedThreadId && activeThreadData ? (
          <>
            <CardHeader className="p-4 border-b bg-muted/20 flex flex-row items-center justify-between shrink-0">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {activeThreadData.thread.visitorName}
                  <Badge variant="outline" className="text-[10px] uppercase ml-2">
                    {activeThreadData.thread.status.replace("_", " ")}
                  </Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Started {format(new Date(activeThreadData.thread.createdAt), "MMM d, yyyy")}
                </p>
              </div>
              <Button variant="ghost" size="icon">
                <Archive className="h-4 w-4" />
              </Button>
            </CardHeader>
            <ScrollArea className="flex-1 p-4 bg-background/50">
              <div className="space-y-4">
                {activeThreadData.messages.map((msg, idx) => {
                  const isVisitor = msg.senderType === "visitor";
                  return (
                    <div key={idx} className={`flex flex-col ${isVisitor ? "items-start" : "items-end"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {!isVisitor && <span className="text-xs text-muted-foreground">{msg.senderName}</span>}
                        {isVisitor && <span className="text-xs text-muted-foreground">{msg.senderName}</span>}
                      </div>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                        isVisitor 
                          ? "bg-card border border-border text-foreground rounded-tl-sm" 
                          : "bg-primary text-primary-foreground rounded-tr-sm"
                      }`}>
                        {msg.content}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1 mx-1">
                        {format(new Date(msg.createdAt), "h:mm a")}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            <div className="p-4 border-t bg-card shrink-0">
              <form onSubmit={handleSend} className="flex items-center gap-2">
                <Input 
                  value={replyText} 
                  onChange={(e) => setReplyText(e.target.value)} 
                  placeholder="Type your reply..." 
                  className="flex-1"
                  disabled={activeThreadData.thread.status === "closed"}
                />
                <Button type="submit" disabled={!replyText.trim() || replyChat.isPending || activeThreadData.thread.status === "closed"}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-4 bg-background/50">
            <Headset className="h-12 w-12 opacity-20" />
            <p>Select a conversation to start messaging</p>
          </div>
        )}
      </Card>
    </div>
  );
}
