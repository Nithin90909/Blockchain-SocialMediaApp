import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { userAPI, notificationAPI } from "../services/api";
import { useSocket } from "../context/SocketContext";

export default function TopBar() {
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    notificationAPI.getAll().then((res) => {
      setUnreadCount(res.data.unreadCount || 0);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = () => setUnreadCount((prev) => prev + 1);
    socket.on("notification", handler);
    return () => { socket.off("notification", handler); };
  }, [socket]);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const res = await userAPI.search(searchQuery);
        setSearchResults(res.data.users || []);
        setShowResults(true);
      } catch {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 sm:px-6">
      <div className="flex items-center gap-4 lg:hidden">
        <span className="text-lg font-semibold">DecentraSocial</span>
      </div>

      <div className="relative hidden flex-1 sm:block sm:max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchResults.length > 0 && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
        />
        {showResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-md border bg-card shadow-lg max-h-64 overflow-y-auto">
            {searchResults.map((u) => {
              const uid = u._id || u.id;
              return (
                <button
                  key={uid}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-secondary/50"
                  onMouseDown={() => {
                    navigate(`/profile/${uid}`);
                    setSearchQuery("");
                    setShowResults(false);
                  }}
                >
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs">
                      {(u.username || "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{u.username}</p>
                    <p className="text-xs text-muted-foreground">Score: {u.reputationScore}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {isConnected && (
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Live
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => navigate("/dashboard")}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center p-0 text-[10px]">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </div>
    </header>
  );
}
