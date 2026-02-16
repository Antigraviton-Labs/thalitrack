import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { User, Mess, Subscription } from '@/lib/models';
import { successResponse, errorResponse, paginatedResponse } from '@/lib/utils';

// GET /api/admin/users - List all users
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const role = searchParams.get('role');
        const search = searchParams.get('search');

        // Build query
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const query: any = {};

        if (role) {
            query.role = role;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }

        const total = await User.countDocuments(query);

        const users = await User.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        // Get subscription status for mess owners
        const usersWithSubscription = await Promise.all(
            users.map(async (user) => {
                if (user.role === 'messOwner') {
                    const subscription = await Subscription.findOne({ messOwnerId: user._id });
                    const mess = await Mess.findOne({ ownerId: user._id }).select('name isApproved');
                    return {
                        ...user,
                        subscription: subscription ? {
                            status: subscription.status,
                            trialEndsAt: subscription.trialEndsAt,
                        } : null,
                        mess: mess ? {
                            name: mess.name,
                            isApproved: mess.isApproved,
                        } : null,
                    };
                }
                return user;
            })
        );

        return paginatedResponse(usersWithSubscription, { page, limit, total });
    } catch (error) {
        console.error('Admin get users error:', error);
        return errorResponse('Failed to fetch users', 500);
    }
}
