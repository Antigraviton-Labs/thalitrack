import mongoose, { Schema, Model, Document } from 'mongoose';
import { ISuggestion } from '@/types';

export interface ISuggestionDocument extends Omit<ISuggestion, '_id'>, Document { }

const suggestionSchema = new Schema<ISuggestionDocument>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User ID is required'],
            index: true,
        },
        messId: {
            type: Schema.Types.ObjectId,
            ref: 'Mess',
            index: true,
            // Not required - can be a general suggestion
        },
        content: {
            type: String,
            required: [true, 'Content is required'],
            trim: true,
            minlength: [10, 'Suggestion must be at least 10 characters'],
            maxlength: [1000, 'Suggestion cannot exceed 1000 characters'],
        },
        isPublic: {
            type: Boolean,
            default: true,
        },
        likes: {
            type: [Schema.Types.ObjectId],
            ref: 'User',
            default: [],
        },
        dislikes: {
            type: [Schema.Types.ObjectId],
            ref: 'User',
            default: [],
        },
        likesCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        dislikesCount: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    {
        timestamps: true,
        toJSON: {
            transform: (_, ret) => {
                delete ret.__v;
                return ret;
            },
        },
    }
);

// Indexes for common queries
suggestionSchema.index({ messId: 1, createdAt: -1 });
suggestionSchema.index({ userId: 1, createdAt: -1 });
suggestionSchema.index({ likesCount: -1 }); // For sorting by most liked
suggestionSchema.index({ createdAt: -1 }); // For recent suggestions

const Suggestion: Model<ISuggestionDocument> =
    mongoose.models.Suggestion ||
    mongoose.model<ISuggestionDocument>('Suggestion', suggestionSchema);

export default Suggestion;

