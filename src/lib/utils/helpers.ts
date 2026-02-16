import { NextResponse } from 'next/server';
import { ApiResponse } from '@/types';

// Standard API response helpers
export function successResponse<T>(
    data: T,
    message?: string,
    status: number = 200
): NextResponse<ApiResponse<T>> {
    return NextResponse.json(
        {
            success: true,
            data,
            message,
        },
        { status }
    );
}

export function errorResponse(
    error: string,
    status: number = 400
): NextResponse<ApiResponse<null>> {
    return NextResponse.json(
        {
            success: false,
            error,
        },
        { status }
    );
}

export function paginatedResponse<T>(
    data: T[],
    pagination: {
        page: number;
        limit: number;
        total: number;
    }
): NextResponse {
    return NextResponse.json({
        success: true,
        data,
        pagination: {
            ...pagination,
            totalPages: Math.ceil(pagination.total / pagination.limit),
        },
    });
}

// Haversine formula for distance calculation
export function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
}

function toRad(deg: number): number {
    return deg * (Math.PI / 180);
}

// Date utilities
export function getStartOfDay(date: Date = new Date()): Date {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
}

export function getEndOfDay(date: Date = new Date()): Date {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
}

// Get relative time string (e.g., "2 minutes ago", "1 hour ago", "3 days ago")
export function getRelativeTime(date: Date | string): string {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);
    const diffMonth = Math.floor(diffDay / 30);

    if (diffSec < 60) return 'Just now';
    if (diffMin === 1) return '1 minute ago';
    if (diffMin < 60) return `${diffMin} minutes ago`;
    if (diffHour === 1) return '1 hour ago';
    if (diffHour < 24) return `${diffHour} hours ago`;
    if (diffDay === 1) return '1 day ago';
    if (diffDay < 7) return `${diffDay} days ago`;
    if (diffWeek === 1) return '1 week ago';
    if (diffWeek < 4) return `${diffWeek} weeks ago`;
    if (diffMonth === 1) return '1 month ago';
    if (diffMonth < 12) return `${diffMonth} months ago`;
    return past.toLocaleDateString();
}

// Sanitize string input
export function sanitizeString(str: string): string {
    return str
        .trim()
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .slice(0, 10000); // Limit length
}

// Generate slug from name
export function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Rate limiting map (in-memory for single instance, use Redis for production scale)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
    identifier: string,
    limit: number = 100,
    windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const record = rateLimitMap.get(identifier);

    if (!record || now > record.resetTime) {
        rateLimitMap.set(identifier, {
            count: 1,
            resetTime: now + windowMs,
        });
        return { allowed: true, remaining: limit - 1, resetTime: now + windowMs };
    }

    if (record.count >= limit) {
        return { allowed: false, remaining: 0, resetTime: record.resetTime };
    }

    record.count++;
    return {
        allowed: true,
        remaining: limit - record.count,
        resetTime: record.resetTime,
    };
}

// Clean up old rate limit entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitMap.entries()) {
        if (now > value.resetTime) {
            rateLimitMap.delete(key);
        }
    }
}, 60000);
