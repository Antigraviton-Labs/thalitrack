'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MessWithDistance } from '@/types';

interface MessCardProps {
    mess: MessWithDistance;
}

export default function MessCard({ mess }: MessCardProps) {
    const defaultImage = 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop';

    return (
        <Link href={`/messes/${mess._id}`} className="card group overflow-hidden p-0">
            {/* Image */}
            <div className="relative h-48 overflow-hidden">
                <Image
                    src={mess.photos?.[0] || defaultImage}
                    alt={mess.name}
                    fill
                    className="object-cover transition-transform group-hover:scale-110"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                {/* Price Badge */}
                <div className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm px-3 py-1 rounded-full">
                    <span className="font-bold text-primary">₹{mess.monthlyPrice}</span>
                    <span className="text-xs text-muted">/mo</span>
                </div>
                {/* Distance Badge */}
                {mess.distance !== undefined && (
                    <div className="absolute bottom-3 left-3 bg-background/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm">
                        📍 {mess.distance < 1 ? `${Math.round(mess.distance * 1000)}m` : `${mess.distance.toFixed(1)}km`}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                        {mess.name}
                    </h3>
                    <div className="flex items-center gap-1 shrink-0">
                        <span className="text-yellow-500">⭐</span>
                        <span className="font-semibold">{mess.averageRating.toFixed(1)}</span>
                        <span className="text-xs text-muted">({mess.totalRatings})</span>
                    </div>
                </div>

                {/* Address */}
                <p className="text-sm text-muted line-clamp-1 mb-3">
                    {mess.address}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-3">
                    <span className="badge badge-primary">
                        {mess.messType === 'veg' ? '🟢 Veg' : mess.messType === 'nonVeg' ? '🔴 Non-Veg' : '🟡 Both'}
                    </span>
                    <span className="badge bg-card text-muted">
                        👥 {mess.capacity} capacity
                    </span>
                </div>

                {/* Today's Menu Preview */}
                {mess.todayMenu && (
                    <div className="pt-3 border-t border-border">
                        <p className="text-xs text-muted mb-1">Today&apos;s Thali:</p>
                        <p className="text-sm line-clamp-1">
                            {mess.todayMenu.items.slice(0, 3).join(', ')}
                            {mess.todayMenu.items.length > 3 && '...'}
                        </p>
                    </div>
                )}
            </div>
        </Link>
    );
}
