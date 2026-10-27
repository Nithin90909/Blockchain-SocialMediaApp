import { useState, useEffect, useCallback } from "react";
import CreatePost from "../components/CreatePost";
import PostCard from "../components/PostCard";
import StoriesBar from "../components/StoriesBar";
import { postAPI, userAPI, notificationAPI } from "../services/api";
import { useSocket } from "../context/SocketContext";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Link } from "react-router-dom";
import { Bell, X } from "lucide-react";
import { formatDate } from "../lib/utils";

export default function Dashboard() {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [suggested, setSuggested] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async (pageNum = 1) => {
    try {
      const res = await postAPI.getFeed(pageNum);
      if (pageNum === 1) {
        setPosts(res.data.posts || []);
      } else {
        setPosts((prev) => [...prev, ...(res.data.posts || [])]);
      }
      setHasMore(pageNum < (res.data.pagination?.pages || 1));
    } catch (err) {
      console.error("Feed fetch error:", err);
    }
    setLoading(false);
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationAPI.getAll();
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {}
  }, []);

  useEffect(() => {
    fetchPosts(1);
    userAPI.getSuggested().then((res) => setSuggested(res.data.users || [])).catch(() => {});
    fetchNotifications();
  }, [fetchPosts, fetchNotifications]);

  useEffect(() => {
    if (!socket) return;

    function handleNewPost(newPost: any) {
      setPosts((prev) => {
        const exists = prev.some((p) => p._id === newPost._id);
        if (exists) return prev;
        return [newPost, ...prev];
      });
    }

    function handleNotification() {
      fetchNotifications();
    }

    socket.on("new-post", handleNewPost);
    socket.on("notification", handleNotification);

    return () => {
      socket.off("new-post", handleNewPost);
      socket.off("notification", handleNotification);
    };
  }, [socket, fetchNotifications]);

  function handlePostCreated() {
    fetchPosts(1);
    setPage(1);
  }

  function loadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage);
  }

  async function markAllRead() {
    try {
      await notificationAPI.markRead("all");
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case "like": return "reacted to your post";
      case "comment": return "commented on your post";
      case "follow": return "started following you";
      case "mention": return "mentioned you";
      case "report": return "reported content reviewed";
      default: return type;
    }
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Notification panel */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Feed</h2>
        <Button
          variant="ghost"
          size="sm"
          className="relative gap-1.5"
          onClick={() => setShowNotifications(!showNotifications)}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="h-4 min-w-[16px] p-0 flex items-center justify-center text-[10px]">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      {showNotifications && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
                    Mark all read
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowNotifications(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            {notifications.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No notifications yet.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {notifications.map((n) => {
                  const fromUser = n.fromUserId;
                  const fromId = fromUser?._id || fromUser?.id || fromUser;
                  return (
                    <div
                      key={n._id}
                      className={`flex items-start gap-2 rounded-md p-2 text-xs ${
                        n.read ? "text-muted-foreground" : "bg-secondary/50 text-foreground"
                      }`}
                    >
                      <Avatar className="h-6 w-6 mt-0.5">
                        {fromUser?.avatar && <AvatarImage src={fromUser.avatar} />}
                        <AvatarFallback className="text-[10px]">
                          {(fromUser?.username || "?").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p>
                          <Link to={`/profile/${fromId}`} className="font-medium hover:underline">
                            {fromUser?.username || "Someone"}
                          </Link>{" "}
                          {n.message || getNotificationIcon(n.type)}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(n.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <StoriesBar />

      <CreatePost onPostCreated={handlePostCreated} />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No posts yet. Create the first one or follow some users.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post._id} post={post} onUpdate={() => fetchPosts(1)} />
          ))}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" size="sm" onClick={loadMore}>
                Load more
              </Button>
            </div>
          )}
        </div>
      )}

      {suggested.length > 0 && (
        <>
          <Separator />
          <Card>
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-semibold">Suggested Users</h3>
              <div className="space-y-2">
                {suggested.slice(0, 5).map((u: any) => {
                  const uid = u._id || u.id;
                  return (
                    <Link
                      key={uid}
                      to={`/profile/${uid}`}
                      className="flex items-center gap-3 rounded-md p-2 hover:bg-secondary/50 transition-colors"
                    >
                      <Avatar className="h-8 w-8">
                        {u.avatar && <AvatarImage src={u.avatar} />}
                        <AvatarFallback className="text-xs">{(u.username || "?").charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{u.username}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.bio || "No bio"}</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">Score: {u.reputationScore}</Badge>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
