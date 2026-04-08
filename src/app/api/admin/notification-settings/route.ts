import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { NotificationSettings } from '@/lib/models';
import { successResponse, errorResponse, requireAdmin } from '@/lib/utils';

// GET /api/admin/notification-settings
// Fetch the current notification settings (singleton document)
export async function GET(request: NextRequest) {
    try {
        const adminCheck = requireAdmin(request);
        if (adminCheck instanceof NextResponse) return adminCheck;

        await connectDB();

        // Find the singleton settings document, or return defaults
        let settings = await NotificationSettings.findOne().lean();

        if (!settings) {
            // Create default settings if none exist
            settings = await NotificationSettings.create({
                mode: 'manual',
                cronEnabled: false,
                cronInterval: 24,
                channels: ['email'],
                language: 'english',
            });
            settings = settings.toJSON();
        }

        return successResponse(settings);
    } catch (error) {
        console.error('Get notification settings error:', error);
        return errorResponse('Failed to fetch notification settings', 500);
    }
}

// PUT /api/admin/notification-settings
// Update notification settings
export async function PUT(request: NextRequest) {
    try {
        const adminCheck = requireAdmin(request);
        if (adminCheck instanceof NextResponse) return adminCheck;

        await connectDB();

        const body = await request.json();
        const { mode, cronEnabled, cronInterval, channels, language } = body;

        // Validate
        if (mode && !['manual', 'automated'].includes(mode)) {
            return errorResponse('Invalid mode. Must be "manual" or "automated"');
        }
        if (language && !['english', 'hindi', 'marathi'].includes(language)) {
            return errorResponse('Invalid language');
        }
        if (channels) {
            const validChannels = ['email', 'whatsapp', 'sms'];
            for (const ch of channels) {
                if (!validChannels.includes(ch)) {
                    return errorResponse(`Invalid channel: ${ch}`);
                }
            }
        }
        if (cronInterval !== undefined && (cronInterval < 1 || cronInterval > 168)) {
            return errorResponse('Cron interval must be between 1 and 168 hours');
        }

        // Upsert the singleton settings document
        const updateData: any = {};
        if (mode !== undefined) updateData.mode = mode;
        if (cronEnabled !== undefined) updateData.cronEnabled = cronEnabled;
        if (cronInterval !== undefined) updateData.cronInterval = cronInterval;
        if (channels !== undefined) updateData.channels = channels;
        if (language !== undefined) updateData.language = language;

        const settings = await NotificationSettings.findOneAndUpdate(
            {}, // Match the singleton
            { $set: updateData },
            { new: true, upsert: true, lean: true }
        );

        return successResponse(settings, 'Settings updated successfully');
    } catch (error) {
        console.error('Update notification settings error:', error);
        return errorResponse('Failed to update notification settings', 500);
    }
}
