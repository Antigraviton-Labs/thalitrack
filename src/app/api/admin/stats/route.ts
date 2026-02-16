import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { User, Mess, Subscription, Rating, Analytics } from '@/lib/models';
import { successResponse, errorResponse, getStartOfDay } from '@/lib/utils';

// GET /api/admin/stats - Get admin dashboard statistics
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const today = getStartOfDay();
        const thisMonth = new Date(today);
        thisMonth.setDate(1);

        // Get counts
        const [
            totalUsers,
            totalStudents,
            totalMessOwners,
            totalMesses,
            approvedMesses,
            pendingMesses,
            activeSubscriptions,
            trialSubscriptions,
            totalRatings,
            todayAnalytics,
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ role: 'student' }),
            User.countDocuments({ role: 'messOwner' }),
            Mess.countDocuments(),
            Mess.countDocuments({ isApproved: true, isActive: true }),
            Mess.countDocuments({ isApproved: false }),
            Subscription.countDocuments({ status: 'active' }),
            Subscription.countDocuments({ status: 'trial' }),
            Rating.countDocuments(),
            Analytics.aggregate([
                { $match: { date: { $gte: today } } },
                {
                    $group: {
                        _id: null,
                        totalMessViews: { $sum: '$messViews' },
                        totalMenuViews: { $sum: '$menuViews' },
                    },
                },
            ]),
        ]);

        // Calculate revenue (active subscriptions * 500)
        const monthlyRevenue = activeSubscriptions * 500;

        // Get recent signups
        const recentUsers = await User.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('name email role createdAt')
            .lean();

        // Get messes pending approval with full details
        const pendingApproval = await Mess.find({ isApproved: false })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('ownerId', 'name email')
            .select('name description address contactPhone contactWhatsApp capacity monthlyPrice messType createdAt')
            .lean();

        // Top rated messes
        const topMesses = await Mess.find({ isApproved: true })
            .sort({ averageRating: -1 })
            .limit(5)
            .select('name averageRating totalRatings viewCount')
            .lean();

        return successResponse({
            overview: {
                totalUsers,
                totalStudents,
                totalMessOwners,
                totalMesses,
                approvedMesses,
                pendingMesses,
                activeSubscriptions,
                trialSubscriptions,
                totalRatings,
                monthlyRevenue,
            },
            today: {
                messViews: todayAnalytics[0]?.totalMessViews || 0,
                menuViews: todayAnalytics[0]?.totalMenuViews || 0,
            },
            recentUsers,
            pendingApproval,
            topMesses,
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        return errorResponse('Failed to fetch statistics', 500);
    }
}
