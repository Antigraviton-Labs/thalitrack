import mongoose, { Schema, Model, Document } from 'mongoose';
import { IRating } from '@/types';

export interface IRatingDocument extends Omit<IRating, '_id'>, Document { }

const ratingSchema = new Schema<IRatingDocument>(
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
            required: [true, 'Mess ID is required'],
            index: true,
        },
        menuId: {
            type: Schema.Types.ObjectId,
            ref: 'Menu',
            index: true,
        },
        rating: {
            type: Number,
            required: [true, 'Rating is required'],
            min: [1, 'Rating must be at least 1'],
            max: [5, 'Rating cannot exceed 5'],
        },
        type: {
            type: String,
            enum: ['mess', 'menu'],
            required: [true, 'Rating type is required'],
        },
        date: {
            type: Date,
            required: true,
            default: Date.now,
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

// Compound unique index for mess rating (one per user per mess)
ratingSchema.index(
    { userId: 1, messId: 1, type: 1 },
    {
        unique: true,
        partialFilterExpression: { type: 'mess' }
    }
);

// Compound unique index for menu rating (one per user per menu per day)
ratingSchema.index(
    { userId: 1, menuId: 1, date: 1 },
    {
        unique: true,
        partialFilterExpression: { type: 'menu' }
    }
);

// For aggregation queries
ratingSchema.index({ messId: 1, type: 1 });
ratingSchema.index({ menuId: 1 });

const Rating: Model<IRatingDocument> =
    mongoose.models.Rating || mongoose.model<IRatingDocument>('Rating', ratingSchema);

export default Rating;
