import cron from 'node-cron';
import { connectDB } from '@/lib/db';
import { Mess, NotificationSettings } from '@/lib/models';
import {
    sendNotificationToRecipient,
    PREDEFINED_MESSAGES,
    NotificationRecipient
} from '@/lib/services/notification';

let isCronRunning = false;

export async function startCronJobs() {
    if (isCronRunning) return;
    
    // Check every hour to see if we should run according to the configured interval
    // For a real production app, it's better to run it once a day at a specific time (e.g. '0 9 * * *' for 9 AM)
    // Or we respect the cronInterval setting. We'll run every hour and check when the last run was.
    // For simplicity, we just use a schedule that runs every hour and checks.
    
    cron.schedule('0 * * * *', async () => {
        try {
            await connectDB();
            
            const settings: any = await NotificationSettings.findOne().lean();
            if (!settings || settings.mode !== 'automated' || !settings.cronEnabled) {
                console.log('Cron skipped: automated mode is off or not configured');
                return;
            }

            console.log('Running automated inactivity check...');

            // Fetch active and approved messes
            const messes = await Mess.find({ isApproved: true, isActive: true })
                .populate('ownerId', 'name email phone')
                .lean();

            const now = Date.now();
            const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
            const recipients: NotificationRecipient[] = [];

            for (const mess of messes) {
                let regularThali = null;
                if (mess.thalis && mess.thalis.length > 0) {
                    regularThali = mess.thalis.find(
                        (t: any) => t.thaliName === 'Regular Thali'
                    ) || mess.thalis[0];
                }

                let isInactive = false;

                if (!regularThali) {
                    isInactive = true;
                } else {
                    const updatedAt = regularThali.updatedAt
                        ? new Date(regularThali.updatedAt).getTime()
                        : (regularThali.createdAt
                            ? new Date(regularThali.createdAt).getTime()
                            : 0);

                    if (updatedAt === 0 || (now - updatedAt) > TWENTY_FOUR_HOURS) {
                        isInactive = true;
                    }
                }

                if (isInactive) {
                    const owner = mess.ownerId && typeof mess.ownerId === 'object'
                        ? mess.ownerId as any
                        : null;

                    recipients.push({
                        _id: String(mess._id),
                        messName: mess.name,
                        ownerName: owner?.name || 'Mess Owner',
                        ownerEmail: owner?.email || '',
                        ownerPhone: owner?.phone || mess.contactPhone || undefined,
                        contactWhatsApp: mess.contactWhatsApp || undefined,
                    });
                }
            }

            if (recipients.length === 0) {
                console.log('No inactive messes found. Automation check finished.');
                return;
            }

            const message = PREDEFINED_MESSAGES[settings.language as keyof typeof PREDEFINED_MESSAGES] || PREDEFINED_MESSAGES.english;
            const channels = settings.channels || ['email'];

            console.log(`Sending automated notifications to ${recipients.length} inactive messes...`);

            await Promise.all(
                recipients.map(recipient =>
                    sendNotificationToRecipient(recipient, message, channels)
                )
            );

            console.log('Automated notifications sent successfully.');
        } catch (error) {
            console.error('Error running automated cron job:', error);
        }
    });

    isCronRunning = true;
    console.log('Automated notification cron job scheduled.');
}
