import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/lib/models/User';
import { successResponse, errorResponse } from '@/lib/utils';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    try {
        await connectDB();
        const { email, otp } = await request.json();

        if (!email || !otp) {
            return errorResponse('Email and OTP are required', 400);
        }

        const user = await User.findOne({
            email,
            resetPasswordOtp: otp,
            resetPasswordExpires: { $gt: new Date() }
        });

        if (!user) {
            return errorResponse('Invalid or expired OTP', 400);
        }

        // OTP is valid. Generate a temporary random token for the final password reset step.
        const resetToken = crypto.randomBytes(32).toString('hex');
        
        // Clear the OTP to prevent replay, and store the token for 15 minutes.
        await User.findOneAndUpdate(
            { _id: user._id },
            {
                $unset: { resetPasswordOtp: '' },
                $set: {
                    resetPasswordToken: resetToken,
                    resetPasswordExpires: new Date(Date.now() + 15 * 60 * 1000),
                },
            }
        );

        return successResponse({ resetToken }, 'OTP verified successfully.', 200);

    } catch (error) {
        console.error('Verify OTP error:', error);
        return errorResponse('Internal server error', 500);
    }
}
