import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { moderationAPI } from "../services/api";
import { useModal } from "../context/ModalContext";
import { formatDate } from "../lib/utils";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";

export default function ModerationPage() {
  const { showAlert } = useModal();
  const [reports, setReports] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [votingId, setVotingId] = useState<string | null>(null);

  const fetchReports = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await moderationAPI.getReports(p, statusFilter || undefined);
      setReports(res.data.reports || []);
      setTotalPages(res.data.pagination?.pages || 1);
    } catch (err) {
      console.error("Failed to load reports:", err);
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    setPage(1);
    fetchReports(1);
  }, [fetchReports]);

  async function handleVote(reportId: string, vote: "fake" | "legitimate") {
    setVotingId(reportId);
    try {
      await moderationAPI.vote(reportId, vote);
      await fetchReports(page);
    } catch (err: any) {
      showAlert({
        title: "Vote Failed",
        message: err.response?.data?.error || "Something went wrong while casting your vote.",
        variant: "error",
      });
    }
    setVotingId(null);
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="gap-1">
            <AlertTriangle className="h-3 w-3" /> Pending
          </Badge>
        );
      case "fake":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" /> Fake
          </Badge>
        );
      case "legitimate":
        return (
          <Badge variant="outline" className="border-green-500/30 text-green-600 gap-1">
            <CheckCircle className="h-3 w-3" /> Legitimate
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }

  const filterButtons = [
    { label: "All", value: "" },
    { label: "Pending", value: "pending" },
    { label: "Resolved Fake", value: "fake" },
    { label: "Resolved Legitimate", value: "legitimate" },
  ];

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div>
        <h2 className="text-lg font-semibold">Content Moderation</h2>
        <p className="text-sm text-muted-foreground">
          Review reported content and cast your vote. Reports are resolved after 5 community votes.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {filterButtons.map(({ label, value }) => (
          <Button
            key={value}
            variant={statusFilter === value ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No reports found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const post = report.postId;
            const reporter = report.reporterId;
            const reporterId = reporter?._id || reporter?.id || reporter;
            const postContent = typeof post === "object" ? post.content : null;
            const postId = typeof post === "object" ? post._id : post;
            const fakeVotes = report.votes?.filter((v: any) => v.vote === "fake").length || 0;
            const legitVotes = report.votes?.filter((v: any) => v.vote === "legitimate").length || 0;

            return (
              <Card key={report._id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm font-medium">
                      Report by{" "}
                      <Link to={`/profile/${reporterId}`} className="hover:underline">
                        {reporter?.username || "Unknown"}
                      </Link>
                    </CardTitle>
                    {getStatusBadge(report.voteStatus)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Reason</p>
                    <p className="text-sm">{report.reason}</p>
                  </div>

                  {postContent && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Reported post content</p>
                      <div className="rounded-md border bg-secondary/30 p-3">
                        <p className="text-sm text-foreground/80 line-clamp-4">{postContent}</p>
                        {postId && (
                          <Link to={`/post/${postId}`} className="mt-1 inline-block text-xs text-primary hover:underline">
                            View full post
                          </Link>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span>Total votes: {report.votes?.length || 0}/5</span>
                    <span>Fake: {fakeVotes}</span>
                    <span>Legitimate: {legitVotes}</span>
                    <span>Reported: {formatDate(report.createdAt)}</span>
                  </div>

                  {report.blockchainReportId && (
                    <p className="text-[10px] text-muted-foreground font-mono truncate">
                      On-chain TX: {report.blockchainReportId}
                    </p>
                  )}

                  {report.voteStatus === "pending" && (
                    <>
                      <Separator />
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={votingId === report._id}
                          onClick={() => handleVote(report._id, "fake")}
                        >
                          {votingId === report._id ? "Voting..." : "Mark as Fake"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={votingId === report._id}
                          onClick={() => handleVote(report._id, "legitimate")}
                        >
                          {votingId === report._id ? "Voting..." : "Mark as Legitimate"}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => { setPage(page - 1); fetchReports(page - 1); }}
              >
                Previous
              </Button>
              <span className="flex items-center text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => { setPage(page + 1); fetchReports(page + 1); }}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
