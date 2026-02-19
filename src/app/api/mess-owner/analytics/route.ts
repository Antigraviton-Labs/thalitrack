import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { Analytics, Mess } from '@/lib/models';
import { successResponse, errorResponse, getStartOfDay } from '@/lib/utils';

// Helper: generate zero-filled date range array
function generateDateRange(startDate: Date, endDate: Date): string[] {
    const dates: string[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
        dates.push(current.toISOString().slice(0, 10));
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

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

        // Determine period from query params
        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || '7d'; // 'today', '7d', '30d'

        const today = getStartOfDay();
        let startDate: Date;

        switch (period) {
            case 'today':
                startDate = new Date(today);
                break;
            case '30d':
                startDate = new Date(today);
                startDate.setDate(startDate.getDate() - 29);
                break;
            case '7d':
            default:
                startDate = new Date(today);
                startDate.setDate(startDate.getDate() - 6);
                break;
        }

        // Get daily analytics for the period
        const dailyAnalytics = await Analytics.find({
            messId: mess._id.toString(),
            date: { $gte: startDate },
        })
            .sort({ date: 1 })
            .lean();

        // Build analytics map for zero-fill
        const analyticsMap: Record<string, { messViews: number; menuViews: number }> = {};
        for (const a of dailyAnalytics) {
            const key = new Date(a.date).toISOString().slice(0, 10);
            analyticsMap[key] = {
                messViews: a.messViews || 0,
                menuViews: a.menuViews || 0,
            };
        }

        // Generate zero-filled date range
        const dateRange = generateDateRange(startDate, today);
        const daily = dateRange.map((date) => ({
            date,
            messViews: analyticsMap[date]?.messViews || 0,
            menuViews: analyticsMap[date]?.menuViews || 0,
        }));

        // Get monthly totals (always last 30 days for summary stats)
        const last30 = new Date(today);
        last30.setDate(last30.getDate() - 29);

        const monthlyTotals = await Analytics.aggregate([
            {
                $match: {
                    messId: mess._id.toString(),
                    date: { $gte: last30 },
                },
            },
            {
                $group: {
                    _id: null,
                    totalMessViews: { $sum: '$messViews' },
                    totalMenuViews: { $sum: '$menuViews' },
                },
            },
        ]);

        // Calculate thali rating (average of all thalis' averageRating)
        let thaliRating = 0;
        let thaliTotalRatings = 0;
        if (mess.thalis && mess.thalis.length > 0) {
            const ratedThalis = mess.thalis.filter((t: { averageRating: number }) => t.averageRating > 0);
            if (ratedThalis.length > 0) {
                thaliRating = ratedThalis.reduce((sum: number, t: { averageRating: number }) => sum + t.averageRating, 0) / ratedThalis.length;
                thaliRating = Math.round(thaliRating * 10) / 10;
                thaliTotalRatings = ratedThalis.reduce((sum: number, t: { totalRatings: number }) => sum + t.totalRatings, 0);
            }
        }

        return successResponse({
            mess: {
                id: mess._id,
                name: mess.name,
                averageRating: mess.averageRating,
                totalRatings: mess.totalRatings,
                thaliRating,
                thaliTotalRatings,
                viewCount: mess.viewCount,
                isApproved: mess.isApproved,
                status: mess.status || 'open',
                menuEnabled: mess.menuEnabled || 'no',
            },
            daily,
            monthly: {
                messViews: monthlyTotals[0]?.totalMessViews || 0,
                menuViews: monthlyTotals[0]?.totalMenuViews || 0,
                totalViews: (monthlyTotals[0]?.totalMessViews || 0) + (monthlyTotals[0]?.totalMenuViews || 0),
            },
        });
    } catch (error) {
        console.error('Analytics error:', error);
        return errorResponse('Failed to fetch analytics', 500);
    }
}
