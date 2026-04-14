import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { User, Subscription } from '@/lib/models';
import { generateToken, successResponse, errorResponse } from '@/lib/utils';
import { registerSchema, validateInput } from '@/lib/validations';
import { sendEmail, getWelcomeEmailTemplate } from '@/lib/services/email';

export async function POST(request: NextRequest) {
    try {
        await connectDB();

        const body = await request.json();

        // Validate input
        const validation = validateInput(registerSchema, body);
        if (!validation.success) {
            return errorResponse(validation.errors.join(', '), 400);
        }

        const { email, password, name, phone, role } = validation.data;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return errorResponse('Email already registered', 409);
        }

        // Create user
        const user = await User.create({
            email,
            password,
            name,
            phone,
            role,
        });

        // If mess owner, create trial subscription
        if (role === 'messOwner') {
            const trialEndsAt = new Date();
            trialEndsAt.setMonth(trialEndsAt.getMonth() + 1);

            await Subscription.create({
                messOwnerId: user._id,
                status: 'trial',
                trialEndsAt,
            });
            // NOTE: DO NOT create Mess here - user must complete onboarding first
            // Mess will be created in the "List Your Mess" flow
        }

        // Generate token
        const token = generateToken({
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
        });

        // Send welcome email (non-blocking)
        sendEmail({
            to: email,
            subject: 'Welcome to ThaliTrack! 🍽️',
            html: getWelcomeEmailTemplate(name, role),
        }).catch(console.error);

        return successResponse(
            {
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                },
                token,
            },
            'Registration successful',
            201
        );
    } catch (error) {
        console.error('Registration error:', error);
        return errorResponse('Registration failed', 500);
    }
}
