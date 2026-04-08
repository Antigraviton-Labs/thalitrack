import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import User from '@/lib/models/User';
import { successResponse, errorResponse } from '@/lib/utils';

export async function POST(request: NextRequest) {
    try {
        await connectDB();
        const { email, resetToken, newPassword } = await request.json();

        if (!email || !resetToken || !newPassword) {
            return errorResponse('Missing required fields', 400);
        }

        if (newPassword.length < 8) {
            return errorResponse('Password must be at least 8 characters', 400);
        }

        const user = await User.findOne({
            email,
            resetPasswordToken: resetToken,
            resetPasswordExpires: { $gt: new Date() }
        });

        if (!user) {
            return errorResponse('Invalid or expired password reset session. Please request a new OTP.', 400);
        }

        // Hash the new password manually (can't rely on pre-save hook with findOneAndUpdate)
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await User.findOneAndUpdate(
            { _id: user._id },
            {
                $set: { password: hashedPassword },
                $unset: { resetPasswordToken: '', resetPasswordExpires: '' },
            }
        );

        return successResponse(null, 'Password updated successfully.', 200);

    } catch (error) {
        console.error('Reset password error:', error);
        return errorResponse('Internal server error', 500);
    }
}
