import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, getTokenFromHeader } from '@/lib/utils/auth';

// Routes that don't require authentication
const publicRoutes = [
    '/api/auth/register',
    '/api/auth/login',
    '/api/auth/forgot-password',
    '/api/auth/verify-otp',
    '/api/auth/reset-password',
    '/api/webhooks',
];

// Routes restricted to specific roles
const roleRoutes: Record<string, string[]> = {
    '/api/admin': ['admin'],
    '/api/mess-owner': ['messOwner', 'admin'],
    '/api/student': ['student', 'admin'],
};

// Admin frontend origin for CORS
const ADMIN_ORIGIN = process.env.ADMIN_FRONTEND_URL || 'http://localhost:3001';

function addCorsHeaders(response: NextResponse, origin: string): NextResponse {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    return response;
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip for non-API routes
    if (!pathname.startsWith('/api/')) {
        return NextResponse.next();
    }

    const origin = request.headers.get('origin') || '';
    const isAdminOrigin = origin === ADMIN_ORIGIN;

    // Handle CORS preflight for admin frontend
    if (request.method === 'OPTIONS' && isAdminOrigin) {
        const preflightResponse = new NextResponse(null, { status: 204 });
        return addCorsHeaders(preflightResponse, ADMIN_ORIGIN);
    }

    // Check if route is public
    // GET requests to certain routes are public, but POST/PUT/DELETE require auth
    const isPublicRoute = publicRoutes.some(
        (route) =>
            pathname === route ||
            pathname.startsWith(route + '/')
    ) || (
            // /api/messes GET is public (for browsing)
            (pathname === '/api/messes' || pathname.startsWith('/api/messes/')) &&
            request.method === 'GET'
        ) || (
            // /api/suggestions GET is public (for viewing suggestions)
            (pathname === '/api/suggestions' || pathname.startsWith('/api/suggestions/')) &&
            request.method === 'GET'
        ) || (
            // /api/users/saved requires auth (handled below)
            false
        );

    if (isPublicRoute) {
        const response = NextResponse.next();
        return isAdminOrigin ? addCorsHeaders(response, ADMIN_ORIGIN) : response;
    }

    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = getTokenFromHeader(authHeader || '');

    if (!token) {
        const response = NextResponse.json(
            { success: false, error: 'Authentication required' },
            { status: 401 }
        );
        return isAdminOrigin ? addCorsHeaders(response, ADMIN_ORIGIN) : response;
    }

    // Verify token
    const decoded = verifyToken(token);

    if (!decoded) {
        const response = NextResponse.json(
            { success: false, error: 'Invalid or expired token' },
            { status: 401 }
        );
        return isAdminOrigin ? addCorsHeaders(response, ADMIN_ORIGIN) : response;
    }

    // Check role-based access
    for (const [routePrefix, allowedRoles] of Object.entries(roleRoutes)) {
        if (pathname.startsWith(routePrefix)) {
            if (!allowedRoles.includes(decoded.role)) {
                const response = NextResponse.json(
                    { success: false, error: 'Insufficient permissions' },
                    { status: 403 }
                );
                return isAdminOrigin ? addCorsHeaders(response, ADMIN_ORIGIN) : response;
            }
            break;
        }
    }

    // Add user info to headers for downstream use
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', decoded.userId);
    requestHeaders.set('x-user-email', decoded.email);
    requestHeaders.set('x-user-role', decoded.role);

    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });

    return isAdminOrigin ? addCorsHeaders(response, ADMIN_ORIGIN) : response;
}

export const config = {
    matcher: ['/api/:path*'],
};

