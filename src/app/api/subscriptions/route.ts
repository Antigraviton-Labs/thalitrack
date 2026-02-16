import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { Subscription, User, Mess } from '@/lib/models';
import { successResponse, errorResponse } from '@/lib/utils';
import { createSubscription, createCustomer, getSubscription, mapRazorpayStatus } from '@/lib/services/razorpay';

// GET /api/subscriptions - Get current user's subscription
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const userId = request.headers.get('x-user-id');
        const userRole = request.headers.get('x-user-role');

        if (!userId) {
            return errorResponse('Authentication required', 401);
        }

        if (userRole !== 'messOwner') {
            return errorResponse('Only mess owners have subscriptions', 403);
        }

        const subscription = await Subscription.findOne({ messOwnerId: userId });
        if (!subscription) {
            return errorResponse('Subscription not found', 404);
        }

        // If has razorpay subscription, sync status
        if (subscription.razorpaySubscriptionId) {
            try {
                const razorpaySub = await getSubscription(subscription.razorpaySubscriptionId);
                const newStatus = mapRazorpayStatus(razorpaySub.status);

                if (subscription.status !== newStatus) {
                    subscription.status = newStatus;
                    if (razorpaySub.current_start) {
                        subscription.currentPeriodStart = new Date(razorpaySub.current_start * 1000);
                    }
                    if (razorpaySub.current_end) {
                        subscription.currentPeriodEnd = new Date(razorpaySub.current_end * 1000);
                    }
                    await subscription.save();
                }
            } catch {
                // Ignore razorpay errors, return cached data
            }
        }

        const now = new Date();
        const isValid =
            subscription.status === 'active' ||
            (subscription.status === 'trial' && now < subscription.trialEndsAt);

        const daysLeft = subscription.status === 'trial'
            ? Math.ceil((subscription.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : subscription.currentPeriodEnd
                ? Math.ceil((subscription.currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                : 0;

        return successResponse({
            status: subscription.status,
            isValid,
            daysLeft: Math.max(0, daysLeft),
            trialEndsAt: subscription.trialEndsAt,
            currentPeriodEnd: subscription.currentPeriodEnd,
            hasPaymentMethod: !!subscription.razorpaySubscriptionId,
        });
    } catch (error) {
        console.error('Get subscription error:', error);
        return errorResponse('Failed to fetch subscription', 500);
    }
}

// POST /api/subscriptions - Create/upgrade subscription
export async function POST(request: NextRequest) {
    try {
        await connectDB();

        const userId = request.headers.get('x-user-id');
        const userRole = request.headers.get('x-user-role');

        if (!userId) {
            return errorResponse('Authentication required', 401);
        }

        if (userRole !== 'messOwner') {
            return errorResponse('Only mess owners can subscribe', 403);
        }

        // Get user details
        const user = await User.findById(userId);
        if (!user) {
            return errorResponse('User not found', 404);
        }

        // Check if mess exists
        const mess = await Mess.findOne({ ownerId: userId });
        if (!mess) {
            return errorResponse('Please create a mess profile first', 400);
        }

        // Get or create subscription
        let subscription = await Subscription.findOne({ messOwnerId: userId });
        if (!subscription) {
            const trialEndsAt = new Date();
            trialEndsAt.setMonth(trialEndsAt.getMonth() + 1);
            subscription = await Subscription.create({
                messOwnerId: userId,
                status: 'trial',
                trialEndsAt,
            });
        }

        // If already has active subscription
        if (subscription.status === 'active' && subscription.razorpaySubscriptionId) {
            return errorResponse('You already have an active subscription', 409);
        }

        // Create Razorpay customer if not exists
        let customerId = subscription.razorpayCustomerId;
        if (!customerId) {
            customerId = await createCustomer(user.email, user.name, user.phone);
            subscription.razorpayCustomerId = customerId;
            await subscription.save();
        }

        // Create Razorpay subscription
        const razorpayResult = await createSubscription(customerId);

        // Update subscription
        subscription.razorpaySubscriptionId = razorpayResult.subscriptionId;
        subscription.status = 'pending';
        await subscription.save();

        return successResponse({
            subscriptionId: razorpayResult.subscriptionId,
            paymentUrl: razorpayResult.shortUrl,
            message: 'Please complete payment using the provided URL',
        });
    } catch (error) {
        console.error('Create subscription error:', error);
        return errorResponse('Failed to create subscription', 500);
    }
}
