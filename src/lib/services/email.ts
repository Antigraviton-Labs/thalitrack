import nodemailer from 'nodemailer';

// Create reusable transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const EMAIL_FROM = process.env.EMAIL_FROM || 'ThaliTrack <noreply@thalitrack.com>';

export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
    try {
        await transporter.sendMail({
            from: EMAIL_FROM,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
        });
        return true;
    } catch (error) {
        console.error('Email send error:', error);
        return false;
    }
}

// Email templates
export function getWelcomeEmailTemplate(name: string, role: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🍽️ Welcome to ThaliTrack!</h1>
        </div>
        <div class="content">
          <h2>Hi ${name}!</h2>
          <p>Thank you for joining ThaliTrack${role === 'messOwner' ? ' as a Mess Owner' : ''}!</p>
          ${role === 'messOwner'
            ? `<p>You have a <strong>1-month free trial</strong> to explore all features. After the trial, continue at just ₹500/month.</p>
               <p>Get started by:</p>
               <ol>
                 <li>Complete your mess profile</li>
                 <li>Upload photos of your mess</li>
                 <li>Add your daily thali menu</li>
               </ol>`
            : `<p>Discover the best mess options near you:</p>
               <ul>
                 <li>Find nearby messes with great food</li>
                 <li>Check daily thali menus</li>
                 <li>Rate and review your experiences</li>
               </ul>`
        }
          <a href="${process.env.NEXT_PUBLIC_APP_URL}" class="button">Get Started</a>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ThaliTrack. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getDailySummaryTemplate(
    messName: string,
    stats: { menuViews: number; messViews: number; newRatings: number }
): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .stats { display: flex; justify-content: space-around; margin: 20px 0; }
        .stat { text-align: center; padding: 15px; background: white; border-radius: 8px; min-width: 100px; }
        .stat-number { font-size: 24px; font-weight: bold; color: #667eea; }
        .stat-label { font-size: 12px; color: #666; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>📊 Daily Summary for ${messName}</h2>
        </div>
        <div class="content">
          <p>Here's how your mess performed today:</p>
          <div class="stats">
            <div class="stat">
              <div class="stat-number">${stats.messViews}</div>
              <div class="stat-label">Mess Views</div>
            </div>
            <div class="stat">
              <div class="stat-number">${stats.menuViews}</div>
              <div class="stat-label">Menu Views</div>
            </div>
            <div class="stat">
              <div class="stat-number">${stats.newRatings}</div>
              <div class="stat-label">New Ratings</div>
            </div>
          </div>
          <p><strong>${stats.messViews + stats.menuViews}</strong> students viewed your mess after seeing the thali menu today!</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ThaliTrack. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getSubscriptionReminderTemplate(
    name: string,
    daysLeft: number
): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>⚠️ Trial Ending Soon</h2>
        </div>
        <div class="content">
          <h3>Hi ${name},</h3>
          <p>Your ThaliTrack free trial ends in <strong>${daysLeft} days</strong>.</p>
          <p>Subscribe now to continue reaching hungry students and growing your business!</p>
          <p><strong>Only ₹500/month</strong> - Cancel anytime.</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription" class="button">Subscribe Now</a>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ThaliTrack. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export default transporter;
