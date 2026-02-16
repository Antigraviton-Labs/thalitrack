import mongoose, { Schema, Model, Document } from 'mongoose';
import { ISubscription } from '@/types';

export interface ISubscriptionDocument extends Omit<ISubscription, '_id'>, Document { }

const subscriptionSchema = new Schema<ISubscriptionDocument>(
    {
        messOwnerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Mess owner ID is required'],
            unique: true,
            index: true,
        },
        razorpaySubscriptionId: {
            type: String,
            sparse: true,
            index: true,
        },
        razorpayCustomerId: {
            type: String,
            sparse: true,
        },
        status: {
            type: String,
            enum: ['trial', 'active', 'cancelled', 'expired', 'pending'],
            default: 'trial',
            index: true,
        },
        trialEndsAt: {
            type: Date,
            required: [true, 'Trial end date is required'],
        },
        currentPeriodStart: {
            type: Date,
        },
        currentPeriodEnd: {
            type: Date,
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

// Method to check if subscription is valid
subscriptionSchema.methods.isValid = function (): boolean {
    const now = new Date();

    if (this.status === 'trial') {
        return now < this.trialEndsAt;
    }

    if (this.status === 'active') {
        return this.currentPeriodEnd ? now < this.currentPeriodEnd : false;
    }

    return false;
};

// Static method to create trial subscription
subscriptionSchema.statics.createTrial = function (messOwnerId: string) {
    const trialEndsAt = new Date();
    trialEndsAt.setMonth(trialEndsAt.getMonth() + 1); // 1 month free trial

    return this.create({
        messOwnerId,
        status: 'trial',
        trialEndsAt,
    });
};

const Subscription: Model<ISubscriptionDocument> =
    mongoose.models.Subscription ||
    mongoose.model<ISubscriptionDocument>('Subscription', subscriptionSchema);

export default Subscription;
