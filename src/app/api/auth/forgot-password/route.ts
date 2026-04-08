import { NextRequest } from 'next/server';
import nodemailer from 'nodemailer';
import { connectDB } from '@/lib/db';
import User from '@/lib/models/User';
import { successResponse, errorResponse } from '@/lib/utils';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    try {
        await connectDB();
        const { email } = await request.json();

        if (!email) {
            return errorResponse('Email is required', 400);
        }

        const user = await User.findOne({ email });

        if (!user) {
            return errorResponse('No account found with this email address.', 404);
        }

        // Generate a 6 digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Expire in 10 minutes
        const expires = new Date(Date.now() + 10 * 60 * 1000);

        // Use findOneAndUpdate to avoid password validation issues (password has select: false)
        await User.findOneAndUpdate(
            { email },
            { resetPasswordOtp: otp, resetPasswordExpires: expires }
        );

        if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || '587'),
                secure: process.env.SMTP_PORT === '465',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });

            await transporter.sendMail({
                from: process.env.EMAIL_FROM || '"ThaliTrack" <noreply@thalitrack.com>',
                to: email,
                subject: 'Password Reset OTP - ThaliTrack',
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                        <h2 style="color: #E8861A;">Password Reset Request</h2>
                        <p>You requested to reset your password. Use the following OTP to verify your identity.</p>
                        <h1 style="background: #FDF3E7; padding: 15px; border-radius: 5px; text-align: center; font-size: 32px; letter-spacing: 5px; color: #1A1208;">${otp}</h1>
                        <p>This code will expire in 10 minutes.</p>
                        <p>If you did not request this, please ignore this email.</p>
                    </div>
                `
            });
        } else {
            console.log(`[OTP GENERATED] Email: ${email} | OTP: ${otp}`);
        }

        return successResponse(null, 'If the email exists, an OTP has been sent.', 200);

    } catch (error) {
        console.error('Forgot password error:', error);
        return errorResponse('Internal server error', 500);
    }
}
