import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Mess, User } from '@/lib/models';
import { successResponse, errorResponse, requireAdmin } from '@/lib/utils';

// GET /api/admin/inactive-messes
// Returns messes whose Regular Thali has NOT been updated in the last 24 hours
export async function GET(request: NextRequest) {
    try {
        // Verify admin access
        const adminCheck = requireAdmin(request);
        if (adminCheck instanceof NextResponse) return adminCheck;

        await connectDB();

        // Fetch all approved, active messes with owner info
        const messes = await Mess.find({ isApproved: true, isActive: true })
            .populate('ownerId', 'name email phone')
            .lean();

        const now = Date.now();
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

        interface InactiveMess {
            _id: string;
            messName: string;
            ownerName: string;
            ownerEmail: string;
            ownerPhone?: string;
            contactWhatsApp?: string;
            lastUpdatedAt: string | null;
            status: 'not_uploaded' | 'outdated';
            hoursSinceUpdate: number | null;
        }

        const inactiveMesses: InactiveMess[] = [];

        for (const mess of messes) {
            // Identify Regular Thali: thaliName === "Regular Thali" OR index === 0
            let regularThali = null;
            if (mess.thalis && mess.thalis.length > 0) {
                regularThali = mess.thalis.find(
                    (t: any) => t.thaliName === 'Regular Thali'
                ) || mess.thalis[0]; // Fallback to index 0
            }

            // Get owner info
            const owner = mess.ownerId && typeof mess.ownerId === 'object'
                ? mess.ownerId as any
                : null;

            let status: 'not_uploaded' | 'outdated' | null = null;
            let lastUpdatedAt: string | null = null;
            let hoursSinceUpdate: number | null = null;

            if (!regularThali) {
                // No Regular Thali exists
                status = 'not_uploaded';
            } else {
                const updatedAt = regularThali.updatedAt
                    ? new Date(regularThali.updatedAt).getTime()
                    : (regularThali.createdAt
                        ? new Date(regularThali.createdAt).getTime()
                        : 0);

                if (updatedAt === 0) {
                    status = 'not_uploaded';
                } else {
                    const diff = now - updatedAt;
                    hoursSinceUpdate = Math.round((diff / (1000 * 60 * 60)) * 10) / 10;
                    lastUpdatedAt = new Date(updatedAt).toISOString();

                    if (diff > TWENTY_FOUR_HOURS) {
                        status = 'outdated';
                    }
                }
            }

            // Only include inactive messes
            if (status) {
                inactiveMesses.push({
                    _id: String(mess._id),
                    messName: mess.name,
                    ownerName: owner?.name || 'Unknown',
                    ownerEmail: owner?.email || '',
                    ownerPhone: owner?.phone || mess.contactPhone || undefined,
                    contactWhatsApp: mess.contactWhatsApp || undefined,
                    lastUpdatedAt,
                    status,
                    hoursSinceUpdate,
                });
            }
        }

        // Sort: not_uploaded first, then by hoursSinceUpdate descending
        inactiveMesses.sort((a, b) => {
            if (a.status === 'not_uploaded' && b.status !== 'not_uploaded') return -1;
            if (a.status !== 'not_uploaded' && b.status === 'not_uploaded') return 1;
            return (b.hoursSinceUpdate || 0) - (a.hoursSinceUpdate || 0);
        });

        return successResponse(inactiveMesses);
    } catch (error) {
        console.error('Admin get inactive messes error:', error);
        return errorResponse('Failed to fetch inactive messes', 500);
    }
}
