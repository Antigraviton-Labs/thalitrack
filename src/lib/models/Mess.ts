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
        foodLicenseUrl: {
            type: String,
            trim: true,
        },
        monthlyPlan: {
            type: String,
            enum: ['yes', 'no'],
            default: 'no',
            required: true,
        },
        monthlyPrice: {
            type: Number,
            default: 0,
            min: [0, 'Price cannot be negative'],
            max: [50000, 'Price cannot exceed 50000'],
        },
        monthlyDescription: {
            type: String,
            trim: true,
            maxlength: [500, 'Monthly description cannot exceed 500 characters'],
        },
        openingTime: {
            type: String,
            required: [true, 'Opening time is required'],
            trim: true,
        },
        closingTime: {
            type: String,
            required: [true, 'Closing time is required'],
            trim: true,
        },
        tiffinService: {
            type: String,
            enum: ['yes', 'no'],
            default: 'no',
            required: true,
        },
        menuEnabled: {
            type: String,
            enum: ['yes', 'no'],
            default: 'no',
            required: true,
        },
        menuItems: {
            type: [{
                dishName: {
                    type: String,
                    required: true,
                    trim: true,
                    maxlength: [100, 'Dish name cannot exceed 100 characters'],
                },
                price: {
                    type: Number,
                    required: true,
                    min: [0, 'Price cannot be negative'],
                    default: 0,
                },
            }],
            default: [],
        },
        thalis: {
            type: [{
                thaliId: {
                    type: String,
                    required: true,
                },
                thaliName: {
                    type: String,
                    required: true,
                    trim: true,
                    maxlength: [100, 'Thali name cannot exceed 100 characters'],
                },
                description: {
                    type: String,
                    trim: true,
                    maxlength: [300, 'Thali description cannot exceed 300 characters'],
                },
                price: {
                    type: Number,
                    required: true,
                    min: [0, 'Price cannot be negative'],
                    max: [10000, 'Price cannot exceed 10000'],
                },
                items: {
                    type: [{
                        itemName: {
                            type: String,
                            required: true,
                            trim: true,
                            maxlength: [100, 'Item name cannot exceed 100 characters'],
                        },
                        description: {
                            type: String,
                            trim: true,
                            maxlength: [200, 'Item description cannot exceed 200 characters'],
                        },
                        price: {
                            type: Number,
                            min: [0, 'Price cannot be negative'],
                            max: [10000, 'Price cannot exceed 10000'],
                        },
                    }],
                    default: [],
                },
                createdAt: {
                    type: Date,
                    default: Date.now,
                },
                updatedAt: {
                    type: Date,
                    default: Date.now,
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
                mealType: {
                    type: String,
                    enum: ['afternoon', 'evening'],
                    default: 'afternoon',
                    // Only used for Regular Thali (index 0)
                },
            }],
            default: [],
        },
        status: {
            type: String,
            enum: ['open', 'closed'],
            default: 'open',
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
messSchema.index({ status: 1, isApproved: 1, isActive: 1 });
messSchema.index({ status: 1, averageRating: -1 });
messSchema.index({ 'thalis.0.price': 1 });

// Force model recompilation in Next.js dev mode so schema changes apply
if (mongoose.models.Mess) {
    delete mongoose.models.Mess;
}
const Mess: Model<IMessDocument> = mongoose.model<IMessDocument>('Mess', messSchema);

export default Mess;
