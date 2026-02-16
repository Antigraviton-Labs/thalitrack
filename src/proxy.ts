import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, getTokenFromHeader } from '@/lib/utils/auth';

// Routes that don't require authentication
const publicRoutes = [
    '/api/auth/register',
    '/api/auth/login',
    '/api/webhooks',
];

// Routes restricted to specific roles
const roleRoutes: Record<string, string[]> = {
    '/api/admin': ['admin'],
    '/api/mess-owner': ['messOwner', 'admin'],
    '/api/student': ['student', 'admin'],
};

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip for non-API routes
    if (!pathname.startsWith('/api/')) {
        return NextResponse.next();
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
        return NextResponse.next();
    }

    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = getTokenFromHeader(authHeader || '');

    if (!token) {
        return NextResponse.json(
            { success: false, error: 'Authentication required' },
            { status: 401 }
        );
    }

    // Verify token
    const decoded = verifyToken(token);

    if (!decoded) {
        return NextResponse.json(
            { success: false, error: 'Invalid or expired token' },
            { status: 401 }
        );
    }

    // Check role-based access
    for (const [routePrefix, allowedRoles] of Object.entries(roleRoutes)) {
        if (pathname.startsWith(routePrefix)) {
            if (!allowedRoles.includes(decoded.role)) {
                return NextResponse.json(
                    { success: false, error: 'Insufficient permissions' },
                    { status: 403 }
                );
            }
            break;
        }
    }

    // Add user info to headers for downstream use
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', decoded.userId);
    requestHeaders.set('x-user-email', decoded.email);
    requestHeaders.set('x-user-role', decoded.role);

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
}

export const config = {
    matcher: ['/api/:path*'],
};
