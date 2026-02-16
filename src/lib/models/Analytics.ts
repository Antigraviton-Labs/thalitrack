import mongoose, { Schema, Model, Document } from 'mongoose';
import { IAnalytics } from '@/types';

export interface IAnalyticsDocument extends Omit<IAnalytics, '_id'>, Document { }

const analyticsSchema = new Schema<IAnalyticsDocument>(
    {
        messId: {
            type: Schema.Types.ObjectId,
            ref: 'Mess',
            required: [true, 'Mess ID is required'],
            index: true,
        },
        date: {
            type: Date,
            required: [true, 'Date is required'],
            index: true,
        },
        messViews: {
            type: Number,
            default: 0,
            min: 0,
        },
        menuViews: {
            type: Number,
            default: 0,
            min: 0,
        },
        uniqueStudents: {
            type: [Schema.Types.ObjectId],
            ref: 'User',
            default: [],
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

// Compound unique index for one record per mess per day
analyticsSchema.index({ messId: 1, date: 1 }, { unique: true });

const Analytics: Model<IAnalyticsDocument> =
    mongoose.models.Analytics ||
    mongoose.model<IAnalyticsDocument>('Analytics', analyticsSchema);

export default Analytics;
