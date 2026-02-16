import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { Analytics, Mess, Rating } from '@/lib/models';
import { successResponse, errorResponse, getStartOfDay } from '@/lib/utils';

// GET /api/mess-owner/analytics - Get mess owner's analytics
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const userId = request.headers.get('x-user-id');

        if (!userId) {
            return errorResponse('Authentication required', 401);
        }

        // Find owner's mess
        const mess = await Mess.findOne({ ownerId: userId });
        if (!mess) {
            return errorResponse('No mess found. Please create a mess first.', 404);
        }

        const today = getStartOfDay();
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);
        const lastMonth = new Date(today);
        lastMonth.setDate(lastMonth.getDate() - 30);

        // Get daily analytics for last 7 days
        const dailyAnalytics = await Analytics.find({
            messId: mess._id,
            date: { $gte: lastWeek },
        })
            .sort({ date: 1 })
            .lean();

        // Get monthly totals
        const monthlyTotals = await Analytics.aggregate([
            {
                $match: {
                    messId: mess._id,
                    date: { $gte: lastMonth },
                },
            },
            {
                $group: {
                    _id: null,
                    totalMessViews: { $sum: '$messViews' },
                    totalMenuViews: { $sum: '$menuViews' },
                    uniqueStudents: { $addToSet: '$uniqueStudents' },
                },
            },
        ]);

        // Get rating stats
        const ratingStats = await Rating.aggregate([
            { $match: { messId: mess._id } },
            {
                $group: {
                    _id: '$type',
                    averageRating: { $avg: '$rating' },
                    totalRatings: { $sum: 1 },
                    distribution: {
                        $push: '$rating',
                    },
                },
            },
        ]);

        // Calculate rating distribution
        const ratingDistribution = ratingStats.reduce((acc, curr) => {
            const distribution = curr.distribution.reduce(
                (d: Record<number, number>, r: number) => {
                    d[r] = (d[r] || 0) + 1;
                    return d;
                },
                { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
            );
            acc[curr._id] = {
                averageRating: Math.round(curr.averageRating * 10) / 10,
                totalRatings: curr.totalRatings,
                distribution,
            };
            return acc;
        }, {} as Record<string, unknown>);

        // Flatten unique students
        const uniqueStudentCount = monthlyTotals[0]?.uniqueStudents
            ? [...new Set(monthlyTotals[0].uniqueStudents.flat())].length
            : 0;

        return successResponse({
            mess: {
                id: mess._id,
                name: mess.name,
                averageRating: mess.averageRating,
                totalRatings: mess.totalRatings,
                viewCount: mess.viewCount,
                isApproved: mess.isApproved,
            },
            daily: dailyAnalytics.map((a) => ({
                date: a.date,
                messViews: a.messViews,
                menuViews: a.menuViews,
                uniqueStudents: a.uniqueStudents?.length || 0,
            })),
            monthly: {
                messViews: monthlyTotals[0]?.totalMessViews || 0,
                menuViews: monthlyTotals[0]?.totalMenuViews || 0,
                uniqueStudents: uniqueStudentCount,
                totalViews: (monthlyTotals[0]?.totalMessViews || 0) + (monthlyTotals[0]?.totalMenuViews || 0),
            },
            ratings: ratingDistribution,
        });
    } catch (error) {
        console.error('Analytics error:', error);
        return errorResponse('Failed to fetch analytics', 500);
    }
}
