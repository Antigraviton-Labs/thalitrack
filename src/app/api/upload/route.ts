import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { uploadImage, uploadMultipleImages } from '@/lib/services/cloudinary';
import { successResponse, errorResponse } from '@/lib/utils';

// POST /api/upload - Upload image(s) to Cloudinary
export async function POST(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id');
        const userRole = request.headers.get('x-user-role');

        if (!userId) {
            return errorResponse('Authentication required', 401);
        }

        if (userRole !== 'messOwner' && userRole !== 'admin') {
            return errorResponse('Not authorized to upload images', 403);
        }

        await connectDB();

        const body = await request.json();
        const { images, folder = 'thalitrack/messes' } = body;

        if (!images) {
            return errorResponse('No images provided', 400);
        }

        // Handle single or multiple images
        if (Array.isArray(images)) {
            if (images.length > 10) {
                return errorResponse('Maximum 10 images allowed', 400);
            }
            const results = await uploadMultipleImages(images, folder);
            return successResponse({ images: results }, 'Images uploaded successfully');
        } else {
            const result = await uploadImage(images, folder);
            return successResponse({ image: result }, 'Image uploaded successfully');
        }
    } catch (error) {
        console.error('Upload error:', error);
        return errorResponse('Failed to upload image', 500);
    }
}
