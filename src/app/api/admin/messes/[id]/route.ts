import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Mess, Menu, Rating, Suggestion, Analytics } from '@/lib/models';
import { successResponse, errorResponse, requireAdmin } from '@/lib/utils';
import { objectIdSchema, validateInput } from '@/lib/validations';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/admin/messes/[id] - Get mess details
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        // Verify admin access directly from JWT
        const adminCheck = requireAdmin(request);
        if (adminCheck instanceof NextResponse) return adminCheck;

        await connectDB();

        const { id } = await params;

        const idValidation = validateInput(objectIdSchema, id);
        if (!idValidation.success) {
            return errorResponse('Invalid mess ID', 400);
        }

        const mess = await Mess.findById(id)
            .populate('ownerId', 'name email phone')
            .lean();

        if (!mess) {
            return errorResponse('Mess not found', 404);
        }

        return successResponse(mess);
    } catch (error) {
        console.error('Admin get mess error:', error);
        return errorResponse('Failed to fetch mess', 500);
    }
}

// PUT /api/admin/messes/[id] - Update mess (approve/block)
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        // Verify admin access directly from JWT
        const adminCheck = requireAdmin(request);
        if (adminCheck instanceof NextResponse) return adminCheck;

        await connectDB();

        const { id } = await params;

        const idValidation = validateInput(objectIdSchema, id);
        if (!idValidation.success) {
            return errorResponse('Invalid mess ID', 400);
        }

        const body = await request.json();
        const { isApproved, isActive } = body;

        const updateData: Record<string, unknown> = {};
        if (isApproved !== undefined) updateData.isApproved = isApproved;
        if (isActive !== undefined) updateData.isActive = isActive;

        const mess = await Mess.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true }
        );

        if (!mess) {
            return errorResponse('Mess not found', 404);
        }

        const action = isApproved ? 'approved' : isActive === false ? 'blocked' : 'updated';
        return successResponse(mess, `Mess ${action} successfully`);
    } catch (error) {
        console.error('Admin update mess error:', error);
        return errorResponse('Failed to update mess', 500);
    }
}

// DELETE /api/admin/messes/[id] - Delete mess
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        // Verify admin access directly from JWT
        const adminCheck = requireAdmin(request);
        if (adminCheck instanceof NextResponse) return adminCheck;

        await connectDB();

        const { id } = await params;

        const idValidation = validateInput(objectIdSchema, id);
        if (!idValidation.success) {
            return errorResponse('Invalid mess ID', 400);
        }

        const mess = await Mess.findById(id);
        if (!mess) {
            return errorResponse('Mess not found', 404);
        }

        // Delete related data
        await Promise.all([
            Menu.deleteMany({ messId: id }),
            Rating.deleteMany({ messId: id }),
            Suggestion.deleteMany({ messId: id }),
            Analytics.deleteMany({ messId: id }),
            Mess.findByIdAndDelete(id),
        ]);

        return successResponse(null, 'Mess deleted successfully');
    } catch (error) {
        console.error('Admin delete mess error:', error);
        return errorResponse('Failed to delete mess', 500);
    }
}
