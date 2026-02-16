import mongoose, { Schema, Model, Document } from 'mongoose';
import { IMenu } from '@/types';

export interface IMenuDocument extends Omit<IMenu, '_id'>, Document { }

const menuSchema = new Schema<IMenuDocument>(
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
        items: {
            type: [String],
            required: [true, 'Menu items are required'],
            validate: {
                validator: function (items: string[]) {
                    return items.length > 0 && items.length <= 20;
                },
                message: 'Menu must have 1-20 items',
            },
        },
        description: {
            type: String,
            trim: true,
            maxlength: [500, 'Description cannot exceed 500 characters'],
        },
        thaliPrice: {
            type: Number,
            min: [0, 'Price cannot be negative'],
            max: [10000, 'Price cannot exceed 10000'],
        },
        viewCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        averageRating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },
        totalRatings: {
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

// Compound unique index to ensure one menu per mess per day
menuSchema.index({ messId: 1, date: 1 }, { unique: true });

// Text index for menu item search
menuSchema.index({ items: 'text', description: 'text' });

const Menu: Model<IMenuDocument> =
    mongoose.models.Menu || mongoose.model<IMenuDocument>('Menu', menuSchema);

export default Menu;
