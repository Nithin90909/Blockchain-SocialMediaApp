import { Response, NextFunction } from "express";
import Report from "../models/Report";
import Post from "../models/Post";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";
import { reportPostOnChain, castVoteOnChain } from "../services/blockchain.service";

export async function createReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const { postId, reason } = req.body;

    const post = await Post.findById(postId);
    if (!post) throw new AppError("Post not found", 404);

    const existingReport = await Report.findOne({ postId, reporterId: userId });
    if (existingReport) throw new AppError("Already reported this post", 409);

    const report = await Report.create({
      postId,
      reporterId: userId,
      reason,
    });

    const txHash = await reportPostOnChain(
      report._id.toString(),
      postId,
      reason
    );

    if (txHash) {
      report.blockchainReportId = txHash;
      await report.save();
    }

    res.status(201).json({ report });
  } catch (error) {
    next(error);
  }
}

export async function voteOnReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const { reportId } = req.params;
    const { vote } = req.body;

    if (!["fake", "legitimate"].includes(vote)) {
      throw new AppError("Invalid vote. Must be 'fake' or 'legitimate'", 400);
    }

    const report = await Report.findById(reportId);
    if (!report) throw new AppError("Report not found", 404);
    if (report.voteStatus !== "pending") throw new AppError("Report already resolved", 400);

    const alreadyVoted = report.votes.some((v) => v.userId.toString() === userId);
    if (alreadyVoted) throw new AppError("Already voted on this report", 409);

    report.votes.push({ userId: userId as any, vote });

    const voteTypeNum = vote === "fake" ? 1 : 2;
    await castVoteOnChain(reportId, voteTypeNum);

    const fakeVotes = report.votes.filter((v) => v.vote === "fake").length;
    const legitimateVotes = report.votes.filter((v) => v.vote === "legitimate").length;

    if (report.votes.length >= 5) {
      report.voteStatus = fakeVotes > legitimateVotes ? "fake" : "legitimate";

      if (report.voteStatus === "fake") {
        const post = await Post.findById(report.postId);
        if (post) {
          post.credibilityScore = 0;
          post.isVerified = false;
          await post.save();
        }
      }
    }

    await report.save();

    res.json({ report });
  } catch (error) {
    next(error);
  }
}

export async function getReports(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status as string;

    const filter: any = {};
    if (status) filter.voteStatus = status;

    const reports = await Report.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("postId", "content userId credibilityScore")
      .populate("reporterId", "username");

    const total = await Report.countDocuments(filter);

    res.json({
      reports,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
}
