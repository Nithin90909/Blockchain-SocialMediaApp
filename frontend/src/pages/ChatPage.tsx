import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Send, ArrowLeft, Search } from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { ScrollArea } from "../components/ui/scroll-area";
import { Separator } from "../components/ui/separator";
import { messageAPI, userAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { formatDate } from "../lib/utils";

export default function ChatPage() {
  const { partnerId } = useParams<{ partnerId: string }>();
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [partnerInfo, setPartnerInfo] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await messageAPI.getConversationList();
      setConversations(res.data.conversations || []);
    } catch {}
    setLoadingConvos(false);
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!partnerId) {
      setMessages([]);
      setPartnerInfo(null);
      return;
    }

    setLoadingMessages(true);

    Promise.all([
      messageAPI.getConversation(partnerId),
      userAPI.getProfile(partnerId),
    ]).then(([msgRes, profileRes]) => {
      setMessages(msgRes.data.messages || []);
      setPartnerInfo(profileRes.data.user);
    }).catch((err) => {
      console.error("Chat load error:", err);
    }).finally(() => setLoadingMessages(false));
  }, [partnerId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    function handleNewMessage(msg: any) {
      const msgSender = msg.senderId?.toString();
      const msgReceiver = msg.receiverId?.toString();
      const currentPartner = partnerId;
      const me = user?.id;

      if (
        (msgSender === currentPartner && msgReceiver === me) ||
        (msgSender === me && msgReceiver === currentPartner)
      ) {
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === msg.id || m._id === msg._id);
          if (exists) return prev;
          return [...prev, msg];
        });
      }

      fetchConversations();
    }

    function handleTyping(data: any) {
      if (data.userId === partnerId) {
        setPartnerTyping(true);
      }
    }

    function handleStopTyping(data: any) {
      if (data.userId === partnerId) {
        setPartnerTyping(false);
      }
    }

    socket.on("new-message", handleNewMessage);
    socket.on("message-sent", handleNewMessage);
    socket.on("user-typing", handleTyping);
    socket.on("user-stop-typing", handleStopTyping);

    if (partnerId) {
      socket.emit("mark-read", { senderId: partnerId });
    }

    return () => {
      socket.off("new-message", handleNewMessage);
      socket.off("message-sent", handleNewMessage);
      socket.off("user-typing", handleTyping);
      socket.off("user-stop-typing", handleStopTyping);
    };
  }, [socket, partnerId, user?.id, fetchConversations]);

  function emitTyping() {
    if (!socket || !partnerId) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit("typing", { receiverId: partnerId });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit("stop-typing", { receiverId: partnerId });
    }, 2000);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !partnerId || sending) return;

    setSending(true);
    const msgText = text;
    setText("");

    if (socket) {
      socket.emit("send-message", { receiverId: partnerId, text: msgText });
      socket.emit("stop-typing", { receiverId: partnerId });
      isTypingRef.current = false;
    } else {
      try {
        await messageAPI.send(partnerId, msgText);
        const res = await messageAPI.getConversation(partnerId);
        setMessages(res.data.messages || []);
      } catch {
        setText(msgText);
      }
    }

    setSending(false);
  }

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await userAPI.search(searchQuery);
        setSearchResults(res.data.users?.filter((u: any) => (u._id || u.id) !== user?.id) || []);
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, user?.id]);

  if (!partnerId) {
    return (
      <div className="pb-20 lg:pb-6 space-y-4">
        <h2 className="text-lg font-semibold">Messages</h2>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users to start a conversation..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-md border bg-card shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map((u) => {
                const uid = u._id || u.id;
                return (
                  <button
                    key={uid}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-secondary/50"
                    onClick={() => {
                      navigate(`/chat/${uid}`);
                      setSearchQuery("");
                      setSearchResults([]);
                    }}
                  >
                    <Avatar className="h-8 w-8">
                      {u.avatar && <AvatarImage src={u.avatar} />}
                      <AvatarFallback className="text-xs">{u.username?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{u.username}</p>
                      <p className="text-xs text-muted-foreground">{u.bio || "No bio"}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {loadingConvos ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : conversations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No conversations yet. Search for a user above to start chatting.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1">
            {conversations.map((conv) => {
              const partner = conv.partner;
              const pid = partner?._id || partner?.id;
              return (
                <Link
                  key={pid}
                  to={`/chat/${pid}`}
                  className="flex items-center gap-3 rounded-md border p-3 hover:bg-secondary/50 transition-colors"
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      {partner?.avatar && <AvatarImage src={partner.avatar} />}
                      <AvatarFallback className="text-sm">
                        {(partner?.username || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {partner?.isOnline && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{partner?.username || "User"}</p>
                      <span className="text-xs text-muted-foreground">{formatDate(conv.lastMessageAt)}</span>
                    </div>
                    {!partner?.isOnline && partner?.lastSeen && (
                      <p className="text-xs text-muted-foreground">Last seen {formatDate(partner.lastSeen)}</p>
                    )}
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
                      {conv.unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const partnerName = partnerInfo?.username || "User";

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col pb-20 lg:pb-0">
      <div className="flex items-center gap-3 pb-4">
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
          <Link to="/chat"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <Link to={`/profile/${partnerId}`} className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            {partnerInfo?.avatar && <AvatarImage src={partnerInfo.avatar} />}
            <AvatarFallback className="text-xs">{partnerName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{partnerName}</p>
            {partnerTyping ? (
              <p className="text-xs text-green-500">typing...</p>
            ) : partnerInfo?.isOnline ? (
              <p className="text-xs text-green-500">online</p>
            ) : partnerInfo?.lastSeen ? (
              <p className="text-xs text-muted-foreground">last seen {formatDate(partnerInfo.lastSeen)}</p>
            ) : null}
          </div>
        </Link>
      </div>

      <Separator />

      {loadingMessages ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <ScrollArea className="flex-1 py-4">
          <div className="space-y-3">
            {messages.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                No messages yet. Send the first one.
              </p>
            )}
            {messages.map((msg, i) => {
              const msgSenderId = msg.senderId?.toString();
              const isMine = msgSenderId === user?.id;
              return (
                <div key={msg.id || msg._id || i} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                      isMine
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    <p className="break-words">{msg.text}</p>
                    <p className={`mt-1 text-[10px] ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {formatDate(msg.createdAt)}
                      {isMine && msg.read && " -- read"}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      )}

      <Separator />

      <form onSubmit={handleSend} className="flex gap-2 pt-4">
        <Input
          placeholder="Type a message..."
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            emitTyping();
          }}
          className="flex-1"
          autoFocus
        />
        <Button type="submit" size="icon" disabled={!text.trim() || sending}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
