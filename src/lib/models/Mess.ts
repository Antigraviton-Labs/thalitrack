import mongoose, { Schema, Model, Document } from 'mongoose';
import { IMess } from '@/types';

export interface IMessDocument extends Omit<IMess, '_id'>, Document { }

const messSchema = new Schema<IMessDocument>(
    {
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Owner ID is required'],
            index: true,
        },
        name: {
            type: String,
            required: [true, 'Mess name is required'],
            trim: true,
            maxlength: [100, 'Name cannot exceed 100 characters'],
        },
        description: {
            type: String,
            trim: true,
            maxlength: [500, 'Description cannot exceed 500 characters'],
        },
        address: {
            type: String,
            required: [true, 'Address is required'],
            trim: true,
            maxlength: [300, 'Address cannot exceed 300 characters'],
        },
        location: {
            type: {
                type: String,
                enum: ['Point'],
                required: true,
                default: 'Point',
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                required: [true, 'Coordinates are required'],
                validate: {
                    validator: function (coords: number[]) {
                        return (
                            coords.length === 2 &&
                            coords[0] >= -180 &&
                            coords[0] <= 180 &&
                            coords[1] >= -90 &&
                            coords[1] <= 90
                        );
                    },
                    message: 'Invalid coordinates',
                },
            },
        },
        contactPhone: {
            type: String,
            required: [true, 'Contact phone is required'],
            trim: true,
            match: [/^[6-9]\d{9}$/, 'Please provide a valid Indian phone number'],
        },
        contactWhatsApp: {
            type: String,
            trim: true,
            match: [/^[6-9]\d{9}$/, 'Please provide a valid Indian phone number'],
        },
        capacity: {
            type: Number,
            required: [true, 'Capacity is required'],
            min: [1, 'Capacity must be at least 1'],
            max: [1000, 'Capacity cannot exceed 1000'],
        },
        monthlyPrice: {
            type: Number,
            required: [true, 'Monthly price is required'],
            min: [0, 'Price cannot be negative'],
            max: [50000, 'Price cannot exceed 50000'],
        },
        messType: {
            type: String,
            enum: ['veg', 'nonVeg', 'both'],
            default: 'veg',
        },
        photos: {
            type: [String],
            default: [],
            validate: {
                validator: function (photos: string[]) {
                    return photos.length <= 10;
                },
                message: 'Maximum 10 photos allowed',
            },
        },
        isApproved: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
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

// 2dsphere index for geospatial queries
messSchema.index({ location: '2dsphere' });

// Text index for search
messSchema.index({ name: 'text', description: 'text', address: 'text' });

// Compound indexes for common queries
messSchema.index({ isApproved: 1, isActive: 1 });
messSchema.index({ averageRating: -1 });
messSchema.index({ monthlyPrice: 1 });

const Mess: Model<IMessDocument> =
    mongoose.models.Mess || mongoose.model<IMessDocument>('Mess', messSchema);

export default Mess;
