import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { Suggestion, Mess } from '@/lib/models';
import { successResponse, errorResponse, paginatedResponse } from '@/lib/utils';
import { createSuggestionSchema, validateInput, objectIdSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/messes/[id]/suggestions - Get suggestions for a mess
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

        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const userId = request.headers.get('x-user-id');
        const userRole = request.headers.get('x-user-role');

        // Check if user is mess owner (can see all suggestions)
        const mess = await Mess.findById(id);
        const isOwner = mess && userId && mess.ownerId.toString() === userId;
        const isAdmin = userRole === 'admin';

        // Build query - show all to owner/admin, only public to others
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const query: any = { messId: id };
        if (!isOwner && !isAdmin) {
            query.isPublic = true;
        }

        const total = await Suggestion.countDocuments(query);

        const suggestions = await Suggestion.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('userId', 'name')
            .lean();

        return paginatedResponse(suggestions, { page, limit, total });
    } catch (error) {
        console.error('Get suggestions error:', error);
        return errorResponse('Failed to fetch suggestions', 500);
    }
}

// POST /api/messes/[id]/suggestions - Create a suggestion
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
            return errorResponse('Only students can post suggestions', 403);
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

        // Validate input
        const validation = validateInput(createSuggestionSchema, body);
        if (!validation.success) {
            return errorResponse(validation.errors.join(', '), 400);
        }

        const { content, isPublic } = validation.data;

        // Create suggestion
        const suggestion = await Suggestion.create({
            userId,
            messId: id,
            content,
            isPublic,
        });

        await suggestion.populate('userId', 'name');

        return successResponse(suggestion, 'Suggestion submitted successfully', 201);
    } catch (error) {
        console.error('Create suggestion error:', error);
        return errorResponse('Failed to submit suggestion', 500);
    }
}
