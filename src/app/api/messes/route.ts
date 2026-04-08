import { NextRequest } from 'next/server';
import { connectDB, isDemoMode } from '@/lib/db';
import { Mess, Subscription, Menu, Analytics } from '@/lib/models';
import { successResponse, errorResponse, paginatedResponse, calculateDistance, getStartOfDay } from '@/lib/utils';
import { createMessSchema, validateInput, searchMessesSchema } from '@/lib/validations';

// Mock data for demo mode
const DEMO_MESSES = [
    {
        _id: 'demo-mess-1',
        ownerId: 'demo-owner-1',
        name: 'Shree Krishna Mess',
        description: 'Authentic homestyle Maharashtrian thali with fresh ingredients daily. Known for our delicious dal and rotis.',
        address: '123 College Road, Pimpri-Chinchwad',
        location: { type: 'Point', coordinates: [73.7617, 18.6280] },
        messType: 'veg',
        dailyThaliPrice: 60,
        monthlyPrice: 1500,
        photos: [],
        averageRating: 4.5,
        totalRatings: 127,
        whatsappNumber: '+919876543210',
        timings: { openTime: '11:00', closeTime: '21:00' },
        isApproved: true,
        isActive: true,
        todayMenu: {
            items: ['Dal Fry', 'Jeera Rice', '3 Rotis', 'Mix Veg Sabzi', 'Salad', 'Pickle'],
            averageRating: 4.3,
        },
    },
    {
        _id: 'demo-mess-2',
        ownerId: 'demo-owner-2',
        name: 'Annapurna Bhojanalaya',
        description: 'Healthy and nutritious vegetarian meals. Special focus on oil-free and diabetic-friendly options available.',
        address: '456 Student Zone, Akurdi',
        location: { type: 'Point', coordinates: [73.7700, 18.6500] },
        messType: 'veg',
        dailyThaliPrice: 55,
        monthlyPrice: 1400,
        photos: [],
        averageRating: 4.2,
        totalRatings: 89,
        whatsappNumber: '+919876543211',
        timings: { openTime: '10:30', closeTime: '20:30' },
        isApproved: true,
        isActive: true,
        todayMenu: {
            items: ['Masoor Dal', 'Plain Rice', '4 Rotis', 'Aloo Gobi', 'Papad', 'Buttermilk'],
            averageRating: 4.1,
        },
    },
    {
        _id: 'demo-mess-3',
        ownerId: 'demo-owner-3',
        name: 'Mumbai Tiffin Center',
        description: 'Mumbai style tiffin service with authentic taste. Special weekend biryani and paneer dishes.',
        address: '789 Main Street, Nigdi',
        location: { type: 'Point', coordinates: [73.7550, 18.6600] },
        messType: 'both',
        dailyThaliPrice: 70,
        monthlyPrice: 1800,
        photos: [],
        averageRating: 4.7,
        totalRatings: 234,
        whatsappNumber: '+919876543212',
        timings: { openTime: '11:30', closeTime: '22:00' },
        isApproved: true,
        isActive: true,
        todayMenu: {
            items: ['Paneer Butter Masala', 'Pulao', '2 Naan', 'Raita', 'Gulab Jamun'],
            averageRating: 4.8,
        },
    },
    {
        _id: 'demo-mess-4',
        ownerId: 'demo-owner-4',
        name: 'Ghar Ka Khana',
        description: 'Simple and tasty home-cooked food just like mother makes. Budget-friendly student meals.',
        address: '321 Campus Lane, Chinchwad',
        location: { type: 'Point', coordinates: [73.7850, 18.6350] },
        messType: 'veg',
        dailyThaliPrice: 50,
        monthlyPrice: 1200,
        photos: [],
        averageRating: 4.0,
        totalRatings: 56,
        whatsappNumber: '+919876543213',
        timings: { openTime: '12:00', closeTime: '21:00' },
        isApproved: true,
        isActive: true,
        todayMenu: {
            items: ['Chana Dal', 'Steamed Rice', '3 Rotis', 'Bhindi Fry', 'Onion Salad'],
            averageRating: 3.9,
        },
    },
];

