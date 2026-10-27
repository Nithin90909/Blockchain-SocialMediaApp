import { useState, useEffect, useRef, useCallback } from "react";
import { Video, VideoOff, Radio, Users, Send, X, MessageCircle } from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Separator } from "../components/ui/separator";
import { ScrollArea } from "../components/ui/scroll-area";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useModal } from "../context/ModalContext";
import { formatDate } from "../lib/utils";

interface LiveStream {
  hostId: string;
  hostUsername: string;
  title: string;
  viewerCount: number;
  startedAt: string;
}

interface LiveComment {
  userId: string;
  username: string;
  text: string;
  timestamp: string;
}

interface LiveReaction {
  emoji: string;
  id: string;
}

const LIVE_EMOJIS = ["❤️", "🔥", "👏", "😂", "😮", "💯"];

export default function LivePage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { showAlert, showPrompt } = useModal();

  const [activeStreams, setActiveStreams] = useState<LiveStream[]>([]);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isWatching, setIsWatching] = useState<string | null>(null);
  const [streamTitle, setStreamTitle] = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [floatingReactions, setFloatingReactions] = useState<LiveReaction[]>([]);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isBroadcasting && localVideoRef.current && streamRef.current) {
      localVideoRef.current.srcObject = streamRef.current;
    }
  }, [isBroadcasting]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  const fetchStreams = useCallback(() => {
    if (!socket) return;
    socket.emit("live:get-streams");
  }, [socket]);

  useEffect(() => {
    fetchStreams();
    const interval = setInterval(fetchStreams, 5000);
    return () => clearInterval(interval);
  }, [fetchStreams]);

  useEffect(() => {
    if (!socket) return;

    socket.on("live:streams-list", (streams: LiveStream[]) => {
      setActiveStreams(streams);
    });

    socket.on("live:viewer-count", (data: { count: number }) => {
      setViewerCount(data.count);
    });

    socket.on("live:comment", (comment: LiveComment) => {
      setComments((prev) => [...prev.slice(-100), comment]);
    });

    socket.on("live:reaction", (data: { emoji: string }) => {
      const id = Math.random().toString(36).substring(7);
      setFloatingReactions((prev) => [...prev, { emoji: data.emoji, id }]);
      setTimeout(() => {
        setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
      }, 2000);
    });

    socket.on("live:offer", async (data: { from: string; offer: RTCSessionDescriptionInit }) => {
      if (!isWatching) return;
      const pc = createPeerConnection(data.from);
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("live:answer", { to: data.from, answer });
    });

    socket.on("live:answer", async (data: { from: string; answer: RTCSessionDescriptionInit }) => {
      const pc = peerConnections.current.get(data.from);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    });

    socket.on("live:ice-candidate", async (data: { from: string; candidate: RTCIceCandidateInit }) => {
      const pc = peerConnections.current.get(data.from);
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    socket.on("live:stream-ended", () => {
      if (isWatching) {
        stopWatching();
        showAlert({ title: "Stream Ended", message: "The host has ended the live stream.", variant: "info" });
      }
    });

    socket.on("live:viewer-joined", (data: { viewerId: string }) => {
      if (isBroadcasting && streamRef.current) {
        const pc = createPeerConnection(data.viewerId);
        streamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, streamRef.current!);
        });
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            socket.emit("live:offer", { to: data.viewerId, offer: pc.localDescription });
          });
      }
    });

    return () => {
      socket.off("live:streams-list");
      socket.off("live:viewer-count");
      socket.off("live:comment");
      socket.off("live:reaction");
      socket.off("live:offer");
      socket.off("live:answer");
      socket.off("live:ice-candidate");
      socket.off("live:stream-ended");
      socket.off("live:viewer-joined");
    };
  }, [socket, isBroadcasting, isWatching]);

  function createPeerConnection(peerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.onicecandidate = (e) => {
      if (e.candidate && socket) {
        socket.emit("live:ice-candidate", { to: peerId, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      if (remoteVideoRef.current && e.streams[0]) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
    };

    peerConnections.current.set(peerId, pc);
    return pc;
  }

  async function startBroadcast() {
    const title = await showPrompt({
      title: "Start Live Stream",
      message: "Give your stream a title",
      placeholder: "Enter stream title...",
      confirmLabel: "Go Live",
      required: true,
      minLength: 3,
    });
    if (!title) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;

      setStreamTitle(title);
      setIsBroadcasting(true);
      setComments([]);
      socket?.emit("live:start-stream", { title });
    } catch {
      await showAlert({
        title: "Camera Access Required",
        message: "Please allow camera and microphone access to go live.",
        variant: "error",
      });
    }
  }

  function stopBroadcast() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();
    socket?.emit("live:stop-stream");
    setIsBroadcasting(false);
    setStreamTitle("");
    setComments([]);
    setViewerCount(0);
  }

  function startWatching(hostId: string) {
    setIsWatching(hostId);
    setComments([]);
    socket?.emit("live:join-stream", { hostId });
  }

  function stopWatching() {
    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    socket?.emit("live:leave-stream", { hostId: isWatching });
    setIsWatching(null);
    setComments([]);
  }

  function sendComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    const target = isBroadcasting ? user?.id : isWatching;
    socket?.emit("live:comment", { hostId: target, text: commentText });
    setCommentText("");
  }

  function sendReaction(emoji: string) {
    const target = isBroadcasting ? user?.id : isWatching;
    socket?.emit("live:reaction", { hostId: target, emoji });
  }

  if (isBroadcasting) {
    return (
      <div className="space-y-4 pb-20 lg:pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="gap-1 animate-pulse">
              <Radio className="h-3 w-3" /> LIVE
            </Badge>
            <span className="text-sm font-medium">{streamTitle}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> {viewerCount}
            </span>
            <Button variant="destructive" size="sm" onClick={stopBroadcast}>
              End Stream
            </Button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-lg bg-black">
          <video ref={localVideoRef} autoPlay muted playsInline className="w-full max-h-[60vh] object-contain" />
          <div className="absolute bottom-4 right-4 flex gap-1 pointer-events-none">
            {floatingReactions.map((r) => (
              <span key={r.id} className="text-2xl animate-bounce">{r.emoji}</span>
            ))}
          </div>
        </div>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium">Live Chat</span>
            </div>
            <ScrollArea className="h-40 mb-2">
              <div className="space-y-1.5">
                {comments.map((c, i) => (
                  <div key={i} className="text-xs">
                    <span className="font-medium text-primary">{c.username}</span>{" "}
                    <span className="text-foreground/80">{c.text}</span>
                  </div>
                ))}
                <div ref={commentsEndRef} />
              </div>
            </ScrollArea>
            <div className="flex gap-2">
              {LIVE_EMOJIS.map((e) => (
                <button key={e} className="text-lg hover:scale-125 transition-transform" onClick={() => sendReaction(e)}>
                  {e}
                </button>
              ))}
            </div>
            <form onSubmit={sendComment} className="flex gap-2 mt-2">
              <Input
                placeholder="Say something..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="h-8 text-xs flex-1"
              />
              <Button type="submit" size="sm" className="h-8" disabled={!commentText.trim()}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isWatching) {
    const stream = activeStreams.find((s) => s.hostId === isWatching);
    return (
      <div className="space-y-4 pb-20 lg:pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="gap-1">
              <Radio className="h-3 w-3" /> LIVE
            </Badge>
            <span className="text-sm font-medium">{stream?.title || "Live Stream"}</span>
            <span className="text-xs text-muted-foreground">by {stream?.hostUsername}</span>
          </div>
          <Button variant="outline" size="sm" onClick={stopWatching}>
            Leave
          </Button>
        </div>

        <div className="relative overflow-hidden rounded-lg bg-black min-h-[300px] flex items-center justify-center">
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full max-h-[60vh] object-contain" />
          <div className="absolute bottom-4 right-4 flex gap-1 pointer-events-none">
            {floatingReactions.map((r) => (
              <span key={r.id} className="text-2xl animate-bounce">{r.emoji}</span>
            ))}
          </div>
        </div>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium">Live Chat</span>
              <span className="text-xs text-muted-foreground ml-auto">
                <Users className="h-3 w-3 inline mr-1" />{viewerCount} watching
              </span>
            </div>
            <ScrollArea className="h-40 mb-2">
              <div className="space-y-1.5">
                {comments.map((c, i) => (
                  <div key={i} className="text-xs">
                    <span className="font-medium text-primary">{c.username}</span>{" "}
                    <span className="text-foreground/80">{c.text}</span>
                  </div>
                ))}
                <div ref={commentsEndRef} />
              </div>
            </ScrollArea>
            <div className="flex gap-2">
              {LIVE_EMOJIS.map((e) => (
                <button key={e} className="text-lg hover:scale-125 transition-transform" onClick={() => sendReaction(e)}>
                  {e}
                </button>
              ))}
            </div>
            <form onSubmit={sendComment} className="flex gap-2 mt-2">
              <Input
                placeholder="Say something..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="h-8 text-xs flex-1"
              />
              <Button type="submit" size="sm" className="h-8" disabled={!commentText.trim()}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Video className="h-5 w-5" />
            Live Streams
          </h2>
          <p className="text-sm text-muted-foreground">
            Watch live broadcasts or go live yourself.
          </p>
        </div>
        <Button className="gap-2" onClick={startBroadcast}>
          <Radio className="h-4 w-4" />
          Go Live
        </Button>
      </div>

      {activeStreams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <VideoOff className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              No live streams right now. Be the first to go live!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {activeStreams.map((stream) => (
            <Card key={stream.hostId} className="overflow-hidden cursor-pointer hover:border-primary/50 transition-colors" onClick={() => startWatching(stream.hostId)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="text-sm">
                        {stream.hostUsername.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 px-1 text-[8px]">
                      LIVE
                    </Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{stream.title}</p>
                    <p className="text-xs text-muted-foreground">{stream.hostUsername}</p>
                  </div>
                  <div className="text-right">
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" /> {stream.viewerCount}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{formatDate(stream.startedAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
