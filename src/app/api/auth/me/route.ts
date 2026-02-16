import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { User, Subscription, Mess } from '@/lib/models';
import { successResponse, errorResponse } from '@/lib/utils';

export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const userId = request.headers.get('x-user-id');

        if (!userId) {
            return errorResponse('Authentication required', 401);
        }

        const user = await User.findById(userId);
        if (!user) {
            return errorResponse('User not found', 404);
        }

        // Get additional data based on role
        let additionalData: Record<string, unknown> = {};

        if (user.role === 'messOwner') {
            const [subscription, mess] = await Promise.all([
                Subscription.findOne({ messOwnerId: userId }),
                Mess.findOne({ ownerId: userId }),
            ]);

            additionalData = {
                subscription: subscription ? {
                    status: subscription.status,
                    trialEndsAt: subscription.trialEndsAt,
                    currentPeriodEnd: subscription.currentPeriodEnd,
                    isValid: subscription.status === 'active' ||
                        (subscription.status === 'trial' && new Date() < subscription.trialEndsAt),
                } : null,
                mess: mess ? {
                    id: mess._id,
                    name: mess.name,
                    isApproved: mess.isApproved,
                    isActive: mess.isActive,
                } : null,
            };
        }

        return successResponse({
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                role: user.role,
                createdAt: user.createdAt,
            },
            ...additionalData,
        });
    } catch (error) {
        console.error('Get user error:', error);
        return errorResponse('Failed to get user data', 500);
    }
}
