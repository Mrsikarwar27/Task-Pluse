import mongoose from 'mongoose';

export const TASK_STATUSES = ['Not Started', 'In Progress', 'Blocked', 'Completed'];
export const TASK_PRIORITIES = ['Low', 'Medium', 'High'];

const resourceSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: [true, 'Resource label is required.'],
      trim: true,
      maxlength: [120, 'Resource label cannot exceed 120 characters.'],
    },
    url: {
      type: String,
      required: [true, 'Resource URL is required.'],
      trim: true,
      maxlength: [2048, 'Resource URL is too long.'],
      validate: {
        validator(value) {
          try {
            const url = new URL(value);
            return url.protocol === 'http:' || url.protocol === 'https:';
          } catch {
            return false;
          }
        },
        message: 'Resource URL must be a valid http or https URL.',
      },
    },
    type: {
      type: String,
      enum: ['link', 'image'],
      default: 'link',
    },
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required.'],
      trim: true,
      maxlength: [160, 'Task title cannot exceed 160 characters.'],
    },
    description: {
      type: String,
      required: [true, 'Task description is required.'],
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters.'],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'A client must be assigned.'],
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    deadline: {
      type: Date,
      required: [true, 'Deadline is required.'],
      index: true,
    },
    estimatedDuration: {
      type: Number,
      required: [true, 'Estimated duration is required.'],
      min: [1, 'Estimated duration must be at least 1 minute.'],
      validate: {
        validator: Number.isInteger,
        message: 'Estimated duration must be a whole number of minutes.',
      },
    },
    priority: {
      type: String,
      enum: TASK_PRIORITIES,
      default: 'Medium',
    },
    status: {
      type: String,
      enum: TASK_STATUSES,
      default: 'Not Started',
      index: true,
    },
    resources: {
      type: [resourceSchema],
      default: [],
      validate: {
        validator: (resources) => resources.length <= 10,
        message: 'A task can have at most 10 resources.',
      },
    },
  },
  { timestamps: true, versionKey: false }
);

taskSchema.index({ assignedTo: 1, status: 1, deadline: 1 });
taskSchema.index({ createdAt: -1 });

export const Task = mongoose.model('Task', taskSchema);
