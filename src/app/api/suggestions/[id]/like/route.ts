import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Suggestion from '@/lib/models/Suggestion';
import { successResponse, errorResponse } from '@/lib/utils';

// POST /api/suggestions/[id]/like - Toggle like on suggestion
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = request.headers.get('x-user-id');

        if (!userId) {
            return errorResponse('Authentication required', 401);
        }

        await connectDB();

        const { id } = await params;

        const suggestion = await Suggestion.findById(id);
        if (!suggestion) {
            return errorResponse('Suggestion not found', 404);
        }

        const likeIndex = suggestion.likes.indexOf(userId);
        const dislikeIndex = suggestion.dislikes.indexOf(userId);

        // If already liked, remove like (toggle)
        if (likeIndex > -1) {
            suggestion.likes.splice(likeIndex, 1);
            suggestion.likesCount = suggestion.likes.length;
        } else {
            // Add like
            suggestion.likes.push(userId);
            suggestion.likesCount = suggestion.likes.length;

            // Remove dislike if exists
            if (dislikeIndex > -1) {
                suggestion.dislikes.splice(dislikeIndex, 1);
                suggestion.dislikesCount = suggestion.dislikes.length;
            }
        }

        await suggestion.save();

        return successResponse({
            likesCount: suggestion.likesCount,
            dislikesCount: suggestion.dislikesCount,
            liked: suggestion.likes.includes(userId),
            disliked: suggestion.dislikes.includes(userId),
        }, 'Like toggled successfully');
    } catch (error) {
        console.error('Like suggestion error:', error);
        return errorResponse('Failed to like suggestion', 500);
    }
}
