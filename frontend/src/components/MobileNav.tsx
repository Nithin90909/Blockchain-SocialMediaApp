import { NavLink } from "react-router-dom";
import { Home, MessageSquare, Radio, Settings, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function MobileNav() {
  const { user } = useAuth();

  const items = [
    { to: "/dashboard", icon: Home, label: "Feed" },
    { to: "/chat", icon: MessageSquare, label: "Chat" },
    { to: "/live", icon: Radio, label: "Live" },
    { to: "/settings", icon: Settings, label: "Settings" },
    { to: `/profile/${user?.id}`, icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t bg-card lg:hidden">
      {items.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 py-2 text-xs transition-colors ${
              isActive ? "text-foreground" : "text-muted-foreground"
            }`
          }
        >
          <Icon className="h-5 w-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
