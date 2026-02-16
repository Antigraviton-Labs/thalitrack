import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { generateToken, successResponse, errorResponse, checkRateLimit } from '@/lib/utils';
import { loginSchema, validateInput } from '@/lib/validations';

export async function POST(request: NextRequest) {
    try {
        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimit = checkRateLimit(`login:${ip}`, 10, 60000); // 10 attempts per minute

        if (!rateLimit.allowed) {
            return errorResponse('Too many login attempts. Please try again later.', 429);
        }

        await connectDB();

        const body = await request.json();

        // Validate input
        const validation = validateInput(loginSchema, body);
        if (!validation.success) {
            return errorResponse(validation.errors.join(', '), 400);
        }

        const { email, password } = validation.data;

        // Find user with password
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return errorResponse('Invalid email or password', 401);
        }

        // Check if user is active
        if (!user.isActive) {
            return errorResponse('Account is deactivated. Please contact support.', 403);
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return errorResponse('Invalid email or password', 401);
        }

        // Generate token
        const token = generateToken({
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
        });

        return successResponse(
            {
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    phone: user.phone,
                    role: user.role,
                },
                token,
            },
            'Login successful'
        );
    } catch (error) {
        console.error('Login error:', error);
        return errorResponse('Login failed', 500);
    }
}
