import mongoose, { Schema, Document } from "mongoose";

export interface IStory extends Document {
  userId: mongoose.Types.ObjectId;
  mediaIPFSHash: string;
  caption: string;
  bgGradient: string;
  fontStyle: string;
  viewers: mongoose.Types.ObjectId[];
  reactions: {
    userId: mongoose.Types.ObjectId;
    emoji: string;
  }[];
  expiresAt: Date;
  createdAt: Date;
}

const StorySchema = new Schema<IStory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    mediaIPFSHash: {
      type: String,
      default: "",
    },
    caption: {
      type: String,
      default: "",
      maxlength: 500,
    },
    bgGradient: {
      type: String,
      default: "",
    },
    fontStyle: {
      type: String,
      default: "normal",
    },
    viewers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    reactions: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        emoji: { type: String, required: true, maxlength: 10 },
      },
    ],
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
  },
  { timestamps: true }
);

StorySchema.index({ expiresAt: 1 });
StorySchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IStory>("Story", StorySchema);
