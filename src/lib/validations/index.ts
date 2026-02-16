import { z } from 'zod';

// Common validators
const phoneRegex = /^[6-9]\d{9}$/;
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

// User validation schemas
export const registerSchema = z.object({
    email: z.string().email('Invalid email address').toLowerCase().trim(),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(100, 'Password too long')
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        ),
    name: z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name too long')
        .trim(),
    phone: z
        .string()
        .regex(phoneRegex, 'Invalid Indian phone number')
        .optional(),
    role: z.enum(['student', 'messOwner']).default('student'),
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email address').toLowerCase().trim(),
    password: z.string().min(1, 'Password is required'),
});

export const updateUserSchema = z.object({
    name: z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name too long')
        .trim()
        .optional(),
    phone: z
        .string()
        .regex(phoneRegex, 'Invalid Indian phone number')
        .optional(),
});

// Mess validation schemas
export const createMessSchema = z.object({
    name: z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name too long')
        .trim(),
    description: z
        .string()
        .max(500, 'Description too long')
        .trim()
        .optional(),
    address: z
        .string()
        .min(10, 'Address must be at least 10 characters')
        .max(300, 'Address too long')
        .trim(),
    latitude: z
        .number()
        .min(-90, 'Invalid latitude')
        .max(90, 'Invalid latitude'),
    longitude: z
        .number()
        .min(-180, 'Invalid longitude')
        .max(180, 'Invalid longitude'),
    contactPhone: z.string().regex(phoneRegex, 'Invalid Indian phone number'),
    contactWhatsApp: z
        .string()
        .regex(phoneRegex, 'Invalid WhatsApp number')
        .optional(),
    capacity: z
        .number()
        .int('Capacity must be a whole number')
        .min(1, 'Capacity must be at least 1')
        .max(1000, 'Capacity too large'),
    monthlyPrice: z
        .number()
        .min(0, 'Price cannot be negative')
        .max(50000, 'Price too high'),
    messType: z.enum(['veg', 'nonVeg', 'both']).default('veg'),
    photos: z
        .array(z.string().url('Invalid photo URL'))
        .max(10, 'Maximum 10 photos allowed')
        .optional(),
});

export const updateMessSchema = createMessSchema.partial();

// Menu validation schemas
export const createMenuSchema = z.object({
    date: z.string().transform((val) => new Date(val)),
    items: z
        .array(z.string().min(1).max(100))
        .min(1, 'At least one item required')
        .max(20, 'Maximum 20 items allowed'),
    description: z
        .string()
        .max(500, 'Description too long')
        .trim()
        .optional(),
    thaliPrice: z
        .number()
        .min(0, 'Price cannot be negative')
        .max(10000, 'Price cannot exceed 10000')
        .optional(),
});

export const updateMenuSchema = z.object({
    items: z
        .array(z.string().min(1).max(100))
        .min(1, 'At least one item required')
        .max(20, 'Maximum 20 items allowed')
        .optional(),
    description: z
        .string()
        .max(500, 'Description too long')
        .trim()
        .optional(),
    thaliPrice: z
        .number()
        .min(0, 'Price cannot be negative')
        .max(10000, 'Price cannot exceed 10000')
        .optional(),
});

// Rating validation schemas
export const rateMessSchema = z.object({
    rating: z
        .number()
        .int()
        .min(1, 'Rating must be at least 1')
        .max(5, 'Rating cannot exceed 5'),
});

export const rateMenuSchema = z.object({
    menuId: z.string().regex(objectIdRegex, 'Invalid menu ID'),
    rating: z
        .number()
        .int()
        .min(1, 'Rating must be at least 1')
        .max(5, 'Rating cannot exceed 5'),
});

// Suggestion validation schemas
export const createSuggestionSchema = z.object({
    content: z
        .string()
        .min(10, 'Suggestion must be at least 10 characters')
        .max(1000, 'Suggestion too long')
        .trim(),
    isPublic: z.boolean().default(true),
});

// Search validation schemas
export const searchMessesSchema = z.object({
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    maxDistance: z.number().min(0.1).max(100).optional(), // in km
    query: z.string().max(100).optional(),
    minRating: z.number().min(0).max(5).optional(),
    maxPrice: z.number().min(0).optional(),
    messType: z.enum(['veg', 'nonVeg', 'both']).optional(),
    sortBy: z.enum(['distance', 'rating', 'price']).optional(),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(50).default(10),
});

// ObjectId validation
export const objectIdSchema = z.string().regex(objectIdRegex, 'Invalid ID');

// Utility function to validate and extract errors
export function validateInput<T>(
    schema: z.ZodSchema<T>,
    data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
    const result = schema.safeParse(data);

    if (result.success) {
        return { success: true, data: result.data };
    }

    const errors = result.error.issues?.map((issue) => issue.message) || ['Validation failed'];
    return { success: false, errors };
}

// Types
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateMessInput = z.infer<typeof createMessSchema>;
export type UpdateMessInput = z.infer<typeof updateMessSchema>;
export type CreateMenuInput = z.infer<typeof createMenuSchema>;
export type SearchMessesInput = z.infer<typeof searchMessesSchema>;
export type CreateSuggestionInput = z.infer<typeof createSuggestionSchema>;
