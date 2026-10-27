import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateAddress(address: string, chars = 4): string {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function getIPFSUrl(hash: string): string {
  if (!hash) return "";
  if (hash.startsWith("local:")) return hash.replace("local:", "");
  if (hash.startsWith("http")) return hash;
  if (hash.startsWith("/uploads/")) {
    const backendBase =
      import.meta.env.VITE_BACKEND_URL ||
      import.meta.env.VITE_SOCKET_URL ||
      (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "") : "");
    return `${backendBase}${hash}`;
  }
  return `https://gateway.pinata.cloud/ipfs/${hash}`;
}

export function isValidIPFSHash(hash: string): boolean {
  if (!hash) return false;
  if (hash.includes("Placeholder")) return false;
  if (hash.startsWith("local:")) return true;
  if (hash.startsWith("/uploads/")) return true;
  if (hash.startsWith("Qm") && hash.length >= 46) return true;
  if (hash.startsWith("bafy")) return true;
  if (hash.startsWith("http")) return true;
  return false;
}
