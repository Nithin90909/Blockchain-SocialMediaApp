import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Separator } from "../components/ui/separator";
import PostCard from "../components/PostCard";
import { userAPI, postAPI, messageAPI, settingsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useModal } from "../context/ModalContext";
import { truncateAddress, formatDate } from "../lib/utils";
import { Edit2, Check, X, Camera, MessageSquare, Ban } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser, updateUser } = useAuth();
  const { showAlert, showConfirm } = useModal();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBio, setEditBio] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwner = currentUser?.id === id;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setEditing(false);

    Promise.all([
      userAPI.getProfile(id),
      postAPI.getUserPosts(id),
    ]).then(([profileRes, postsRes]) => {
      const u = profileRes.data.user;
      setProfile(u);
      setPosts(postsRes.data.posts || []);
      setEditBio(u.bio || "");
      setEditUsername(u.username || "");
      const followers = u.followers || [];
      setIsFollowing(
        followers.some((f: any) => {
          const fId = f._id || f.id || f;
          return fId?.toString() === currentUser?.id;
        })
      );
    }).catch((err) => {
      console.error("Profile load error:", err);
    }).finally(() => setLoading(false));
  }, [id, currentUser?.id]);

  async function handleFollow() {
    if (!id) return;
    try {
      const res = await userAPI.follow(id);
      setIsFollowing(res.data.following);
      const profileRes = await userAPI.getProfile(id);
      setProfile(profileRes.data.user);
    } catch (err) {
      console.error("Follow error:", err);
    }
  }

  async function handleSaveProfile() {
    try {
      const formData = new FormData();
      formData.append("bio", editBio);
      formData.append("username", editUsername);
      const res = await userAPI.updateProfile(formData);
      setProfile(res.data.user);
      updateUser({ bio: editBio, username: editUsername });
      setEditing(false);
    } catch {
      showAlert({
        title: "Update Failed",
        message: "Could not update your profile. Please try again.",
        variant: "error",
      });
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("avatar", file);
    try {
      const res = await userAPI.updateProfile(formData);
      setProfile(res.data.user);
      updateUser({ avatar: res.data.user.avatar });
    } catch {}
  }

  function handleStartChat() {
    if (!id) return;
    navigate(`/chat/${id}`);
  }

  async function handleBlockUser() {
    if (!id) return;
    const confirmed = await showConfirm({
      title: "Block User",
      message: `Are you sure you want to block ${profile?.username}? They won't be able to see your posts or send you messages.`,
      confirmLabel: "Block",
      destructive: true,
      variant: "warning",
    });
    if (!confirmed) return;
    try {
      await settingsAPI.block(id);
      await showAlert({
        title: "User Blocked",
        message: `${profile?.username} has been blocked.`,
        variant: "success",
      });
    } catch {
      await showAlert({ title: "Failed", message: "Could not block user.", variant: "error" });
    }
  }

  function refreshPosts() {
    if (!id) return;
    postAPI.getUserPosts(id).then((res) => setPosts(res.data.posts || [])).catch(() => {});
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          User not found.
        </CardContent>
      </Card>
    );
  }

  const profileId = profile._id || profile.id;

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="relative">
              <Avatar className="h-20 w-20">
                {profile.avatar && (
                  <AvatarImage src={profile.avatar} />
                )}
                <AvatarFallback className="text-2xl">
                  {(profile.username || "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {isOwner && (
                <>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                  <button
                    className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
            <div className="flex-1 text-center sm:text-left">
              {editing ? (
                <div className="space-y-2">
                  <Input
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    placeholder="Username"
                    className="h-8"
                  />
                  <Textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Write a bio..."
                    className="min-h-[60px] text-sm"
                    maxLength={300}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveProfile}>
                      <Check className="h-4 w-4 mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                      <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <h2 className="text-xl font-semibold">{profile.username}</h2>
                    <Badge variant="secondary" className="text-xs">Score: {profile.reputationScore}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{truncateAddress(profile.walletAddress || "")}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{profile.bio || "No bio yet."}</p>
                  {profile.createdAt && (
                    <p className="mt-1 text-xs text-muted-foreground">Joined {formatDate(profile.createdAt)}</p>
                  )}
                </>
              )}

              <div className="mt-4 flex items-center gap-6 justify-center sm:justify-start">
                <div className="text-center">
                  <p className="text-sm font-semibold">{posts.length}</p>
                  <p className="text-xs text-muted-foreground">Posts</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold">{profile.followers?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Followers</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold">{profile.following?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Following</p>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                {isOwner ? (
                  !editing && (
                    <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                      <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                      Edit Profile
                    </Button>
                  )
                ) : (
                  <>
                    <Button
                      variant={isFollowing ? "outline" : "default"}
                      size="sm"
                      onClick={handleFollow}
                    >
                      {isFollowing ? "Unfollow" : "Follow"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleStartChat}>
                      <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                      Message
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={handleBlockUser}>
                      <Ban className="h-3.5 w-3.5 mr-1.5" />
                      Block
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Posts ({posts.length})
        </h3>
        {posts.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No posts yet.
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <PostCard key={post._id} post={post} onUpdate={refreshPosts} />
          ))
        )}
      </div>
    </div>
  );
}
