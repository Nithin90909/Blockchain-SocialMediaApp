import { useState, useRef } from "react";
import { ImagePlus, Globe, Users, Lock, BarChart3, X, Plus } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { postAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useModal } from "../context/ModalContext";
import { Avatar, AvatarFallback } from "./ui/avatar";

interface CreatePostProps {
  onPostCreated?: () => void;
}

const visibilityOptions = [
  { value: "public", label: "Public", icon: Globe },
  { value: "followers", label: "Followers", icon: Users },
  { value: "private", label: "Private", icon: Lock },
] as const;

export default function CreatePost({ onPostCreated }: CreatePostProps) {
  const { user } = useAuth();
  const { showAlert } = useModal();
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<string>("public");
  const [media, setMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollDuration, setPollDuration] = useState("24");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMedia(file);
    const reader = new FileReader();
    reader.onloadend = () => setMediaPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function clearMedia() {
    setMedia(null);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function addPollOption() {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, ""]);
    }
  }

  function removePollOption(index: number) {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  }

  function updatePollOption(index: number, value: string) {
    const updated = [...pollOptions];
    updated[index] = value;
    setPollOptions(updated);
  }

  function clearPoll() {
    setShowPoll(false);
    setPollQuestion("");
    setPollOptions(["", ""]);
    setPollDuration("24");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("content", content);
      formData.append("visibility", visibility);
      if (media) formData.append("media", media);

      if (showPoll && pollQuestion.trim()) {
        const validOptions = pollOptions.filter((o) => o.trim());
        if (validOptions.length >= 2) {
          formData.append("pollQuestion", pollQuestion);
          formData.append("pollOptions", JSON.stringify(validOptions));
          formData.append("pollDuration", pollDuration);
        }
      }

      await postAPI.create(formData);
      setContent("");
      clearMedia();
      clearPoll();
      onPostCreated?.();
    } catch {
      showAlert({
        title: "Post Failed",
        message: "Something went wrong while creating your post. Please try again.",
        variant: "error",
      });
    }

    setSubmitting(false);
  }

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <form onSubmit={handleSubmit}>
          <div className="flex gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="text-xs">{user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                placeholder="What's on your mind?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[80px] resize-none border-0 p-0 focus-visible:ring-0 text-sm"
                maxLength={5000}
              />
              {mediaPreview && (
                <div className="relative mt-3 overflow-hidden rounded-lg border">
                  <img src={mediaPreview} alt="Preview" className="max-h-60 w-full object-cover" />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={clearMedia}
                  >
                    Remove
                  </Button>
                </div>
              )}

              {showPoll && (
                <div className="mt-3 rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Create Poll</span>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={clearPoll}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Ask a question..."
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    className="h-8 text-xs"
                    maxLength={500}
                  />
                  {pollOptions.map((opt, i) => (
                    <div key={i} className="flex gap-1.5">
                      <Input
                        placeholder={`Option ${i + 1}`}
                        value={opt}
                        onChange={(e) => updatePollOption(i, e.target.value)}
                        className="h-8 text-xs flex-1"
                        maxLength={200}
                      />
                      {pollOptions.length > 2 && (
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removePollOption(i)}>
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 6 && (
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addPollOption}>
                      <Plus className="h-3 w-3" /> Add option
                    </Button>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">Duration:</span>
                    <select
                      value={pollDuration}
                      onChange={(e) => setPollDuration(e.target.value)}
                      className="h-7 rounded border bg-background px-2 text-xs"
                    >
                      <option value="1">1 hour</option>
                      <option value="6">6 hours</option>
                      <option value="12">12 hours</option>
                      <option value="24">1 day</option>
                      <option value="72">3 days</option>
                      <option value="168">7 days</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/mp4"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <ImagePlus className="h-4 w-4 mr-1.5" />
                    Media
                  </Button>
                  <Button
                    type="button"
                    variant={showPoll ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setShowPoll(!showPoll)}
                  >
                    <BarChart3 className="h-4 w-4 mr-1.5" />
                    Poll
                  </Button>
                  <div className="flex items-center rounded-md border">
                    {visibilityOptions.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        className={`flex items-center gap-1 px-2 py-1 text-xs transition-colors ${
                          visibility === value
                            ? "bg-secondary text-secondary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        onClick={() => setVisibility(value)}
                        title={label}
                      >
                        <Icon className="h-3 w-3" />
                        <span className="hidden sm:inline">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <Button type="submit" size="sm" disabled={!content.trim() || submitting}>
                  {submitting ? "Posting..." : "Post"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
