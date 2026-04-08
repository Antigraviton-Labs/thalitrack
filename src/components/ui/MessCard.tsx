'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MessWithDistance } from '@/types';
import { useAuth } from '@/hooks';

interface MessCardProps {
    mess: MessWithDistance;
    isSaved?: boolean;
    onSaveToggle?: (messId: string) => void;
}

export default function MessCard({ mess, isSaved, onSaveToggle }: MessCardProps) {
    const { user } = useAuth();
    const defaultImage = 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop';

    return (
        <div className="card p-0 overflow-hidden flex flex-col h-full group hover:border-primary transition-all">
            <Link href={`/messes/${mess._id}`} className="flex-1 block">
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
                        <span className="font-bold" style={{ color: '#2E7D52' }}>₹{mess.monthlyPrice}</span>
                        <span className="text-xs text-muted">/mo</span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 pb-2">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                            {mess.name}
                        </h3>
                        <div className="flex items-center gap-1 shrink-0">
                            <span style={{ color: '#E8861A' }}>⭐</span>
                            <span className="font-semibold">{mess.averageRating.toFixed(1)}</span>
                            <span className="text-xs text-muted">({mess.totalRatings})</span>
                        </div>
                    </div>

                    {/* Food Type Badge */}
                    <div className="flex flex-wrap gap-2 mb-3">
                        <span className={`badge ${mess.messType === 'veg' ? 'badge-success' : mess.messType === 'nonVeg' ? 'badge-error' : 'badge-warning'}`}>
                            {mess.messType === 'veg' ? '🟢 Veg' : mess.messType === 'nonVeg' ? '🔴 Non-Veg' : '🟡 Both'}
                        </span>
                        {mess.monthlyPlan === 'yes' && (
                            <span className="badge bg-secondary text-foreground">📅 Monthly Plan</span>
                        )}
                    </div>

                    {/* Short Description */}
                    <p className="text-sm text-muted line-clamp-2 mb-3">
                        {mess.description || mess.address}
                    </p>

                    {/* Today's Menu Preview */}
                    {mess.todayMenu && mess.todayMenu.items.length > 0 && (
                        <div className="pt-3 border-t border-border">
                            <p className="text-xs text-muted mb-1">Today&apos;s Thali:</p>
                            <p className="text-[13px] font-medium line-clamp-1">
                                {mess.todayMenu.items.join(', ')}
                            </p>
                        </div>
                    )}

                    {/* Thali Preview (Fallback if no todayMenu but thalis array exists) */}
                    {!mess.todayMenu && mess.thalis && mess.thalis.length > 0 && (
                        <div className="pt-3 border-t border-border">
                            <p className="text-xs text-muted mb-1">Standard Thali:</p>
                            <div className="flex justify-between items-center">
                                <p className="text-[13px] font-medium line-clamp-1">{mess.thalis[0].thaliName}</p>
                                <span className="text-[13px] font-bold" style={{ color: '#E8861A' }}>₹{mess.thalis[0].price}</span>
                            </div>
                        </div>
                    )}
                </div>
            </Link>

            {/* Save Button Logic */}
            <div className="p-4 pt-0 mt-auto">
                {!user ? (
                    <button
                        disabled
                        className="w-full py-2 rounded-lg text-sm font-medium bg-secondary text-muted opacity-60 cursor-not-allowed border border-border"
                    >
                        Login to Save
                    </button>
                ) : (
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            onSaveToggle?.(mess._id);
                        }}
                        className={`w-full py-2 rounded-lg text-sm font-medium transition-all ${isSaved
                            ? 'bg-primary/10 text-primary border border-primary'
                            : 'bg-card border border-border hover:border-primary text-foreground'
                            }`}
                    >
                        {isSaved ? '❤️ Saved' : '🤍 Save'}
                    </button>
                )}
            </div>
        </div>
    );
}
