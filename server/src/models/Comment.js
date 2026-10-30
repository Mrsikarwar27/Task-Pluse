import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: [true, 'Comment cannot be empty.'],
      trim: true,
      maxlength: [2000, 'Comment cannot exceed 2000 characters.'],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

commentSchema.index({ task: 1, createdAt: 1 });

export const Comment = mongoose.model('Comment', commentSchema);
