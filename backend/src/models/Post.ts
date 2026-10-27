import mongoose, { Schema, Document } from "mongoose";

export type PostVisibility = "public" | "followers" | "private";
export type ReactionType = "like" | "love" | "laugh" | "wow" | "angry" | "sad";
export const REACTION_TYPES: ReactionType[] = ["like", "love", "laugh", "wow", "angry", "sad"];

export interface IReaction {
  userId: mongoose.Types.ObjectId;
  type: ReactionType;
}

export interface IPollOption {
  text: string;
  votes: mongoose.Types.ObjectId[];
}

export interface IPost extends Document {
  userId: mongoose.Types.ObjectId;
  content: string;
  mediaIPFSHash: string;
  blockchainPostId: string;
  blockchainTxHash: string;
  contentHash: string;
  credibilityScore: number;
  visibility: PostVisibility;
  likes: mongoose.Types.ObjectId[];
  reactions: IReaction[];
  comments: {
    userId: mongoose.Types.ObjectId;
    text: string;
    createdAt: Date;
  }[];
  poll?: {
    question: string;
    options: IPollOption[];
    endsAt: Date;
  };
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema = new Schema<IPost>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    mediaIPFSHash: {
      type: String,
      default: "",
    },
    blockchainPostId: {
      type: String,
      default: "",
    },
    blockchainTxHash: {
      type: String,
      default: "",
    },
    contentHash: {
      type: String,
      default: "",
    },
    credibilityScore: {
      type: Number,
      default: -1,
      min: -1,
      max: 100,
    },
    visibility: {
      type: String,
      enum: ["public", "followers", "private"],
      default: "public",
    },
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    reactions: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        type: { type: String, enum: REACTION_TYPES, required: true },
      },
    ],
    comments: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        text: { type: String, required: true, maxlength: 1000 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    poll: {
      type: {
        question: { type: String, required: true, maxlength: 500 },
        options: [
          {
            text: { type: String, required: true, maxlength: 200 },
            votes: [{ type: Schema.Types.ObjectId, ref: "User" }],
          },
        ],
        endsAt: { type: Date, required: true },
      },
      default: undefined,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

PostSchema.index({ createdAt: -1 });
PostSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IPost>("Post", PostSchema);
