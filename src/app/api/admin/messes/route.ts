import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Mess } from '@/lib/models';
import { successResponse, errorResponse, paginatedResponse, requireAdmin } from '@/lib/utils';

// GET /api/admin/messes - List all messes (including pending approval)
export async function GET(request: NextRequest) {
    try {
        // Verify admin access directly from JWT
        const adminCheck = requireAdmin(request);
        if (adminCheck instanceof NextResponse) return adminCheck;

        await connectDB();

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const isApproved = searchParams.get('isApproved');
        const search = searchParams.get('search');

        // Build query
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const query: any = {};

        if (isApproved !== null && isApproved !== undefined) {
            query.isApproved = isApproved === 'true';
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { address: { $regex: search, $options: 'i' } },
            ];
        }

        const total = await Mess.countDocuments(query);

        const messes = await Mess.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('ownerId', 'name email phone')
            .lean();

        return paginatedResponse(messes, { page, limit, total });
    } catch (error) {
        console.error('Admin get messes error:', error);
        return errorResponse('Failed to fetch messes', 500);
    }
}
