import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, Flag, Shield, Trash2, SmilePlus } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Separator } from "./ui/separator";
import { postAPI, moderationAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useModal } from "../context/ModalContext";
import { formatDate, getIPFSUrl, truncateAddress, isValidIPFSHash } from "../lib/utils";

const REACTION_EMOJI: Record<string, string> = {
  like: "👍",
  love: "❤️",
  laugh: "😂",
  wow: "😮",
  angry: "😡",
  sad: "😢",
};

interface PostCardProps {
  post: any;
  onUpdate?: () => void;
}

export default function PostCard({ post, onUpdate }: PostCardProps) {
  const { user } = useAuth();
  const { showAlert, showConfirm, showPrompt } = useModal();
  const [liked, setLiked] = useState(() => {
    if (!user || !post.likes) return false;
    return post.likes.some((id: any) => {
      const likeId = typeof id === "object" ? (id._id || id) : id;
      return likeId?.toString() === user.id;
    });
  });
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [myReaction, setMyReaction] = useState<string | null>(() => {
    if (!user || !post.reactions) return null;
    const r = post.reactions.find((r: any) => {
      const rid = typeof r.userId === "object" ? (r.userId._id || r.userId) : r.userId;
      return rid?.toString() === user.id;
    });
    return r?.type || null;
  });
  const [reactionSummary, setReactionSummary] = useState<Record<string, number>>(() => {
    const s: Record<string, number> = {};
    for (const r of post.reactions || []) {
      s[r.type] = (s[r.type] || 0) + 1;
    }
    return s;
  });
  const [totalReactions, setTotalReactions] = useState(post.reactions?.length || 0);
  const [pollVoted, setPollVoted] = useState(() => {
    if (!user || !post.poll) return false;
    return post.poll.options.some((o: any) =>
      o.votes?.some((v: any) => {
        const vid = typeof v === "object" ? (v._id || v) : v;
        return vid?.toString() === user.id;
      })
    );
  });
  const [pollData, setPollData] = useState(post.poll || null);

  const author = post.userId;
  const authorId = author?._id || author?.id || author;
  const isOwner = user?.id === authorId?.toString();

  async function handleLike() {
    try {
      const res = await postAPI.like(post._id);
      setLiked(res.data.liked);
      setLikesCount(res.data.likes);
    } catch {}
  }

  async function handleReaction(type: string) {
    try {
      const res = await postAPI.react(post._id, type);
      setMyReaction(res.data.myReaction);
      setReactionSummary(res.data.reactionSummary);
      setTotalReactions(res.data.totalReactions);
      setShowReactions(false);
    } catch {}
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      await postAPI.comment(post._id, commentText);
      setCommentText("");
      onUpdate?.();
    } catch {}
    setSubmitting(false);
  }

  async function handlePollVote(optionIndex: number) {
    if (pollVoted) return;
    try {
      const res = await postAPI.votePoll(post._id, optionIndex);
      setPollData(res.data.poll);
      setPollVoted(true);
    } catch {}
  }

  async function handleReport() {
    const reason = await showPrompt({
      title: "Report Post",
      message: "Why are you reporting this post? Provide a reason so moderators can review it.",
      placeholder: "Enter your reason...",
      confirmLabel: "Submit Report",
      required: true,
      minLength: 5,
      multiline: true,
    });
    if (!reason) return;
    try {
      await moderationAPI.report(post._id, reason);
      await showAlert({
        title: "Report Submitted",
        message: "Your report has been submitted and will be reviewed by the community.",
        variant: "success",
      });
    } catch {
      await showAlert({
        title: "Report Failed",
        message: "Something went wrong while submitting the report. Please try again.",
        variant: "error",
      });
    }
  }

  async function handleDelete() {
    const confirmed = await showConfirm({
      title: "Delete Post",
      message: "Are you sure you want to delete this post? This action cannot be undone.",
      confirmLabel: "Delete",
      destructive: true,
      variant: "warning",
    });
    if (!confirmed) return;
    try {
      await postAPI.delete(post._id);
      onUpdate?.();
    } catch {
      await showAlert({
        title: "Delete Failed",
        message: "Could not delete the post. Please try again.",
        variant: "error",
      });
    }
  }

  function getCredibilityBadge() {
    if (post.credibilityScore == null || post.credibilityScore < 0) return null;
    if (post.credibilityScore >= 70) {
      return <Badge variant="outline" className="border-green-500/30 text-green-600 text-xs">Verified</Badge>;
    }
    if (post.credibilityScore >= 40) {
      return <Badge variant="outline" className="border-yellow-500/30 text-yellow-600 text-xs">Unverified</Badge>;
    }
    return <Badge variant="destructive" className="text-xs">Low credibility</Badge>;
  }

  function getTotalPollVotes() {
    if (!pollData) return 0;
    return pollData.options.reduce((sum: number, o: any) => sum + (o.votes?.length || 0), 0);
  }

  const hasMedia = post.mediaIPFSHash && isValidIPFSHash(post.mediaIPFSHash);
  const pollEnded = pollData && new Date(pollData.endsAt) < new Date();

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Link to={`/profile/${authorId}`}>
            <Avatar className="h-9 w-9">
              {author?.avatar && (
                <AvatarImage src={author.avatar} />
              )}
              <AvatarFallback className="text-xs">
                {(author?.username || "?").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link to={`/profile/${authorId}`} className="text-sm font-medium hover:underline">
                {author?.username || "Unknown"}
              </Link>
              {author?.walletAddress && (
                <span className="text-xs text-muted-foreground">
                  {truncateAddress(author.walletAddress)}
                </span>
              )}
              <span className="text-xs text-muted-foreground">{formatDate(post.createdAt)}</span>
              {getCredibilityBadge()}
              {post.visibility !== "public" && (
                <Badge variant="secondary" className="text-xs">{post.visibility}</Badge>
              )}
            </div>
            <div className="mt-2">
              <Link to={`/post/${post._id}`} className="block">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
              </Link>
              {hasMedia && (
                <div className="mt-3 overflow-hidden rounded-lg border">
                  <img
                    src={getIPFSUrl(post.mediaIPFSHash)}
                    alt="Post media"
                    className="max-h-96 w-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
              {post.mediaIPFSHash && !hasMedia && (
                <div className="mt-3 rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                  Media uploaded (IPFS pending sync)
                </div>
              )}

              {/* Poll */}
              {pollData && (
                <div className="mt-3 rounded-lg border p-3 space-y-2">
                  <p className="text-sm font-medium">{pollData.question}</p>
                  <div className="space-y-1.5">
                    {pollData.options.map((opt: any, i: number) => {
                      const total = getTotalPollVotes();
                      const pct = total > 0 ? Math.round((opt.votes?.length || 0) / total * 100) : 0;
                      const isMyVote = opt.votes?.some((v: any) => {
                        const vid = typeof v === "object" ? (v._id || v) : v;
                        return vid?.toString() === user?.id;
                      });
                      return (
                        <button
                          key={i}
                          className={`relative w-full rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                            isMyVote ? "border-primary bg-primary/10" : "hover:bg-secondary/50"
                          } ${pollVoted || pollEnded ? "cursor-default" : "cursor-pointer"}`}
                          onClick={() => !pollVoted && !pollEnded && handlePollVote(i)}
                          disabled={pollVoted || pollEnded}
                        >
                          {(pollVoted || pollEnded) && (
                            <div
                              className="absolute inset-0 rounded-md bg-primary/10"
                              style={{ width: `${pct}%` }}
                            />
                          )}
                          <span className="relative flex items-center justify-between">
                            <span>{opt.text}</span>
                            {(pollVoted || pollEnded) && (
                              <span className="font-medium">{pct}%</span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {getTotalPollVotes()} votes
                    {pollEnded ? " · Poll ended" : ` · Ends ${formatDate(pollData.endsAt)}`}
                  </p>
                </div>
              )}
            </div>

            {/* Reactions summary */}
            {totalReactions > 0 && (
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                {Object.entries(reactionSummary).map(([type, count]) => (
                  <span key={type} className="flex items-center gap-0.5" title={type}>
                    {REACTION_EMOJI[type]} {count}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-3 flex items-center gap-1">
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground h-8" onClick={handleLike}>
                <Heart className={`h-4 w-4 ${liked ? "fill-red-500 text-red-500" : ""}`} />
                <span className="text-xs">{likesCount}</span>
              </Button>

              {/* Emoji reaction button */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`gap-1 h-8 ${myReaction ? "text-primary" : "text-muted-foreground"}`}
                  onClick={() => setShowReactions(!showReactions)}
                >
                  {myReaction ? (
                    <span className="text-sm">{REACTION_EMOJI[myReaction]}</span>
                  ) : (
                    <SmilePlus className="h-4 w-4" />
                  )}
                </Button>
                {showReactions && (
                  <div className="absolute bottom-full left-0 z-50 mb-1 flex gap-1 rounded-full border bg-card px-2 py-1.5 shadow-lg">
                    {Object.entries(REACTION_EMOJI).map(([type, emoji]) => (
                      <button
                        key={type}
                        className={`rounded-full px-1.5 py-0.5 text-lg transition-transform hover:scale-125 ${
                          myReaction === type ? "bg-primary/20" : ""
                        }`}
                        onClick={() => handleReaction(type)}
                        title={type}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground h-8"
                onClick={() => setShowComments(!showComments)}
              >
                <MessageCircle className="h-4 w-4" />
                <span className="text-xs">{post.comments?.length || 0}</span>
              </Button>
              {post.blockchainTxHash && (
                <div className="flex items-center gap-1 px-2" title="On-chain verified">
                  <Shield className="h-4 w-4 text-green-500" />
                </div>
              )}
              <div className="ml-auto flex gap-1">
                {!isOwner && (
                  <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground h-8" onClick={handleReport}>
                    <Flag className="h-4 w-4" />
                  </Button>
                )}
                {isOwner && (
                  <Button variant="ghost" size="sm" className="gap-1.5 text-destructive h-8" onClick={handleDelete}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {showComments && (
              <div className="mt-3">
                <Separator className="mb-3" />
                {post.comments?.length === 0 && (
                  <p className="text-xs text-muted-foreground mb-2">No comments yet.</p>
                )}
                {post.comments?.map((comment: any, i: number) => (
                  <div key={comment._id || i} className="mb-2 flex items-start gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px]">
                        {(comment.userId?.username || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium">{comment.userId?.username || "User"}</span>
                        <span className="text-[10px] text-muted-foreground">{formatDate(comment.createdAt)}</span>
                      </div>
                      <p className="text-xs text-foreground/80">{comment.text}</p>
                    </div>
                  </div>
                ))}
                <form onSubmit={handleComment} className="mt-2 flex gap-2">
                  <Input
                    placeholder="Write a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Button type="submit" size="sm" className="h-8" disabled={submitting || !commentText.trim()}>
                    Post
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
