import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { successResponse, errorResponse } from '@/lib/utils';
import { objectIdSchema, validateInput } from '@/lib/validations';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/admin/users/[id] - Get user details
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        await connectDB();

        const { id } = await params;

        const idValidation = validateInput(objectIdSchema, id);
        if (!idValidation.success) {
            return errorResponse('Invalid user ID', 400);
        }

        const user = await User.findById(id);
        if (!user) {
            return errorResponse('User not found', 404);
        }

        return successResponse(user);
    } catch (error) {
        console.error('Admin get user error:', error);
        return errorResponse('Failed to fetch user', 500);
    }
}

// PUT /api/admin/users/[id] - Update user (activate/deactivate)
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        await connectDB();

        const { id } = await params;

        const idValidation = validateInput(objectIdSchema, id);
        if (!idValidation.success) {
            return errorResponse('Invalid user ID', 400);
        }

        const body = await request.json();
        const { isActive, role } = body;

        const updateData: Record<string, unknown> = {};
        if (isActive !== undefined) updateData.isActive = isActive;
        if (role && ['student', 'messOwner', 'admin'].includes(role)) {
            updateData.role = role;
        }

        const user = await User.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true }
        );

        if (!user) {
            return errorResponse('User not found', 404);
        }

        return successResponse(user, 'User updated successfully');
    } catch (error) {
        console.error('Admin update user error:', error);
        return errorResponse('Failed to update user', 500);
    }
}

// DELETE /api/admin/users/[id] - Delete user
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        await connectDB();

        const { id } = await params;

        const idValidation = validateInput(objectIdSchema, id);
        if (!idValidation.success) {
            return errorResponse('Invalid user ID', 400);
        }

        const user = await User.findById(id);
        if (!user) {
            return errorResponse('User not found', 404);
        }

        // Prevent deleting admin users
        if (user.role === 'admin') {
            return errorResponse('Cannot delete admin users', 403);
        }

        await User.findByIdAndDelete(id);

        return successResponse(null, 'User deleted successfully');
    } catch (error) {
        console.error('Admin delete user error:', error);
        return errorResponse('Failed to delete user', 500);
    }
}
