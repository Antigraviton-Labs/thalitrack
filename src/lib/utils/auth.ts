import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { JWTPayload, UserRole } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
}

export function generateToken(payload: {
    userId: string;
    email: string;
    role: UserRole;
}): string {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
    });
}

export function verifyToken(token: string): JWTPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch {
        return null;
    }
}

export function decodeToken(token: string): JWTPayload | null {
    try {
        return jwt.decode(token) as JWTPayload;
    } catch {
        return null;
    }
}

export function getTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.substring(7);
}

// Cookie options for storing JWT
export const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
};

/**
 * Verifies the JWT token directly from the Authorization header and checks
 * that the user has 'admin' role. Does NOT trust any client-sent headers.
 *
 * @returns Trusted admin user info, or a NextResponse with 401/403 error.
 */
export function requireAdmin(
    request: NextRequest
): { userId: string; email: string; role: UserRole } | NextResponse {
    const authHeader = request.headers.get('authorization');
    const token = getTokenFromHeader(authHeader || '');

    if (!token) {
        return NextResponse.json(
            { success: false, error: 'Authentication required' },
            { status: 401 }
        );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return NextResponse.json(
            { success: false, error: 'Invalid or expired token' },
            { status: 401 }
        );
    }

    if (decoded.role !== 'admin') {
        return NextResponse.json(
            { success: false, error: 'Admin access required' },
            { status: 403 }
        );
    }

    return { userId: decoded.userId, email: decoded.email, role: decoded.role };
}
