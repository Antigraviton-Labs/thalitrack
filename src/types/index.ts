export type UserRole = 'student' | 'messOwner' | 'admin';

export interface IUser {
    _id: string;
    email: string;
    password: string;
    name: string;
    phone?: string;
    role: UserRole;
    isActive: boolean;
    savedMesses: string[]; // Array of mess IDs saved by user
    createdAt: Date;
    updatedAt: Date;
}

export interface IMenuItem {
    dishName: string;
    price: number;
}

export interface IThaliItem {
    itemName: string;
    description?: string;
    price?: number;
}

export interface IThali {
    thaliId: string; // stable UUID, never changes
    thaliName: string;
    description?: string;
    price: number;
    items: IThaliItem[];
    averageRating: number;
    totalRatings: number;
    createdAt?: Date | string;
}

export interface IMess {
    _id: string;
    ownerId: string;
    name: string;
    description?: string;
    address: string;
    location: {
        type: 'Point';
        coordinates: [number, number]; // [longitude, latitude]
    };
    contactPhone: string;
    contactWhatsApp?: string;
    capacity: number;
    messType: 'veg' | 'nonVeg' | 'both';
    photos: string[];
    // New fields
    foodLicenseUrl?: string;
    monthlyPlan: 'yes' | 'no';
    monthlyPrice?: number;
    monthlyDescription?: string;
    openingTime: string;
    closingTime: string;
    tiffinService: 'yes' | 'no';
    menuEnabled: 'yes' | 'no';
    menuItems: IMenuItem[]; // @deprecated - use thalis instead
    thalis: IThali[];
    // Status fields
    status: 'open' | 'closed';
    isApproved: boolean;
    isActive: boolean;
    viewCount: number;
    averageRating: number;
    totalRatings: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface IMenu {
    _id: string;
    messId: string;
    date: Date;
    items: string[];
    description?: string;
    thaliPrice?: number;
    viewCount: number;
    averageRating: number;
    totalRatings: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface IRating {
    _id: string;
    userId: string;
    messId: string;
    menuId?: string;
    thaliId?: string; // stable thali UUID reference
    rating: number;
    type: 'mess' | 'menu' | 'thali';
    date: Date;
    createdAt: Date;
}

export interface ISubscription {
    _id: string;
    messOwnerId: string;
    razorpaySubscriptionId?: string;
    razorpayCustomerId?: string;
    status: 'trial' | 'active' | 'cancelled' | 'expired' | 'pending';
    trialEndsAt: Date;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface ISuggestion {
    _id: string;
    userId: string;
    messId?: string; // Optional - can be general suggestion or mess-specific
    content: string;
    isPublic: boolean;
    likes: string[]; // Array of user IDs who liked
    dislikes: string[]; // Array of user IDs who disliked
    likesCount: number;
    dislikesCount: number;
    deletedAt?: Date | null; // soft delete
    createdAt: Date;
}

export interface IAnalytics {
    _id: string;
    messId: string;
    date: Date;
    messViews: number;
    menuViews: number;
}

// API Response types
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

// Auth types
export interface JWTPayload {
    userId: string;
    email: string;
    role: UserRole;
    iat?: number;
    exp?: number;
}

export interface AuthUser {
    userId: string;
    email: string;
    role: UserRole;
    name: string;
}

// Search & Filter types
export interface MessSearchParams {
    latitude?: number;
    longitude?: number;
    maxDistance?: number; // in kilometers
    query?: string;
    minRating?: number;
    maxPrice?: number;
    messType?: 'veg' | 'nonVeg' | 'both';
    sortBy?: 'distance' | 'rating' | 'price';
    page?: number;
    limit?: number;
}

export interface MessWithDistance extends IMess {
    distance?: number; // in kilometers
}
