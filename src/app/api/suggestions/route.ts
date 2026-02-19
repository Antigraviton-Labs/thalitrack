import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Suggestion from '@/lib/models/Suggestion';
import User from '@/lib/models/User';
import { successResponse, errorResponse } from '@/lib/utils';

// GET /api/suggestions - Get suggestions
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const sortBy = searchParams.get('sortBy') || 'recent'; // 'recent', 'mostLiked'
        const limit = parseInt(searchParams.get('limit') || '20');
        const page = parseInt(searchParams.get('page') || '1');
        const messId = searchParams.get('messId'); // Optional - filter by mess
        const generalOnly = searchParams.get('general') === 'true'; // Get only general suggestions

        // Build query
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const query: Record<string, any> = { isPublic: true, deletedAt: null };

        if (messId) {
            // Get suggestions for a specific mess
            query.messId = messId;
        } else if (generalOnly) {
            // Only get general suggestions (without valid messId)
            // This handles: missing field, null, empty string, undefined
            query.$or = [
                { messId: { $exists: false } },
                { messId: null },
                { messId: '' },
            ];
        }
        // If no messId and not generalOnly, return ALL public suggestions

        console.log('📊 Suggestions query:', JSON.stringify(query, null, 2));

        // Build sort
        let sort: Record<string, number> = {};
        if (sortBy === 'mostLiked') {
            sort = { likesCount: -1, createdAt: -1 };
        } else {
            sort = { createdAt: -1 };
        }

        const total = await Suggestion.countDocuments(query);

        const suggestions = await Suggestion.find(query)
            .populate({
                path: 'userId',
                model: User,
                select: 'name',
            })
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        // Transform suggestions to include user info
        const transformedSuggestions = suggestions.map((s) => ({
            _id: s._id,
            content: s.content,
            messId: s.messId,
            isPublic: s.isPublic,
            likes: s.likes || [],
            dislikes: s.dislikes || [],
            likesCount: s.likesCount || 0,
            dislikesCount: s.dislikesCount || 0,
            createdAt: s.createdAt,
            user: s.userId ? {
                _id: (s.userId as { _id: string; name: string })._id,
                name: (s.userId as { _id: string; name: string }).name,
            } : null,
        }));

        return successResponse({
            suggestions: transformedSuggestions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        }, 'Suggestions retrieved successfully');
    } catch (error) {
        console.error('Get suggestions error:', error);
        return errorResponse('Failed to get suggestions', 500);
    }
}

// POST /api/suggestions - Create new suggestion
export async function POST(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id');

        if (!userId) {
            return errorResponse('Authentication required', 401);
        }

        await connectDB();

        const body = await request.json();
        const { content, messId, isPublic = true } = body;

        if (!content || content.length < 10) {
            return errorResponse('Suggestion must be at least 10 characters', 400);
        }

        if (content.length > 1000) {
            return errorResponse('Suggestion cannot exceed 1000 characters', 400);
        }

        // Create suggestion - only include messId if it has a value
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const suggestionData: any = {
            userId,
            content: content.trim(),
            isPublic,
            likes: [],
            dislikes: [],
            likesCount: 0,
            dislikesCount: 0,
        };

        // Only add messId if it's a valid value (not empty string, not undefined, not null)
        if (messId && messId.trim()) {
            suggestionData.messId = messId;
        }

        const suggestion = await Suggestion.create(suggestionData);

        // Populate user info
        const populatedSuggestion = await Suggestion.findById(suggestion._id)
            .populate({
                path: 'userId',
                model: User,
                select: 'name',
            })
            .lean();

        return successResponse(populatedSuggestion, 'Suggestion created successfully', 201);
    } catch (error) {
        console.error('Create suggestion error:', error);
        return errorResponse('Failed to create suggestion', 500);
    }
}
