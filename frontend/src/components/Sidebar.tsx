import { NavLink, useNavigate } from "react-router-dom";
import { Home, MessageSquare, Shield, User, LogOut, Radio, Settings } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

const navItems = [
  { to: "/dashboard", icon: Home, label: "Feed" },
  { to: "/chat", icon: MessageSquare, label: "Messages" },
  { to: "/live", icon: Radio, label: "Live" },
  { to: "/moderation", icon: Shield, label: "Moderation" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <aside className="hidden w-64 flex-col border-r bg-card lg:flex">
      <div className="flex h-14 items-center px-6">
        <span className="text-lg font-semibold tracking-tight">DecentraSocial</span>
      </div>
      <Separator />
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
        {user && (
          <NavLink
            to={`/profile/${user.id}`}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              }`
            }
          >
            <User className="h-4 w-4" />
            Profile
          </NavLink>
        )}
      </nav>
      <Separator />
      <div className="p-4">
        <div className="mb-3 flex items-center gap-3 px-3">
          <Avatar className="h-8 w-8">
            {user?.avatar && <AvatarImage src={user.avatar} />}
            <AvatarFallback className="text-xs">{user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 truncate">
            <p className="text-sm font-medium">{user?.username}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.walletAddress?.slice(0, 6)}...{user?.walletAddress?.slice(-4)}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-3" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>
    </aside>
  );
}