// GET /api/messes - List messes with search/filter
export async function GET(request: NextRequest) {
    try {
        await connectDB();
        const isDemo = isDemoMode();

        const { searchParams } = new URL(request.url);

        const params = {
            latitude: searchParams.get('latitude') ? parseFloat(searchParams.get('latitude')!) : undefined,
            longitude: searchParams.get('longitude') ? parseFloat(searchParams.get('longitude')!) : undefined,
            maxDistance: searchParams.get('maxDistance') ? parseFloat(searchParams.get('maxDistance')!) : 50,
            query: searchParams.get('query') || undefined,
            minRating: searchParams.get('minRating') ? parseFloat(searchParams.get('minRating')!) : undefined,
            maxPrice: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined,
            messType: searchParams.get('messType') as 'veg' | 'nonVeg' | 'both' | undefined,
            sortBy: (searchParams.get('sortBy') as 'distance' | 'rating' | 'price') || 'rating',
            page: parseInt(searchParams.get('page') || '1'),
            limit: parseInt(searchParams.get('limit') || '10'),
        };

        // Log params for debugging
        console.log('📊 Messes GET params:', JSON.stringify(params, null, 2));

        // Simple validation - skip strict Zod schema for now
        const latitude = params.latitude;
        const longitude = params.longitude;
        const query = params.query;
        const minRating = params.minRating;
        const maxPrice = params.maxPrice;
        const messType = params.messType;
        const sortBy = params.sortBy || 'rating';
        const page = params.page || 1;
        const limit = Math.min(params.limit || 10, 50);

        // DEMO MODE: Return mock data when MongoDB is not connected
        if (isDemo) {
            console.log('📦 Returning demo mock data for messes');

            let filteredMesses = [...DEMO_MESSES];

            // Apply filters
            if (query) {
                const trimmedQ = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(trimmedQ, 'i');
                filteredMesses = filteredMesses.filter(m =>
                    (m.name && m.name.match(regex)) ||
                    (m.description && m.description.match(regex)) ||
                    (m.address && m.address.match(regex)) ||
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (m as any).thalis?.some((thali: any) =>
                        (thali.thaliName && thali.thaliName.match(regex)) ||
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        thali.items?.some((item: any) => item.itemName && item.itemName.match(regex))
                    )
                );
            }
            if (minRating) {
                filteredMesses = filteredMesses.filter(m => m.averageRating >= minRating);
            }
            if (maxPrice) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                filteredMesses = filteredMesses.filter((m: any) => m.thalis?.[0]?.price <= maxPrice);
            }
            if (messType) {
                filteredMesses = filteredMesses.filter(m => m.messType === messType || m.messType === 'both');
            }

            // Add distance if coordinates provided
            if (latitude && longitude) {
                const messesWithDistance = filteredMesses.map(m => ({
                    ...m,
                    distance: calculateDistance(latitude, longitude, m.location.coordinates[1], m.location.coordinates[0]),
                }));

                // Sort by distance
                if (sortBy === 'distance') {
                    messesWithDistance.sort((a, b) => a.distance - b.distance);
                }

                filteredMesses = messesWithDistance as typeof filteredMesses;
            }

            // Sort
            if (sortBy === 'rating') {
                filteredMesses.sort((a, b) => b.averageRating - a.averageRating);
            } else if (sortBy === 'price') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                filteredMesses.sort((a: any, b: any) => (a.thalis?.[0]?.price || Infinity) - (b.thalis?.[0]?.price || Infinity));
            }

            // Pagination
            const start = (page - 1) * limit;
            const paginatedMesses = filteredMesses.slice(start, start + limit);

            return paginatedResponse(paginatedMesses, {
                page,
                limit,
                total: filteredMesses.length,
            });
        }

        // PRODUCTION MODE: Use MongoDB
        // Build query
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const queryFilter: any = {
            isApproved: true,
            isActive: true,
            status: 'open',
            thalis: { $exists: true, $ne: [] },
        };

        // Build sort
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let sort: any = {};
        switch (sortBy) {
            case 'rating':
                sort = { averageRating: -1 };
                break;
            case 'price':
                sort = { "thalis.0.price": 1 };
                // Ensure we don't return messes with missing prices floating to the top
                queryFilter["thalis.0.price"] = { $exists: true, $type: "number" };
                break;
            default:
                sort = { createdAt: -1 };
        }

        // Text search - also search menu items
        if (query) {
            const trimmedQuery = query.trim();
            // First, find messes that have matching menu items
            const matchingMenus = await Menu.find({
                items: { $regex: trimmedQuery, $options: 'i' }
            }).distinct('messId');

            queryFilter.$or = [
                { name: { $regex: trimmedQuery, $options: 'i' } },
                { description: { $regex: trimmedQuery, $options: 'i' } },
                { address: { $regex: trimmedQuery, $options: 'i' } },
                { "thalis.thaliName": { $regex: trimmedQuery, $options: 'i' } },
                { "thalis.items.itemName": { $regex: trimmedQuery, $options: 'i' } },
                { _id: { $in: matchingMenus } }, // Include messes with matching menu items
            ];
        }

        // Rating filter
        if (minRating) {
            queryFilter.averageRating = { $gte: minRating };
        }

        // Price filter
        if (maxPrice) {
            queryFilter["thalis.0.price"] = { $lte: maxPrice };
        }

        // Mess type filter
        if (messType) {
            queryFilter.messType = messType;
        }

        let messes;
        let total;

        // Try geo query first if coordinates provided
        if (latitude && longitude) {
            try {
                // For count, we use $geoWithin since $near is not allowed in countDocuments
                const countGeoFilter = {
                    ...queryFilter,
                    location: {
                        $geoWithin: {
                            // Earth radius in meters is approx 6378100, but $centerSphere expects radians.
                            // Convert maxDistance (km) to radians.
                            $centerSphere: [[longitude, latitude], (params.maxDistance || 50) / 6378.1],
                        },
                    },
                };
                
                total = await Mess.countDocuments(countGeoFilter);

                // If user explicitly requests to sort by price or rating, we cannot use $near
                // because $near forces sorting by distance. Instead, we use $geoWithin to filter by radius
                // and then apply the requested sort order.
                if (sortBy === 'price' || sortBy === 'rating') {
                    messes = await Mess.find(countGeoFilter) // countGeoFilter already uses $geoWithin
                        .sort(sort)
                        .skip((page - 1) * limit)
                        .limit(limit)
                        .lean();
                } else {
                    // Default behavior: sort by distance using $near
                    const geoQueryFilter = {
                        ...queryFilter,
                        location: {
                            $near: {
                                $geometry: {
                                    type: 'Point',
                                    coordinates: [longitude, latitude],
                                },
                                $maxDistance: (params.maxDistance || 50) * 1000, // Convert km to meters
                            },
                        },
                    };

                    messes = await Mess.find(geoQueryFilter)
                        .skip((page - 1) * limit)
                        .limit(limit)
                        .lean();
                }
            } catch (geoError) {
                console.warn('Geo query failed, falling back to regular query:', geoError);
                // Fallback to non-geo query
                total = await Mess.countDocuments(queryFilter);
                messes = await Mess.find(queryFilter)
                    .sort(sort)
                    .skip((page - 1) * limit)
                    .limit(limit)
                    .lean();
            }
        } else {
            // Non-geo query
            total = await Mess.countDocuments(queryFilter);
            messes = await Mess.find(queryFilter)
                .sort(sort)
                .skip((page - 1) * limit)
                .limit(limit)
                .lean();
        }

        // Add distance calculation and today's menu
        const today = getStartOfDay();
        const messesWithDetails = await Promise.all(
            messes.map(async (mess) => {
                const todayMenu = await Menu.findOne({
                    messId: mess._id,
                    date: { $gte: today },
                }).lean();

                let distance: number | undefined;
                if (latitude && longitude && mess.location?.coordinates) {
                    distance = calculateDistance(
                        latitude,
                        longitude,
                        mess.location.coordinates[1],
                        mess.location.coordinates[0]
                    );
                }

                return {
                    ...mess,
                    distance,
                    // Extract Regular Thali's updatedAt (index 0 = Regular Thali)
                    regularThaliUpdatedAt: mess.thalis?.[0]?.updatedAt || mess.thalis?.[0]?.createdAt || null,
                    todayMenu: todayMenu ? {
                        items: todayMenu.items,
                        averageRating: todayMenu.averageRating,
                        updatedAt: todayMenu.updatedAt,
                        thaliPrice: todayMenu.thaliPrice,
                    } : null,
                };
            })
        );

        return paginatedResponse(messesWithDetails, { page, limit, total });
    } catch (error) {
        console.error('Get messes error:', error);
        return errorResponse('Failed to fetch messes', 500);
    }
}

