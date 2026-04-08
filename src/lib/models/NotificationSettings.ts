import mongoose, { Schema, Model, Document } from 'mongoose';

export interface INotificationSettings {
    mode: 'manual' | 'automated';
    cronEnabled: boolean;
    cronInterval: number; // hours
    channels: ('email' | 'whatsapp' | 'sms')[];
    language: 'english' | 'hindi' | 'marathi';
}

export interface INotificationSettingsDocument extends INotificationSettings, Document {}

const notificationSettingsSchema = new Schema<INotificationSettingsDocument>(
    {
        mode: {
            type: String,
            enum: ['manual', 'automated'],
            default: 'manual',
        },
        cronEnabled: {
            type: Boolean,
            default: false,
        },
        cronInterval: {
            type: Number,
            default: 24,
            min: 1,
            max: 168, // max 1 week
        },
        channels: {
            type: [String],
            enum: ['email', 'whatsapp', 'sms'],
            default: ['email'],
        },
        language: {
            type: String,
            enum: ['english', 'hindi', 'marathi'],
            default: 'english',
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

// Singleton pattern — only one document should exist
const NotificationSettings: Model<INotificationSettingsDocument> =
    mongoose.models.NotificationSettings ||
    mongoose.model<INotificationSettingsDocument>('NotificationSettings', notificationSettingsSchema);

export default NotificationSettings;
