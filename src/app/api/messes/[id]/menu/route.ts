import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { Menu, Mess, Analytics, Rating } from '@/lib/models';
import { successResponse, errorResponse, getStartOfDay, getEndOfDay } from '@/lib/utils';
import { createMenuSchema, updateMenuSchema, validateInput, objectIdSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/messes/[id]/menu - Get menus for a mess
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

        const date = searchParams.get('date');
        const limit = parseInt(searchParams.get('limit') || '7');

        // Build query
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const query: any = { messId: id };

        if (date) {
            const targetDate = new Date(date);
            query.date = {
                $gte: getStartOfDay(targetDate),
                $lte: getEndOfDay(targetDate),
            };
        }

        const menus = await Menu.find(query)
            .sort({ date: -1 })
            .limit(limit)
            .lean();

        // Track menu view for today's menu
        const userId = request.headers.get('x-user-id');
        const today = getStartOfDay();

        if (userId && menus.length > 0) {
            const todayMenu = menus.find(m => new Date(m.date) >= today);
            if (todayMenu) {
                Menu.findByIdAndUpdate(todayMenu._id, { $inc: { viewCount: 1 } }).catch(console.error);
                Analytics.findOneAndUpdate(
                    { messId: id, date: { $gte: today } },
                    {
                        $inc: { menuViews: 1 },
                        $addToSet: { uniqueStudents: userId },
                    },
                    { upsert: true }
                ).catch(console.error);
            }
        }

        return successResponse(menus);
    } catch (error) {
        console.error('Get menus error:', error);
        return errorResponse('Failed to fetch menus', 500);
    }
}

// POST /api/messes/[id]/menu - Create or update today's menu
export async function POST(request: NextRequest, { params }: RouteParams) {
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

        // Verify ownership
        const mess = await Mess.findById(id);
        if (!mess) {
            return errorResponse('Mess not found', 404);
        }

        if (mess.ownerId.toString() !== userId && userRole !== 'admin') {
            return errorResponse('Not authorized to update menu', 403);
        }

        const body = await request.json();

        // Validate input
        const validation = validateInput(createMenuSchema, body);
        if (!validation.success) {
            return errorResponse(validation.errors.join(', '), 400);
        }

        const { date, items, description, thaliPrice } = validation.data;
        const menuDate = getStartOfDay(new Date(date));

        // Check if menu exists for this date
        const existingMenu = await Menu.findOne({
            messId: id,
            date: menuDate,
        });

        if (existingMenu) {
            // Update existing - reset ratings when menu changes
            const menuChanged = JSON.stringify(existingMenu.items) !== JSON.stringify(items);

            const updateData: Record<string, unknown> = { items, description, thaliPrice };

            if (menuChanged) {
                // Reset ratings when menu items change
                updateData.averageRating = 0;
                updateData.totalRatings = 0;

                // Delete old menu ratings
                await Rating.deleteMany({
                    menuId: existingMenu._id,
                    type: 'menu',
                });
            }

            const updatedMenu = await Menu.findByIdAndUpdate(
                existingMenu._id,
                { $set: updateData },
                { new: true }
            );

            return successResponse(updatedMenu, menuChanged ? 'Menu updated. Ratings have been reset.' : 'Menu updated');
        }

        // Create new menu
        const menu = await Menu.create({
            messId: id,
            date: menuDate,
            items,
            description,
            thaliPrice,
        });

        return successResponse(menu, 'Menu created successfully', 201);
    } catch (error) {
        console.error('Create menu error:', error);
        return errorResponse('Failed to create menu', 500);
    }
}

// PUT /api/messes/[id]/menu - Update existing menu
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        await connectDB();

        const { id } = await params;
        const userId = request.headers.get('x-user-id');
        const userRole = request.headers.get('x-user-role');
        const { searchParams } = new URL(request.url);
        const menuId = searchParams.get('menuId');

        if (!menuId) {
            return errorResponse('Menu ID is required', 400);
        }

        // Validate IDs
        const idValidation = validateInput(objectIdSchema, id);
        const menuIdValidation = validateInput(objectIdSchema, menuId);

        if (!idValidation.success || !menuIdValidation.success) {
            return errorResponse('Invalid ID', 400);
        }

        // Verify ownership
        const mess = await Mess.findById(id);
        if (!mess) {
            return errorResponse('Mess not found', 404);
        }

        if (mess.ownerId.toString() !== userId && userRole !== 'admin') {
            return errorResponse('Not authorized to update menu', 403);
        }

        const body = await request.json();

        // Validate input
        const validation = validateInput(updateMenuSchema, body);
        if (!validation.success) {
            return errorResponse(validation.errors.join(', '), 400);
        }

        const menu = await Menu.findOne({ _id: menuId, messId: id });
        if (!menu) {
            return errorResponse('Menu not found', 404);
        }

        // Check if items changed
        const { items, description, thaliPrice } = validation.data;
        const menuChanged = items && JSON.stringify(menu.items) !== JSON.stringify(items);

        const updateData: Record<string, unknown> = {};
        if (items) updateData.items = items;
        if (description !== undefined) updateData.description = description;
        if (thaliPrice !== undefined) updateData.thaliPrice = thaliPrice;

        if (menuChanged) {
            updateData.averageRating = 0;
            updateData.totalRatings = 0;
            await Rating.deleteMany({ menuId, type: 'menu' });
        }

        const updatedMenu = await Menu.findByIdAndUpdate(
            menuId,
            { $set: updateData },
            { new: true }
        );

        return successResponse(updatedMenu, menuChanged ? 'Menu updated. Ratings have been reset.' : 'Menu updated');
    } catch (error) {
        console.error('Update menu error:', error);
        return errorResponse('Failed to update menu', 500);
    }
}