// POST /api/messes - Create new mess (mess owner only)
export async function POST(request: NextRequest) {
    try {
        await connectDB();

        // DEMO MODE: Cannot create messes without database
        if (isDemoMode()) {
            return errorResponse('Database not connected. This feature requires MongoDB to be configured.', 503);
        }

        const userId = request.headers.get('x-user-id');
        const userRole = request.headers.get('x-user-role');

        if (!userId || userRole !== 'messOwner') {
            return errorResponse('Only mess owners can create a mess', 403);
        }

        // Check subscription status
        const subscription = await Subscription.findOne({ messOwnerId: userId });
        if (!subscription) {
            return errorResponse('Subscription not found', 404);
        }

        const isSubscriptionValid =
            subscription.status === 'active' ||
            (subscription.status === 'trial' && new Date() < subscription.trialEndsAt);

        if (!isSubscriptionValid) {
            return errorResponse('Your subscription has expired. Please renew to create a mess.', 402);
        }

        // Check if user already has a mess
        const existingMess = await Mess.findOne({ ownerId: userId });
        if (existingMess) {
            return errorResponse('You already have a mess. Please update it instead.', 409);
        }

        const body = await request.json();

        // Validate input
        const validation = validateInput(createMessSchema, body);
        if (!validation.success) {
            return errorResponse(validation.errors.join(', '), 400);
        }

        const { latitude, longitude, ...messData } = validation.data;

        // Create mess with all fields (new fields are already sanitized by validator transform)
        const mess = await Mess.create({
            ...messData,
            ownerId: userId,
            location: {
                type: 'Point',
                coordinates: [longitude, latitude],
            },
            isApproved: false, // Requires admin approval
        });

        // Create initial analytics record
        await Analytics.create({
            messId: mess._id,
            date: getStartOfDay(),
            messViews: 0,
            menuViews: 0,
            uniqueStudents: [],
        });

        return successResponse(mess, 'Mess created successfully. Pending admin approval.', 201);
    } catch (error) {
        console.error('Create mess error:', error);
        return errorResponse('Failed to create mess', 500);
    }
}
