import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { uploadImage, uploadMultipleImages, uploadFile } from '@/lib/services/cloudinary';
import { successResponse, errorResponse } from '@/lib/utils';

const MAX_LICENSE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_LICENSE_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

function getBase64SizeBytes(base64: string): number {
    // Remove data URI prefix if present
    const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
    return Math.ceil((base64Data.length * 3) / 4);
}

function getMimeFromDataUri(dataUri: string): string | null {
    const match = dataUri.match(/^data:([^;]+);/);
    return match ? match[1] : null;
}

// POST /api/upload - Upload image(s) or files to Cloudinary
export async function POST(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id');
        const userRole = request.headers.get('x-user-role');

        if (!userId) {
            return errorResponse('Authentication required', 401);
        }

        if (userRole !== 'messOwner' && userRole !== 'admin') {
            return errorResponse('Not authorized to upload', 403);
        }

        await connectDB();

        const body = await request.json();
        const { images, folder = 'thalitrack/messes', type } = body;

        // Food license upload
        if (type === 'food-license') {
            const { file } = body;
            if (!file) {
                return errorResponse('No file provided', 400);
            }

            // Validate file size
            const sizeBytes = getBase64SizeBytes(file);
            if (sizeBytes > MAX_LICENSE_SIZE_BYTES) {
                return errorResponse('File size exceeds 5MB limit', 400);
            }

            // Validate file type
            const mime = getMimeFromDataUri(file);
            if (mime && !ALLOWED_LICENSE_TYPES.includes(mime)) {
                return errorResponse(`Invalid file type. Allowed: PDF, JPG, PNG, WebP`, 400);
            }

            const result = await uploadFile(file, 'thalitrack/licenses');
            return successResponse({ file: result }, 'Food license uploaded successfully');
        }

        // Image upload (existing flow)
        if (!images) {
            return errorResponse('No images provided', 400);
        }

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
        return errorResponse('Failed to upload', 500);
    }
}

