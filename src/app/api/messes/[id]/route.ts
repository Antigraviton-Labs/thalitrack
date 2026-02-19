import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { Mess, Menu, Rating, Suggestion, Analytics } from '@/lib/models';
import { successResponse, errorResponse, getStartOfDay } from '@/lib/utils';
import { updateMessSchema, validateInput, objectIdSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/messes/[id] - Get single mess details
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        await connectDB();

        const { id } = await params;

        // Validate ID
        const idValidation = validateInput(objectIdSchema, id);
        if (!idValidation.success) {
            return errorResponse('Invalid mess ID', 400);
        }

        const mess = await Mess.findById(id).lean();
        if (!mess) {
            return errorResponse('Mess not found', 404);
        }

        // Get today's menu
        const today = getStartOfDay();
        const todayMenu = await Menu.findOne({
            messId: id,
            date: { $gte: today },
        }).lean();

        // Get recent suggestions (public only, exclude soft-deleted)
        const suggestions = await Suggestion.find({
            messId: id,
            isPublic: true,
            deletedAt: null,
        })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('userId', 'name')
            .lean();

        // Track view (non-blocking) - always track views, optionally track unique students
        const userId = request.headers.get('x-user-id');

        // Always increment view count for all visitors
        try {
            // Update Analytics collection
            const analyticsUpdate: Record<string, unknown> = {
                $inc: { messViews: 1 },
            };

            await Analytics.findOneAndUpdate(
                { messId: id, date: today },
                analyticsUpdate,
                { upsert: true }
            );

            // Update mess view count directly
            await Mess.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });

            console.log(`📊 View tracked for mess ${id}. User: ${userId || 'anonymous'}`);
        } catch (trackError) {
            console.error('Analytics tracking error:', trackError);
        }

        return successResponse({
            ...mess,
            todayMenu,
            suggestions,
        });
    } catch (error) {
        console.error('Get mess error:', error);
        return errorResponse('Failed to fetch mess details', 500);
    }
}

// PUT /api/messes/[id] - Update mess (owner only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        await connectDB();

        const { id } = await params;
        const userId = request.headers.get('x-user-id');
        const userRole = request.headers.get('x-user-role');

        // Validate ID
        const idValidation = validateInput(objectIdSchema, id);
        if (!idValidation.success) {
            return errorResponse('Invalid mess ID', 400);
        }

        // Find mess and verify ownership
        const mess = await Mess.findById(id);
        if (!mess) {
            return errorResponse('Mess not found', 404);
        }

        if (mess.ownerId.toString() !== userId && userRole !== 'admin') {
            return errorResponse('Not authorized to update this mess', 403);
        }

        const body = await request.json();

        // Validate input
        const validation = validateInput(updateMessSchema, body);
        if (!validation.success) {
            return errorResponse(validation.errors.join(', '), 400);
        }

        const { latitude, longitude, thalis: newThalis, ...updateData } = validation.data;

        // Build update object
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const update: any = { ...updateData };

        if (latitude !== undefined && longitude !== undefined) {
            update.location = {
                type: 'Point',
                coordinates: [longitude, latitude],
            };
        }

        // Handle thalis full-replace with orphaned rating cascade
        if (newThalis !== undefined) {
            // If menuEnabled is 'no', clear thalis
            if (update.menuEnabled === 'no') {
                update.thalis = [];
            } else {
                // Find orphaned thaliIds (old thalis not in new array)
                const oldThaliIds = (mess.thalis || []).map((t: { thaliId: string }) => t.thaliId);
                const newThaliIds = newThalis.map((t: { thaliId: string }) => t.thaliId);
                const orphanedIds = oldThaliIds.filter((id: string) => !newThaliIds.includes(id));

                // Cascade delete ratings for orphaned thalis
                if (orphanedIds.length > 0) {
                    await Rating.deleteMany({ messId: id, type: 'thali', thaliId: { $in: orphanedIds } });
                }

                // Preserve averageRating and totalRatings from existing thalis
                update.thalis = newThalis.map((newT: { thaliId: string; thaliName: string; description?: string; price: number; items: unknown[]; createdAt?: string | Date }) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const existing = (mess.thalis || []).find((old: any) => old.thaliId === newT.thaliId);
                    return {
                        ...newT,
                        averageRating: existing?.averageRating || 0,
                        totalRatings: existing?.totalRatings || 0,
                        createdAt: existing?.createdAt || new Date(), // Preserve or set creation time
                    };
                });
            }
        }

        const updatedMess = await Mess.findByIdAndUpdate(
            id,
            { $set: update },
            { new: true, runValidators: true }
        );

        return successResponse(updatedMess, 'Mess updated successfully');
    } catch (error) {
        console.error('Update mess error:', error);
        return errorResponse('Failed to update mess', 500);
    }
}

// DELETE /api/messes/[id] - Delete mess (owner or admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        await connectDB();

        const { id } = await params;
        const userId = request.headers.get('x-user-id');
        const userRole = request.headers.get('x-user-role');

        // Validate ID
        const idValidation = validateInput(objectIdSchema, id);
        if (!idValidation.success) {
            return errorResponse('Invalid mess ID', 400);
        }

        // Find mess and verify ownership
        const mess = await Mess.findById(id);
        if (!mess) {
            return errorResponse('Mess not found', 404);
        }

        if (mess.ownerId.toString() !== userId && userRole !== 'admin') {
            return errorResponse('Not authorized to delete this mess', 403);
        }

        // Delete related data
        await Promise.all([
            Menu.deleteMany({ messId: id }),
            Rating.deleteMany({ messId: id }),
            Suggestion.deleteMany({ messId: id }),
            Analytics.deleteMany({ messId: id }),
        ]);

        // Delete mess
        await Mess.findByIdAndDelete(id);

        return successResponse(null, 'Mess deleted successfully');
    } catch (error) {
        console.error('Delete mess error:', error);
        return errorResponse('Failed to delete mess', 500);
    }
}
