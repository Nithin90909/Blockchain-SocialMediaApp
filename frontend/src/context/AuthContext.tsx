import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authAPI } from "../services/api";

export interface User {
  id: string;
  username: string;
  email: string;
  walletAddress: string;
  reputationScore: number;
  bio?: string;
  avatarIPFSHash?: string;
  avatar?: string;
  followers?: any[];
  following?: any[];
  isOnline?: boolean;
  lastSeen?: string;
  createdAt?: string;
  privacySettings?: {
    defaultVisibility: string;
    whoCanMessage: string;
    showOnlineStatus: boolean;
    showLastSeen: boolean;
    showReputationScore: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { username: string; email: string; password: string; walletAddress: string }) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function normalizeUser(data: any): User {
  return {
    id: data.id || data._id,
    username: data.username,
    email: data.email,
    walletAddress: data.walletAddress,
    reputationScore: data.reputationScore ?? 100,
    bio: data.bio || "",
    avatarIPFSHash: data.avatarIPFSHash || "",
    avatar: data.avatar || "",
    followers: data.followers || [],
    following: data.following || [],
    isOnline: data.isOnline,
    lastSeen: data.lastSeen,
    createdAt: data.createdAt,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      authAPI
        .getMe()
        .then((res) => {
          const normalized = normalizeUser(res.data.user);
          setUser(normalized);
          localStorage.setItem("user", JSON.stringify(normalized));
        })
        .catch(() => {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  async function login(email: string, password: string) {
    const res = await authAPI.login({ email, password });
    const { user: userData, token: newToken } = res.data;
    const normalized = normalizeUser(userData);
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(normalized));
    setToken(newToken);
    setUser(normalized);
  }

  async function register(data: { username: string; email: string; password: string; walletAddress: string }) {
    const res = await authAPI.register(data);
    const { user: userData, token: newToken } = res.data;
    const normalized = normalizeUser(userData);
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(normalized));
    setToken(newToken);
    setUser(normalized);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  }

  function updateUser(data: Partial<User>) {
    setUser((prev) => (prev ? { ...prev, ...data } : null));
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
