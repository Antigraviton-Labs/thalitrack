import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
    url: string;
    publicId: string;
}

export async function uploadImage(
    file: string, // base64 or URL
    folder: string = 'thalitrack'
): Promise<UploadResult> {
    try {
        const result = await cloudinary.uploader.upload(file, {
            folder,
            resource_type: 'image',
            transformation: [
                { width: 800, height: 600, crop: 'limit' },
                { quality: 'auto:good' },
                { fetch_format: 'auto' },
            ],
        });

        return {
            url: result.secure_url,
            publicId: result.public_id,
        };
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw new Error('Failed to upload image');
    }
}

export async function uploadMultipleImages(
    files: string[],
    folder: string = 'thalitrack'
): Promise<UploadResult[]> {
    const uploadPromises = files.map((file) => uploadImage(file, folder));
    return Promise.all(uploadPromises);
}

export async function deleteImage(publicId: string): Promise<boolean> {
    try {
        await cloudinary.uploader.destroy(publicId);
        return true;
    } catch (error) {
        console.error('Cloudinary delete error:', error);
        return false;
    }
}

export async function deleteMultipleImages(publicIds: string[]): Promise<void> {
    try {
        await cloudinary.api.delete_resources(publicIds);
    } catch (error) {
        console.error('Cloudinary bulk delete error:', error);
    }
}

export function getOptimizedUrl(
    publicId: string,
    options: {
        width?: number;
        height?: number;
        crop?: string;
    } = {}
): string {
    const { width = 400, height = 300, crop = 'fill' } = options;

    return cloudinary.url(publicId, {
        width,
        height,
        crop,
        quality: 'auto',
        fetch_format: 'auto',
        secure: true,
    });
}

export default cloudinary;
