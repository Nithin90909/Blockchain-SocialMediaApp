import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Shield, Hash, FileCheck, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import PostCard from "../components/PostCard";
import { postAPI } from "../services/api";
import { formatDate } from "../lib/utils";

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setVerifyResult(null);
    postAPI
      .getById(id)
      .then((res) => setPost(res.data.post))
      .catch((err) => console.error("Post load error:", err))
      .finally(() => setLoading(false));
  }, [id]);

  function handleUpdate() {
    if (!id) return;
    postAPI.getById(id).then((res) => setPost(res.data.post)).catch(() => {});
  }

  async function handleVerify() {
    if (!id) return;
    setVerifying(true);
    try {
      const res = await postAPI.verify(id);
      setVerifyResult(res.data);
    } catch {
      setVerifyResult({ verified: false, reason: "Verification request failed" });
    }
    setVerifying(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!post) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Post not found.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 pb-20 lg:pb-6">
      <Button variant="ghost" size="sm" className="gap-2" asChild>
        <Link to="/dashboard">
          <ArrowLeft className="h-4 w-4" />
          Back to feed
        </Link>
      </Button>

      <PostCard post={post} onUpdate={handleUpdate} />

      {/* Blockchain Verification Details */}
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Blockchain Verification
          </h3>
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2 text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Hash className="h-3 w-3" /> Transaction Hash
              </span>
              <span className="font-mono text-right truncate max-w-[220px]">
                {post.blockchainTxHash || "Not on-chain yet"}
              </span>
            </div>
            <Separator />
            <div className="flex items-start justify-between gap-2 text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <FileCheck className="h-3 w-3" /> Content Hash
              </span>
              <span className="font-mono text-right truncate max-w-[220px]">
                {post.contentHash || "N/A"}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Credibility Score</span>
              {post.credibilityScore >= 0 ? (
                <Badge
                  variant={post.credibilityScore >= 70 ? "outline" : post.credibilityScore >= 40 ? "secondary" : "destructive"}
                  className={`text-xs ${post.credibilityScore >= 70 ? "border-green-500/30 text-green-600" : ""}`}
                >
                  {post.credibilityScore}/100
                </Badge>
              ) : (
                <span className="text-muted-foreground">Pending analysis</span>
              )}
            </div>
            <Separator />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Visibility</span>
              <span className="capitalize">{post.visibility}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Created</span>
              <span>{formatDate(post.createdAt)}</span>
            </div>
            {post.mediaIPFSHash && (
              <>
                <Separator />
                <div className="flex items-start justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">Media IPFS Hash</span>
                  <span className="font-mono text-right truncate max-w-[220px]">{post.mediaIPFSHash}</span>
                </div>
              </>
            )}

            <Separator />

            {/* Verify on Blockchain button */}
            <div className="pt-1">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={handleVerify}
                disabled={verifying}
              >
                {verifying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4" />
                )}
                {verifying ? "Verifying..." : "Verify on Blockchain"}
              </Button>
            </div>

            {verifyResult && (
              <div className={`mt-2 rounded-md border p-3 ${
                verifyResult.verified
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-red-500/30 bg-red-500/5"
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {verifyResult.verified ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${
                    verifyResult.verified ? "text-green-600" : "text-red-600"
                  }`}>
                    {verifyResult.verified
                      ? "Content Integrity Verified"
                      : "Verification Failed"}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {verifyResult.blockchainVerified !== undefined && (
                    <p className="flex items-center gap-1.5">
                      {verifyResult.blockchainVerified ? (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-500" />
                      )}
                      Blockchain hash match: {verifyResult.blockchainVerified ? "Passed" : "Failed"}
                    </p>
                  )}
                  {verifyResult.contentIntact !== undefined && (
                    <p className="flex items-center gap-1.5">
                      {verifyResult.contentIntact ? (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-500" />
                      )}
                      Content unchanged since creation: {verifyResult.contentIntact ? "Yes" : "No"}
                    </p>
                  )}
                  {verifyResult.reason && (
                    <p>{verifyResult.reason}</p>
                  )}
                  {verifyResult.timestamp && (
                    <p>Recorded at: {formatDate(verifyResult.timestamp)}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
