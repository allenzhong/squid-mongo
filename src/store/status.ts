import mongoose, { Schema } from "mongoose";

export interface IStatus extends Document {
  height: number;
  identifier: string;
}

export const StatusSchema = new Schema(
  {
    height: { type: Number, required: true },
    identifier: { type: String, required: true },
  },
  {
    collection: "status",
    timestamps: true,
  }
);

StatusSchema.index({ identifier: 1, height: 1 }, { unique: true });

export const StatusModel = mongoose.model<IStatus>("status", StatusSchema);
