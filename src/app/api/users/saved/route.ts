import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/lib/models/User';
import Mess from '@/lib/models/Mess';
import { successResponse, errorResponse } from '@/lib/utils';

// GET /api/users/saved - Get user's saved messes
export async function GET(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id');

        if (!userId) {
            return errorResponse('Authentication required', 401);
        }

        await connectDB();

        const user = await User.findById(userId).populate({
            path: 'savedMesses',
            model: Mess,
            select: 'name description address monthlyPrice messType averageRating totalRatings photos isApproved',
        });

        if (!user) {
            return errorResponse('User not found', 404);
        }

        return successResponse(user.savedMesses || [], 'Saved messes retrieved successfully');
    } catch (error) {
        console.error('Get saved messes error:', error);
        return errorResponse('Failed to get saved messes', 500);
    }
}

// POST /api/users/saved - Add mess to saved list
export async function POST(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id');

        if (!userId) {
            return errorResponse('Authentication required', 401);
        }

        await connectDB();

        const body = await request.json();
        const { messId } = body;

        if (!messId) {
            return errorResponse('Mess ID is required', 400);
        }

        // Check if mess exists
        const mess = await Mess.findById(messId);
        if (!mess) {
            return errorResponse('Mess not found', 404);
        }

        // Add to saved if not already saved
        const user = await User.findByIdAndUpdate(
            userId,
            { $addToSet: { savedMesses: messId } },
            { new: true }
        );

        if (!user) {
            return errorResponse('User not found', 404);
        }

        return successResponse({ saved: true }, 'Mess saved successfully');
    } catch (error) {
        console.error('Save mess error:', error);
        return errorResponse('Failed to save mess', 500);
    }
}

// DELETE /api/users/saved - Remove mess from saved list
export async function DELETE(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id');

        if (!userId) {
            return errorResponse('Authentication required', 401);
        }

        await connectDB();

        const { searchParams } = new URL(request.url);
        const messId = searchParams.get('messId');

        if (!messId) {
            return errorResponse('Mess ID is required', 400);
        }

        // Remove from saved
        const user = await User.findByIdAndUpdate(
            userId,
            { $pull: { savedMesses: messId } },
            { new: true }
        );

        if (!user) {
            return errorResponse('User not found', 404);
        }

        return successResponse({ saved: false }, 'Mess removed from saved');
    } catch (error) {
        console.error('Unsave mess error:', error);
        return errorResponse('Failed to remove saved mess', 500);
    }
}
