import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Suggestion from '@/lib/models/Suggestion';
import Mess from '@/lib/models/Mess';
import { successResponse, errorResponse } from '@/lib/utils';

// DELETE /api/suggestions/[id] - Soft-delete a suggestion (owner only)
export async function DELETE(
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

        // Find the suggestion
        const suggestion = await Suggestion.findById(id);
        if (!suggestion) {
            return errorResponse('Suggestion not found', 404);
        }

        // Already soft-deleted
        if (suggestion.deletedAt) {
            return errorResponse('Suggestion already deleted', 404);
        }

        // Find owner's mess
        const mess = await Mess.findOne({ ownerId: userId });
        if (!mess) {
            return errorResponse('You do not own a mess', 403);
        }

        // Verify suggestion belongs to owner's mess
        if (!suggestion.messId || suggestion.messId.toString() !== mess._id.toString()) {
            return errorResponse('You can only delete suggestions for your own mess', 403);
        }

        // Soft delete
        suggestion.deletedAt = new Date();
        await suggestion.save();

        return successResponse(null, 'Suggestion deleted successfully');
    } catch (error) {
        console.error('Delete suggestion error:', error);
        return errorResponse('Failed to delete suggestion', 500);
    }
}
