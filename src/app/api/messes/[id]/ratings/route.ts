import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { Rating, Mess, Menu } from '@/lib/models';
import { successResponse, errorResponse, getStartOfDay } from '@/lib/utils';
import { rateMessSchema, rateMenuSchema, validateInput, objectIdSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/messes/[id]/ratings - Get ratings for a mess
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        await connectDB();

        const { id } = await params;
        const { searchParams } = new URL(request.url);

        // Validate ID
        const idValidation = validateInput(objectIdSchema, id);
        if (!idValidation.success) {
            return errorResponse('Invalid mess ID', 400);
        }

        const type = searchParams.get('type') as 'mess' | 'menu' | null;
        const limit = parseInt(searchParams.get('limit') || '20');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const query: any = { messId: id };
        if (type) {
            query.type = type;
        }

        const ratings = await Rating.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('userId', 'name')
            .lean();

        // Get aggregated stats
        const stats = await Rating.aggregate([
            { $match: { messId: id } },
            {
                $group: {
                    _id: '$type',
                    averageRating: { $avg: '$rating' },
                    totalRatings: { $sum: 1 },
                },
            },
        ]);

        return successResponse({
            ratings,
            stats: stats.reduce((acc, curr) => {
                acc[curr._id] = {
                    averageRating: Math.round(curr.averageRating * 10) / 10,
                    totalRatings: curr.totalRatings,
                };
                return acc;
            }, {} as Record<string, { averageRating: number; totalRatings: number }>),
        });
    } catch (error) {
        console.error('Get ratings error:', error);
        return errorResponse('Failed to fetch ratings', 500);
    }
}

// POST /api/messes/[id]/ratings - Rate a mess or menu
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        await connectDB();

        const { id } = await params;
        const userId = request.headers.get('x-user-id');
        const userRole = request.headers.get('x-user-role');

        if (!userId) {
            return errorResponse('Authentication required', 401);
        }

        if (userRole !== 'student') {
            return errorResponse('Only students can rate', 403);
        }

        // Validate ID
        const idValidation = validateInput(objectIdSchema, id);
        if (!idValidation.success) {
            return errorResponse('Invalid mess ID', 400);
        }

        // Verify mess exists
        const mess = await Mess.findById(id);
        if (!mess) {
            return errorResponse('Mess not found', 404);
        }

        const body = await request.json();
        const { searchParams } = new URL(request.url);
        const ratingType = searchParams.get('type') as 'mess' | 'menu';

        if (!ratingType || !['mess', 'menu'].includes(ratingType)) {
            return errorResponse('Rating type (mess or menu) is required', 400);
        }

        if (ratingType === 'mess') {
            // Rate the mess
            const validation = validateInput(rateMessSchema, body);
            if (!validation.success) {
                return errorResponse(validation.errors.join(', '), 400);
            }

            const { rating } = validation.data;

            // Check for existing rating (update if exists)
            const existingRating = await Rating.findOne({
                userId,
                messId: id,
                type: 'mess',
            });

            if (existingRating) {
                // Update existing rating
                existingRating.rating = rating;
                await existingRating.save();
            } else {
                // Create new rating
                await Rating.create({
                    userId,
                    messId: id,
                    rating,
                    type: 'mess',
                    date: new Date(),
                });
            }

            // Update mess average rating
            const ratingStats = await Rating.aggregate([
                { $match: { messId: mess._id, type: 'mess' } },
                {
                    $group: {
                        _id: null,
                        averageRating: { $avg: '$rating' },
                        totalRatings: { $sum: 1 },
                    },
                },
            ]);

            if (ratingStats.length > 0) {
                await Mess.findByIdAndUpdate(id, {
                    averageRating: Math.round(ratingStats[0].averageRating * 10) / 10,
                    totalRatings: ratingStats[0].totalRatings,
                });
            }

            return successResponse(
                { rating, type: 'mess' },
                existingRating ? 'Rating updated' : 'Rating submitted'
            );
        } else {
            // Rate the menu
            const validation = validateInput(rateMenuSchema, body);
            if (!validation.success) {
                return errorResponse(validation.errors.join(', '), 400);
            }

            const { menuId, rating } = validation.data;

            // Verify menu exists and belongs to this mess
            const menu = await Menu.findOne({ _id: menuId, messId: id });
            if (!menu) {
                return errorResponse('Menu not found', 404);
            }

            // Check for today's rating (one per day per menu)
            const today = getStartOfDay();
            const existingRating = await Rating.findOne({
                userId,
                menuId,
                date: { $gte: today },
                type: 'menu',
            });

            if (existingRating) {
                return errorResponse('You have already rated this menu today', 409);
            }

            // Create rating
            await Rating.create({
                userId,
                messId: id,
                menuId,
                rating,
                type: 'menu',
                date: new Date(),
            });

            // Update menu average rating
            const ratingStats = await Rating.aggregate([
                { $match: { menuId: menu._id, type: 'menu' } },
                {
                    $group: {
                        _id: null,
                        averageRating: { $avg: '$rating' },
                        totalRatings: { $sum: 1 },
                    },
                },
            ]);

            if (ratingStats.length > 0) {
                await Menu.findByIdAndUpdate(menuId, {
                    averageRating: Math.round(ratingStats[0].averageRating * 10) / 10,
                    totalRatings: ratingStats[0].totalRatings,
                });
            }

            return successResponse(
                { rating, type: 'menu', menuId },
                'Menu rating submitted',
                201
            );
        }
    } catch (error) {
        console.error('Rate error:', error);
        return errorResponse('Failed to submit rating', 500);
    }
}
