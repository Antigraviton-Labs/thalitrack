import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Mess } from '@/lib/models';
import { successResponse, errorResponse, requireAdmin } from '@/lib/utils';
import {
    sendNotificationToRecipient,
    PREDEFINED_MESSAGES,
    NotificationRecipient,
    NotificationResult,
} from '@/lib/services/notification';

// POST /api/admin/send-notifications
// Send notifications to inactive mess owners
export async function POST(request: NextRequest) {
    try {
        // Verify admin access
        const adminCheck = requireAdmin(request);
        if (adminCheck instanceof NextResponse) return adminCheck;

        await connectDB();

        const body = await request.json();
        const {
            messIds,
            channels,
            messageType,
            customMessage,
            language,
        } = body;

        // ── Validate input ──
        if (!channels || !Array.isArray(channels) || channels.length === 0) {
            return errorResponse('At least one notification channel is required');
        }

        const validChannels = ['email', 'whatsapp', 'sms'];
        for (const ch of channels) {
            if (!validChannels.includes(ch)) {
                return errorResponse(`Invalid channel: ${ch}`);
            }
        }

        if (messageType === 'custom' && (!customMessage || !customMessage.trim())) {
            return errorResponse('Custom message is required when messageType is "custom"');
        }

        const validLanguages = ['english', 'hindi', 'marathi'];
        if (language && !validLanguages.includes(language)) {
            return errorResponse(`Invalid language: ${language}`);
        }

        // ── Determine message content ──
        const message = messageType === 'custom'
            ? customMessage.trim()
            : PREDEFINED_MESSAGES[language as keyof typeof PREDEFINED_MESSAGES] || PREDEFINED_MESSAGES.english;

        // ── Fetch target messes with owner info ──
        let query: any = { isApproved: true, isActive: true };

        if (messIds !== 'all' && Array.isArray(messIds) && messIds.length > 0) {
            query._id = { $in: messIds };
        }

        const messes = await Mess.find(query)
            .populate('ownerId', 'name email phone')
            .lean();

        if (messes.length === 0) {
            return errorResponse('No messes found to notify');
        }

        // ── Build recipient list ──
        const recipients: NotificationRecipient[] = messes.map((mess: any) => {
            const owner = mess.ownerId && typeof mess.ownerId === 'object'
                ? mess.ownerId
                : null;

            return {
                _id: String(mess._id),
                messName: mess.name,
                ownerName: owner?.name || 'Mess Owner',
                ownerEmail: owner?.email || '',
                ownerPhone: owner?.phone || mess.contactPhone || undefined,
                contactWhatsApp: mess.contactWhatsApp || undefined,
            };
        });

        // ── Send notifications concurrently ──
        const results: NotificationResult[] = await Promise.all(
            recipients.map(recipient =>
                sendNotificationToRecipient(recipient, message, channels)
            )
        );

        // ── Summarize results ──
        const summary = {
            total: results.length,
            email: {
                sent: results.filter(r => r.email.sent).length,
                failed: results.filter(r => channels.includes('email') && !r.email.sent).length,
            },
            whatsapp: {
                sent: results.filter(r => r.whatsapp.sent).length,
                failed: results.filter(r => channels.includes('whatsapp') && !r.whatsapp.sent).length,
            },
            sms: {
                sent: results.filter(r => r.sms.sent).length,
                failed: results.filter(r => channels.includes('sms') && !r.sms.sent).length,
            },
        };

        console.log('📤 Notification summary:', JSON.stringify(summary));

        return successResponse({
            summary,
            results,
        }, `Notifications sent to ${results.length} mess owner(s)`);
    } catch (error) {
        console.error('Admin send notifications error:', error);
        return errorResponse('Failed to send notifications', 500);
    }
}
