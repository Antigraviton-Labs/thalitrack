import { sendEmail } from './email';

/* ─── Predefined Messages ─── */
export const PREDEFINED_MESSAGES = {
    english:
        'Your mess menu has not been updated in the last 24 hours. Please update your Regular Thali menu to keep students informed.',
    hindi:
        'Aapne pichle 24 ghanto me apna mess menu update nahi kiya hai. Kripya Regular Thali ka menu update kare.',
    marathi:
        'आपण मागील 24 तासांत मेनू अपडेट केलेला नाही. कृपया Regular Thali मेनू अपडेट करा.',
};

/* ─── Types ─── */
export interface NotificationRecipient {
    _id: string;
    messName: string;
    ownerName: string;
    ownerEmail: string;
    ownerPhone?: string;
    contactWhatsApp?: string;
}

export interface NotificationResult {
    messId: string;
    messName: string;
    email: { sent: boolean; error?: string };
    whatsapp: { sent: boolean; error?: string };
    sms: { sent: boolean; error?: string };
}

/* ─── Email HTML Template ─── */
function getMenuUpdateEmailTemplate(ownerName: string, messName: string, message: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .message-box { background: white; border-left: 4px solid #f59e0b; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Menu Update Reminder</h1>
          <p>ThaliTrack Admin Notification</p>
        </div>
        <div class="content">
          <h2>Hi ${ownerName},</h2>
          <p>This is a reminder regarding your mess: <strong>${messName}</strong></p>
          <div class="message-box">
            <p>${message}</p>
          </div>
          <p>Updating your menu regularly helps students make informed decisions and increases your mess visibility.</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" class="button">Update Menu Now</a>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ThaliTrack. All rights reserved.</p>
          <p>This is an automated message from ThaliTrack admin.</p>
        </div>
      </div>
    </body>
    </html>
    `;
}

/* ─── Send Email Notification ─── */
export async function sendEmailNotification(
    recipient: NotificationRecipient,
    message: string
): Promise<{ sent: boolean; error?: string }> {
    try {
        const html = getMenuUpdateEmailTemplate(recipient.ownerName, recipient.messName, message);
        const success = await sendEmail({
            to: recipient.ownerEmail,
            subject: 'Update Your Mess Menu - ThaliTrack',
            html,
            text: `Hi ${recipient.ownerName}, ${message}`,
        });
        return { sent: success };
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Email send failed';
        console.error(`Email failed for ${recipient.ownerEmail}:`, msg);
        return { sent: false, error: msg };
    }
}

/* ─── Send WhatsApp Notification ─── */
export async function sendWhatsAppNotification(
    recipient: NotificationRecipient,
    message: string
): Promise<{ sent: boolean; error?: string }> {
    const phone = recipient.contactWhatsApp || recipient.ownerPhone;
    if (!phone) {
        return { sent: false, error: 'No WhatsApp number available' };
    }

    // Check if Twilio credentials are configured
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_FROM; // e.g. 'whatsapp:+14155238886'

    if (!accountSid || !authToken || !fromNumber) {
        console.warn(`⚠️ Twilio WhatsApp not configured — skipping WhatsApp for ${recipient.messName}`);
        return { sent: false, error: 'WhatsApp API not configured (Twilio credentials missing)' };
    }

    try {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
        const body = new URLSearchParams({
            From: fromNumber,
            To: `whatsapp:+91${phone}`,
            Body: `Hi ${recipient.ownerName} (${recipient.messName}),\n\n${message}\n\n- ThaliTrack Admin`,
        });

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        });

        if (response.ok) {
            return { sent: true };
        }
        const err = await response.text();
        return { sent: false, error: `Twilio error: ${response.status} - ${err}` };
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'WhatsApp send failed';
        console.error(`WhatsApp failed for ${phone}:`, msg);
        return { sent: false, error: msg };
    }
}

/* ─── Send SMS Notification ─── */
export async function sendSMSNotification(
    recipient: NotificationRecipient,
    message: string
): Promise<{ sent: boolean; error?: string }> {
    const phone = recipient.ownerPhone;
    if (!phone) {
        return { sent: false, error: 'No phone number available' };
    }

    // Check if Twilio SMS or Fast2SMS credentials are configured
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_SMS_FROM;

    // Try Twilio first
    if (accountSid && authToken && fromNumber) {
        try {
            const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
            const body = new URLSearchParams({
                From: fromNumber,
                To: `+91${phone}`,
                Body: `Hi ${recipient.ownerName}, ${message} - ThaliTrack`,
            });

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: body.toString(),
            });

            if (response.ok) {
                return { sent: true };
            }
            const err = await response.text();
            return { sent: false, error: `Twilio SMS error: ${response.status} - ${err}` };
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'SMS send failed';
            return { sent: false, error: msg };
        }
    }

    // Try Fast2SMS as fallback
    const fast2smsKey = process.env.FAST2SMS_API_KEY;
    if (fast2smsKey) {
        try {
            const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
                method: 'POST',
                headers: {
                    'authorization': fast2smsKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    route: 'q',
                    message: `Hi ${recipient.ownerName}, ${message} - ThaliTrack`,
                    language: 'english',
                    numbers: phone,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                return { sent: data.return === true, error: data.return ? undefined : 'Fast2SMS delivery failed' };
            }
            return { sent: false, error: `Fast2SMS error: ${response.status}` };
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Fast2SMS failed';
            return { sent: false, error: msg };
        }
    }

    console.warn(`⚠️ SMS not configured — skipping SMS for ${recipient.messName}`);
    return { sent: false, error: 'SMS API not configured (Twilio/Fast2SMS credentials missing)' };
}

/* ─── Send To All Channels ─── */
export async function sendNotificationToRecipient(
    recipient: NotificationRecipient,
    message: string,
    channels: ('email' | 'whatsapp' | 'sms')[]
): Promise<NotificationResult> {
    const result: NotificationResult = {
        messId: recipient._id,
        messName: recipient.messName,
        email: { sent: false },
        whatsapp: { sent: false },
        sms: { sent: false },
    };

    const promises: Promise<void>[] = [];

    if (channels.includes('email')) {
        promises.push(
            sendEmailNotification(recipient, message).then(r => { result.email = r; })
        );
    }
    if (channels.includes('whatsapp')) {
        promises.push(
            sendWhatsAppNotification(recipient, message).then(r => { result.whatsapp = r; })
        );
    }
    if (channels.includes('sms')) {
        promises.push(
            sendSMSNotification(recipient, message).then(r => { result.sms = r; })
        );
    }

    await Promise.allSettled(promises);
    return result;
}
