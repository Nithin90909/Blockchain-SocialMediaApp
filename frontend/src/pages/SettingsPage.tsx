import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Settings, Shield, Eye, MessageSquare, UserX, Sun, Moon, Monitor } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { settingsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useModal } from "../context/ModalContext";
import { useTheme } from "../context/ThemeContext";

interface PrivacySettings {
  defaultVisibility: string;
  whoCanMessage: string;
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  showReputationScore: boolean;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { showAlert, showConfirm } = useModal();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await settingsAPI.get();
      setSettings(res.data.privacySettings);
      setBlockedUsers(res.data.blockedUsers || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  async function saveSettings(updated: Partial<PrivacySettings>) {
    setSaving(true);
    try {
      const res = await settingsAPI.update(updated);
      setSettings(res.data.privacySettings);
      await showAlert({
        title: "Settings Saved",
        message: "Your privacy settings have been updated.",
        variant: "success",
      });
    } catch {
      await showAlert({
        title: "Save Failed",
        message: "Could not save settings. Please try again.",
        variant: "error",
      });
    }
    setSaving(false);
  }

  async function handleUnblock(userId: string, username: string) {
    const confirmed = await showConfirm({
      title: "Unblock User",
      message: `Are you sure you want to unblock ${username}?`,
      confirmLabel: "Unblock",
    });
    if (!confirmed) return;
    try {
      const res = await settingsAPI.block(userId);
      setBlockedUsers(res.data.blockedUsers || []);
    } catch {}
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Settings
        </h2>
        <p className="text-sm text-muted-foreground">Manage your privacy and account preferences.</p>
      </div>

      {/* Appearance / Theme */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {resolvedTheme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Choose a theme for the application. "System" follows your device preference.
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "light" as const, label: "Light", icon: <Sun className="h-3.5 w-3.5 mr-1.5" /> },
              { value: "dark" as const, label: "Dark", icon: <Moon className="h-3.5 w-3.5 mr-1.5" /> },
              { value: "system" as const, label: "System", icon: <Monitor className="h-3.5 w-3.5 mr-1.5" /> },
            ].map(({ value, label, icon }) => (
              <Button
                key={value}
                variant={theme === value ? "default" : "outline"}
                size="sm"
                className="flex items-center"
                onClick={() => setTheme(value)}
              >
                {icon}
                {label}
              </Button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Currently using <span className="font-medium capitalize">{resolvedTheme}</span> theme
            {theme === "system" && " (based on system preference)"}
          </p>
        </CardContent>
      </Card>

      {/* Default Post Visibility */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Default Post Visibility
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground mb-3">
            Choose the default visibility for new posts. You can still change it per post.
          </p>
          <div className="flex flex-wrap gap-2">
            {["public", "followers", "private"].map((v) => (
              <Button
                key={v}
                variant={settings.defaultVisibility === v ? "default" : "outline"}
                size="sm"
                className="capitalize"
                onClick={() => saveSettings({ defaultVisibility: v })}
                disabled={saving}
              >
                {v}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Who Can Message */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Who Can Message You
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground mb-3">
            Control who is allowed to send you direct messages.
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "everyone", label: "Everyone" },
              { value: "followers", label: "Followers Only" },
              { value: "nobody", label: "Nobody" },
            ].map(({ value, label }) => (
              <Button
                key={value}
                variant={settings.whoCanMessage === value ? "default" : "outline"}
                size="sm"
                onClick={() => saveSettings({ whoCanMessage: value })}
                disabled={saving}
              >
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Privacy Toggles */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Privacy Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              key: "showOnlineStatus" as const,
              label: "Show Online Status",
              desc: "Let others see when you're online",
            },
            {
              key: "showLastSeen" as const,
              label: "Show Last Seen",
              desc: "Let others see when you were last active",
            },
            {
              key: "showReputationScore" as const,
              label: "Show Reputation Score",
              desc: "Display your blockchain reputation score on your profile",
            },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <button
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  settings[key] ? "bg-primary" : "bg-muted"
                }`}
                onClick={() => saveSettings({ [key]: !settings[key] })}
                disabled={saving}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                    settings[key] ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Blocked Users */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <UserX className="h-4 w-4" />
            Blocked Users
            {blockedUsers.length > 0 && (
              <Badge variant="secondary" className="text-xs">{blockedUsers.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {blockedUsers.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              You haven't blocked anyone. You can block users from their profile page.
            </p>
          ) : (
            <div className="space-y-2">
              {blockedUsers.map((u: any) => {
                const uid = u._id || u.id;
                return (
                  <div key={uid} className="flex items-center justify-between rounded-md border p-2">
                    <Link to={`/profile/${uid}`} className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-[10px]">
                          {(u.username || "?").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{u.username}</span>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleUnblock(uid, u.username)}
                    >
                      Unblock
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Username</span>
            <span className="font-medium">{user?.username}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{user?.email}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Wallet</span>
            <span className="font-mono truncate max-w-[180px]">{user?.walletAddress}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Reputation Score</span>
            <Badge variant="outline" className="text-xs">{user?.reputationScore}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
