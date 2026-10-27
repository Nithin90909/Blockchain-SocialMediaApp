import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Separator } from "../components/ui/separator";
import { useAuth } from "../context/AuthContext";
import { useWallet } from "../hooks/useWallet";
import { Wallet } from "lucide-react";

export default function AuthPage() {
  const { login, register } = useAuth();
  const wallet = useWallet();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isLogin) {
        await login(form.email, form.password);
      } else {
        if (!wallet.address) {
          setError("Please connect your wallet first");
          setLoading(false);
          return;
        }
        await register({
          username: form.username,
          email: form.email,
          password: form.password,
          walletAddress: wallet.address,
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || "Something went wrong");
    }

    setLoading(false);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Link to="/" className="mb-8 text-xl font-semibold tracking-tight">
        DecentraSocial
      </Link>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{isLogin ? "Welcome back" : "Create account"}</CardTitle>
          <CardDescription>
            {isLogin
              ? "Sign in to your account"
              : "Register with your wallet to get started"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Wallet</label>
                  {wallet.address ? (
                    <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                      <Wallet className="h-4 w-4 text-green-500" />
                      <span className="truncate">{wallet.address}</span>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={wallet.connect}
                      disabled={wallet.isConnecting}
                    >
                      <Wallet className="h-4 w-4" />
                      {wallet.isConnecting ? "Connecting..." : "Connect MetaMask"}
                    </Button>
                  )}
                  {wallet.error && <p className="mt-1 text-xs text-destructive">{wallet.error}</p>}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Username</label>
                  <Input
                    placeholder="Choose a username"
                    value={form.username}
                    onChange={(e) => updateField("username", e.target.value)}
                    required
                    minLength={3}
                    maxLength={32}
                  />
                </div>
              </>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Password</label>
              <Input
                type="password"
                placeholder="Min 8 characters"
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                required
                minLength={8}
              />
            </div>

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait..." : isLogin ? "Sign in" : "Create account"}
            </Button>
          </form>

          <Separator className="my-6" />

          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="font-medium text-foreground hover:underline"
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
