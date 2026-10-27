import mongoose, { Schema, Document } from "mongoose";

export type VoteStatus = "pending" | "fake" | "legitimate";

export interface IReport extends Document {
  postId: mongoose.Types.ObjectId;
  reporterId: mongoose.Types.ObjectId;
  reason: string;
  blockchainReportId: string;
  voteStatus: VoteStatus;
  votes: {
    userId: mongoose.Types.ObjectId;
    vote: "fake" | "legitimate";
  }[];
  createdAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    postId: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      required: true,
      maxlength: 500,
    },
    blockchainReportId: {
      type: String,
      default: "",
    },
    voteStatus: {
      type: String,
      enum: ["pending", "fake", "legitimate"],
      default: "pending",
    },
    votes: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        vote: { type: String, enum: ["fake", "legitimate"], required: true },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model<IReport>("Report", ReportSchema);
