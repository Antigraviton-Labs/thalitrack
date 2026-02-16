import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Suggestion from '@/lib/models/Suggestion';
import { successResponse, errorResponse } from '@/lib/utils';

// POST /api/suggestions/[id]/dislike - Toggle dislike on suggestion
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

        const dislikeIndex = suggestion.dislikes.indexOf(userId);
        const likeIndex = suggestion.likes.indexOf(userId);

        // If already disliked, remove dislike (toggle)
        if (dislikeIndex > -1) {
            suggestion.dislikes.splice(dislikeIndex, 1);
            suggestion.dislikesCount = suggestion.dislikes.length;
        } else {
            // Add dislike
            suggestion.dislikes.push(userId);
            suggestion.dislikesCount = suggestion.dislikes.length;

            // Remove like if exists
            if (likeIndex > -1) {
                suggestion.likes.splice(likeIndex, 1);
                suggestion.likesCount = suggestion.likes.length;
            }
        }

        await suggestion.save();

        return successResponse({
            likesCount: suggestion.likesCount,
            dislikesCount: suggestion.dislikesCount,
            liked: suggestion.likes.includes(userId),
            disliked: suggestion.dislikes.includes(userId),
        }, 'Dislike toggled successfully');
    } catch (error) {
        console.error('Dislike suggestion error:', error);
        return errorResponse('Failed to dislike suggestion', 500);
    }
}
