import mongoose, { Schema, Document } from "mongoose";

export interface IPrivacySettings {
  defaultVisibility: "public" | "followers" | "private";
  whoCanMessage: "everyone" | "followers" | "nobody";
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  showReputationScore: boolean;
}

export interface IUser extends Document {
  walletAddress: string;
  username: string;
  email: string;
  password: string;
  bio: string;
  avatarIPFSHash: string;
  avatar: string;
  reputationScore: number;
  followers: mongoose.Types.ObjectId[];
  following: mongoose.Types.ObjectId[];
  blockedUsers: mongoose.Types.ObjectId[];
  isOnline: boolean;
  lastSeen: Date;
  privacySettings: IPrivacySettings;
  createdAt: Date;
  updatedAt: Date;
}

const PrivacySettingsSchema = new Schema(
  {
    defaultVisibility: {
      type: String,
      enum: ["public", "followers", "private"],
      default: "public",
    },
    whoCanMessage: {
      type: String,
      enum: ["everyone", "followers", "nobody"],
      default: "everyone",
    },
    showOnlineStatus: { type: Boolean, default: true },
    showLastSeen: { type: Boolean, default: true },
    showReputationScore: { type: Boolean, default: true },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 32,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    bio: {
      type: String,
      default: "",
      maxlength: 300,
    },
    avatarIPFSHash: {
      type: String,
      default: "",
    },
    avatar: {
      type: String,
      default: "",
    },
    reputationScore: {
      type: Number,
      default: 100,
      min: 0,
      max: 1000,
    },
    followers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: Schema.Types.ObjectId, ref: "User" }],
    blockedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    privacySettings: {
      type: PrivacySettingsSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", UserSchema);
