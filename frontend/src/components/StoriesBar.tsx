import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, X, ChevronLeft, ChevronRight, Eye, Trash2, Send, ChevronUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { storyAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useModal } from "../context/ModalContext";
import { getIPFSUrl, isValidIPFSHash, formatDate } from "../lib/utils";

const STORY_EMOJIS = ["❤️", "😂", "😮", "😢", "🔥", "👏", "💯", "🥰"];

const BG_GRADIENTS = [
  { id: "sunset", css: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
  { id: "ocean", css: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" },
  { id: "forest", css: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" },
  { id: "night", css: "linear-gradient(135deg, #0c0c1d 0%, #1a1a3e 50%, #3d2c6e 100%)" },
  { id: "fire", css: "linear-gradient(135deg, #f83600 0%, #f9d423 100%)" },
  { id: "purple", css: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)" },
  { id: "dark", css: "linear-gradient(135deg, #232526 0%, #414345 100%)" },
  { id: "candy", css: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)" },
];

const FONT_STYLES = [
  { id: "normal", label: "Aa", className: "font-sans" },
  { id: "bold", label: "Aa", className: "font-bold" },
  { id: "serif", label: "Aa", className: "font-serif" },
  { id: "mono", label: "Aa", className: "font-mono" },
  { id: "italic", label: "Aa", className: "italic" },
];

interface StoryGroup {
  user: any;
  stories: any[];
  hasUnviewed: boolean;
}

export default function StoriesBar() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { showConfirm } = useModal();
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Create state
  const [showCreate, setShowCreate] = useState(false);
  const [createMode, setCreateMode] = useState<"media" | "text">("media");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedGradient, setSelectedGradient] = useState(BG_GRADIENTS[0]);
  const [selectedFont, setSelectedFont] = useState(FONT_STYLES[0]);

  // Viewer state
  const [viewingGroup, setViewingGroup] = useState<StoryGroup | null>(null);
  const [viewingIndex, setViewingIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [replySent, setReplySent] = useState(false);
  const [reactSent, setReactSent] = useState<string | null>(null);
  const [progressKey, setProgressKey] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const STORY_DURATION = 6000;

  const fetchStories = useCallback(async () => {
    try {
      const res = await storyAPI.getAll();
      setGroups(res.data.storyGroups || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchStories(); }, [fetchStories]);

  useEffect(() => {
    if (!socket) return;
    const handler = () => fetchStories();
    socket.on("new-story", handler);

    const reactHandler = (data: { storyId: string; emoji: string }) => {
      setReactSent(data.emoji);
      setTimeout(() => setReactSent(null), 1500);
    };
    socket.on("story:react-sent", reactHandler);

    const replyHandler = () => {
      setReplySent(true);
      setTimeout(() => setReplySent(false), 2000);
    };
    socket.on("story:reply-sent", replyHandler);

    return () => {
      socket.off("new-story", handler);
      socket.off("story:react-sent", reactHandler);
      socket.off("story:reply-sent", replyHandler);
    };
  }, [socket, fetchStories]);

  // --- Create ---

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setCreateMode("media");
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  }

  async function handleCreateStory() {
    if (createMode === "media" && !file) return;
    if (createMode === "text" && !caption.trim()) return;
    setCreating(true);
    try {
      const formData = new FormData();
      if (file) formData.append("media", file);
      formData.append("caption", caption);
      if (createMode === "text") {
        formData.append("bgGradient", selectedGradient.id);
        formData.append("fontStyle", selectedFont.id);
      }
      await storyAPI.create(formData);
      closeCreate();
      fetchStories();
    } catch {}
    setCreating(false);
  }

  function closeCreate() {
    setShowCreate(false);
    setFile(null);
    setPreview(null);
    setCaption("");
    setCreateMode("media");
    setSelectedGradient(BG_GRADIENTS[0]);
    setSelectedFont(FONT_STYLES[0]);
  }

  // --- Viewer ---

  function openStory(group: StoryGroup, startIndex = 0) {
    const firstUnviewed = group.stories.findIndex((s: any) => !s.viewed);
    const idx = firstUnviewed >= 0 ? firstUnviewed : startIndex;
    setViewingGroup(group);
    setViewingIndex(idx);
    setShowViewers(false);
    setViewers([]);
    setProgressKey((k) => k + 1);
    markViewed(group.stories[idx]._id);
    startTimer();
  }

  function startTimer() {
    clearTimer();
    timerRef.current = setTimeout(() => {
      advanceStory();
    }, STORY_DURATION);
  }

  function clearTimer() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }

  function advanceStory() {
    setViewingGroup((prevGroup) => {
      if (!prevGroup) return null;
      setViewingIndex((prevIdx) => {
        const nextIdx = prevIdx + 1;
        if (nextIdx < prevGroup.stories.length) {
          markViewed(prevGroup.stories[nextIdx]._id);
          setProgressKey((k) => k + 1);
          clearTimer();
          timerRef.current = setTimeout(advanceStory, STORY_DURATION);
          return nextIdx;
        } else {
          // Move to next group
          const groupIdx = groups.findIndex(
            (g) => (g.user._id || g.user.id) === (prevGroup.user._id || prevGroup.user.id)
          );
          if (groupIdx >= 0 && groupIdx < groups.length - 1) {
            const nextGroup = groups[groupIdx + 1];
            setTimeout(() => openStory(nextGroup, 0), 0);
          } else {
            closeViewer();
          }
          return prevIdx;
        }
      });
      return prevGroup;
    });
  }

  function goNext() {
    clearTimer();
    advanceStory();
  }

  function goPrev() {
    clearTimer();
    setViewingIndex((prev) => {
      const next = Math.max(0, prev - 1);
      setProgressKey((k) => k + 1);
      startTimer();
      return next;
    });
  }

  function closeViewer() {
    clearTimer();
    setViewingGroup(null);
    setShowViewers(false);
    setViewers([]);
    fetchStories();
  }

  function handlePause() {
    if (isPaused) {
      setIsPaused(false);
      startTimer();
    } else {
      setIsPaused(true);
      clearTimer();
    }
  }

  async function markViewed(storyId: string) {
    try {
      const res = await storyAPI.view(storyId);
      setViewers(res.data.viewers || []);
    } catch {}
  }

  function handleReaction(storyId: string, emoji: string) {
    if (socket) {
      socket.emit("story:react", { storyId, emoji });
    }
    setReactSent(emoji);
    setTimeout(() => setReactSent(null), 1500);
  }

  function handleSendReply() {
    if (!replyText.trim() || !viewingGroup || !currentStory || !socket) return;
    const ownerId = viewingGroup.user._id || viewingGroup.user.id;
    if (ownerId === user?.id) return;
    socket.emit("story:reply", {
      storyOwnerId: ownerId,
      storyId: currentStory._id,
      text: replyText.trim(),
    });
    setReplyText("");
    setReplySent(true);
    setTimeout(() => setReplySent(false), 2000);
  }

  async function handleDeleteStory(storyId: string) {
    const ok = await showConfirm({
      title: "Delete Story",
      message: "Delete this story? This can't be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await storyAPI.delete(storyId);
      closeViewer();
      fetchStories();
    } catch {}
  }

  function getGradientCSS(gradientId: string): string {
    return BG_GRADIENTS.find((g) => g.id === gradientId)?.css || BG_GRADIENTS[3].css;
  }

  function getFontClass(fontId: string): string {
    return FONT_STYLES.find((f) => f.id === fontId)?.className || "";
  }

  function getTimeRemaining(expiresAt: string): string {
    const ms = new Date(expiresAt).getTime() - Date.now();
    if (ms <= 0) return "Expired";
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h left` : `${m}m left`;
  }

  if (loading) return null;

  const currentStory = viewingGroup?.stories[viewingIndex];
  const isMyStory = viewingGroup && (viewingGroup.user._id || viewingGroup.user.id) === user?.id;

  return (
    <>
      {/* ===== Stories Bar ===== */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-3 scrollbar-none"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {/* Your story */}
          <button
            className="flex flex-col items-center gap-1.5 min-w-[72px]"
            onClick={() => setShowCreate(true)}
          >
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                <Avatar className="h-[58px] w-[58px] border-[3px] border-background">
                  {user?.avatar && <AvatarImage src={user.avatar} />}
                  <AvatarFallback className="text-lg">{user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground border-2 border-background">
                <Plus className="h-3 w-3" />
              </div>
            </div>
            <span className="text-[11px] text-muted-foreground truncate w-16 text-center">Your story</span>
          </button>

          {/* Other stories */}
          {groups.map((group) => {
            const u = group.user;
            const uid = u?._id || u?.id;
            const isMe = uid === user?.id;
            return (
              <button
                key={uid}
                className="flex flex-col items-center gap-1.5 min-w-[72px]"
                onClick={() => openStory(group)}
              >
                <div
                  className="h-16 w-16 rounded-full p-[2.5px]"
                  style={{
                    background: group.hasUnviewed
                      ? "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)"
                      : "hsl(var(--muted))",
                  }}
                >
                  <div className="h-full w-full rounded-full border-[3px] border-background overflow-hidden">
                    <Avatar className="h-full w-full">
                      {u?.avatar && (
                        <AvatarImage src={u.avatar} />
                      )}
                      <AvatarFallback className="text-sm">
                        {(u?.username || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                <span className="text-[11px] truncate w-16 text-center">
                  {isMe ? "Your story" : u?.username}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== Create Story Modal ===== */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
          <div className="relative w-full max-w-[420px] h-full max-h-[90vh] flex flex-col mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-8 w-8" onClick={closeCreate}>
                <X className="h-5 w-5" />
              </Button>
              <div className="flex gap-2">
                <Button
                  variant={createMode === "text" ? "secondary" : "ghost"}
                  size="sm"
                  className={createMode !== "text" ? "text-white hover:bg-white/10" : ""}
                  onClick={() => { setCreateMode("text"); setFile(null); setPreview(null); }}
                >
                  Aa
                </Button>
                <Button
                  variant={createMode === "media" ? "secondary" : "ghost"}
                  size="sm"
                  className={createMode !== "media" ? "text-white hover:bg-white/10" : ""}
                  onClick={() => { setCreateMode("media"); fileInputRef.current?.click(); }}
                >
                  Photo
                </Button>
              </div>
            </div>

            <input ref={fileInputRef} type="file" accept="image/*,video/mp4" onChange={handleFileSelect} className="hidden" />

            {/* Preview area */}
            <div className="flex-1 mx-4 rounded-2xl overflow-hidden relative">
              {createMode === "media" ? (
                preview ? (
                  <div className="h-full w-full flex items-center justify-center bg-black">
                    <img src={preview} alt="Preview" className="max-h-full max-w-full object-contain" />
                  </div>
                ) : (
                  <button
                    className="h-full w-full flex flex-col items-center justify-center bg-zinc-900 hover:bg-zinc-800 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center mb-3">
                      <Plus className="h-8 w-8 text-white/70" />
                    </div>
                    <span className="text-white/60 text-sm">Tap to add photo or video</span>
                  </button>
                )
              ) : (
                <div
                  className="h-full w-full flex items-center justify-center p-8"
                  style={{ background: selectedGradient.css }}
                >
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Type your story..."
                    className={`bg-transparent text-white text-center text-xl leading-relaxed w-full resize-none outline-none placeholder-white/40 ${getFontClass(selectedFont.id)}`}
                    style={{ minHeight: "120px" }}
                    maxLength={500}
                    autoFocus
                  />
                </div>
              )}

              {/* Caption input for media mode */}
              {createMode === "media" && preview && (
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                  <Input
                    placeholder="Add a caption..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder-white/40"
                    maxLength={500}
                  />
                </div>
              )}
            </div>

            {/* Bottom controls */}
            <div className="px-4 py-3 space-y-3">
              {createMode === "text" && (
                <>
                  {/* Gradient picker */}
                  <div className="flex gap-2 justify-center">
                    {BG_GRADIENTS.map((g) => (
                      <button
                        key={g.id}
                        className={`h-7 w-7 rounded-full border-2 transition-transform ${
                          selectedGradient.id === g.id ? "border-white scale-110" : "border-transparent"
                        }`}
                        style={{ background: g.css }}
                        onClick={() => setSelectedGradient(g)}
                      />
                    ))}
                  </div>
                  {/* Font picker */}
                  <div className="flex gap-2 justify-center">
                    {FONT_STYLES.map((f) => (
                      <button
                        key={f.id}
                        className={`h-8 w-8 rounded-md flex items-center justify-center text-xs transition-colors ${
                          selectedFont.id === f.id
                            ? "bg-white text-black"
                            : "bg-white/10 text-white hover:bg-white/20"
                        } ${f.className}`}
                        onClick={() => setSelectedFont(f)}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <Button
                className="w-full"
                disabled={creating || (createMode === "media" ? !file : !caption.trim())}
                onClick={handleCreateStory}
              >
                {creating ? "Sharing..." : "Share to Story"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Story Viewer (Instagram-style) ===== */}
      {viewingGroup && currentStory && (
        <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
          <div className="relative w-full max-w-[420px] h-full max-h-[100vh] mx-auto">
            {/* Progress bars */}
            <div className="absolute top-2 left-3 right-3 flex gap-[3px] z-20">
              {viewingGroup.stories.map((_: any, i: number) => (
                <div key={i} className="flex-1 h-[2px] rounded-full bg-white/30 overflow-hidden">
                  {i < viewingIndex ? (
                    <div className="h-full w-full bg-white" />
                  ) : i === viewingIndex ? (
                    <div
                      key={progressKey}
                      className="h-full bg-white"
                      style={{
                        animation: isPaused ? "none" : `progress ${STORY_DURATION}ms linear forwards`,
                      }}
                    />
                  ) : null}
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="absolute top-5 left-3 right-3 flex items-center justify-between z-20">
              <div className="flex items-center gap-2.5">
                <div
                  className="h-9 w-9 rounded-full p-[2px]"
                  style={{ background: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)" }}
                >
                  <Avatar className="h-full w-full border-2 border-black">
                    {viewingGroup.user?.avatar && (
                      <AvatarImage src={viewingGroup.user.avatar} />
                    )}
                    <AvatarFallback className="text-[10px] bg-zinc-700 text-white">
                      {(viewingGroup.user?.username || "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white">{viewingGroup.user?.username}</p>
                  <p className="text-[10px] text-white/50">
                    {formatDate(currentStory.createdAt)} · {getTimeRemaining(currentStory.expiresAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {isMyStory && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/10"
                    onClick={() => handleDeleteStory(currentStory._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/10" onClick={closeViewer}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Story content */}
            <div
              className="h-full w-full flex items-center justify-center rounded-lg overflow-hidden"
              onClick={handlePause}
            >
              {currentStory.mediaIPFSHash && isValidIPFSHash(currentStory.mediaIPFSHash) ? (
                <div className="h-full w-full relative">
                  <img
                    src={getIPFSUrl(currentStory.mediaIPFSHash)}
                    alt="Story"
                    className="h-full w-full object-cover"
                  />
                  {currentStory.caption && (
                    <div className="absolute bottom-24 left-4 right-4 z-10">
                      <p className="text-[15px] text-white text-center bg-black/50 backdrop-blur-sm rounded-xl px-4 py-2.5 leading-relaxed">
                        {currentStory.caption}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="h-full w-full flex items-center justify-center p-10"
                  style={{ background: getGradientCSS(currentStory.bgGradient) }}
                >
                  <p className={`text-xl text-white text-center leading-relaxed ${getFontClass(currentStory.fontStyle)}`}>
                    {currentStory.caption}
                  </p>
                </div>
              )}
            </div>

            {/* Navigation tap zones */}
            <div
              className="absolute left-0 top-16 bottom-24 w-1/3 z-10 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
            />
            <div
              className="absolute right-0 top-16 bottom-24 w-1/3 z-10 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); goNext(); }}
            />

            {/* Arrow indicators */}
            {viewingIndex > 0 && (
              <div className="absolute left-2 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
                <ChevronLeft className="h-6 w-6 text-white/40" />
              </div>
            )}
            {viewingIndex < viewingGroup.stories.length - 1 && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
                <ChevronRight className="h-6 w-6 text-white/40" />
              </div>
            )}

            {/* Bottom area */}
            <div className="absolute bottom-0 left-0 right-0 z-20">
              {/* Viewers panel (only for own stories) */}
              {isMyStory && showViewers && (
                <div className="bg-zinc-900/95 backdrop-blur-sm rounded-t-2xl border-t border-white/10 max-h-[50vh] overflow-y-auto mx-1 mb-0">
                  <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between sticky top-0 bg-zinc-900/95">
                    <span className="text-sm font-medium text-white">
                      <Eye className="h-4 w-4 inline mr-1.5" />
                      {currentStory.viewerCount} viewer{currentStory.viewerCount !== 1 ? "s" : ""}
                    </span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-white/60 hover:bg-white/10" onClick={() => setShowViewers(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {viewers.length === 0 ? (
                    <p className="text-xs text-white/40 text-center py-6">No viewers yet</p>
                  ) : (
                    <div className="py-1">
                      {viewers.map((v: any) => {
                        const vid = v._id || v.id;
                        return (
                          <div key={vid} className="flex items-center gap-3 px-4 py-2">
                            <Avatar className="h-9 w-9">
                              {v.avatar && (
                                <AvatarImage src={v.avatar} />
                              )}
                              <AvatarFallback className="text-xs bg-zinc-700 text-white">
                                {(v.username || "?").charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-white">{v.username}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Viewer count / reply bar */}
              <div className="px-3 pb-4 pt-2 bg-gradient-to-t from-black/80 to-transparent">
                {isMyStory ? (
                  <button
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-white/70 hover:text-white transition-colors"
                    onClick={() => { setShowViewers(!showViewers); if (isPaused) {} else handlePause(); }}
                  >
                    <ChevronUp className={`h-4 w-4 transition-transform ${showViewers ? "rotate-180" : ""}`} />
                    <Eye className="h-4 w-4" />
                    <span className="text-sm">{currentStory.viewerCount}</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    {/* Sent feedback */}
                    {(reactSent || replySent) && (
                      <div className="flex justify-center">
                        <span className="text-xs text-white/80 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 animate-pulse">
                          {reactSent ? `${reactSent} Sent` : "Message sent!"}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        {STORY_EMOJIS.slice(0, 6).map((emoji) => (
                          <button
                            key={emoji}
                            className="text-xl transition-transform hover:scale-125 active:scale-100"
                            onClick={(e) => { e.stopPropagation(); handleReaction(currentStory._id, emoji); }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                      <div className="flex-1 flex gap-1.5">
                        <Input
                          placeholder="Send message..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSendReply(); } }}
                          className="h-9 bg-white/10 border-white/20 text-white placeholder-white/40 text-xs flex-1"
                          onClick={(e) => { e.stopPropagation(); if (!isPaused) handlePause(); }}
                        />
                        {replyText.trim() && (
                          <Button size="icon" className="h-9 w-9" onClick={(e) => { e.stopPropagation(); handleSendReply(); }}>
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pause indicator */}
            {isPaused && !showViewers && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
                <div className="flex gap-1.5">
                  <div className="w-3 h-10 bg-white/80 rounded-sm" />
                  <div className="w-3 h-10 bg-white/80 rounded-sm" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
