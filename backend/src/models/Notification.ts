import mongoose, { Schema, Document } from "mongoose";

export type NotificationType = "like" | "comment" | "follow" | "report" | "mention" | "message";

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  fromUserId: mongoose.Types.ObjectId;
  type: NotificationType;
  referenceId: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fromUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["like", "comment", "follow", "report", "mention", "message"],
      required: true,
    },
    referenceId: {
      type: String,
      default: "",
    },
    message: {
      type: String,
      required: true,
      maxlength: 200,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<INotification>("Notification", NotificationSchema);
