'use client';

import { useState, useEffect, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Footer } from '@/components/layouts';
import { StarRating } from '@/components/ui';
import { useAuth } from '@/hooks';
import { IMess, IMenu } from '@/types';

interface PageProps {
    params: Promise<{ id: string }>;
}

interface MessDetails extends IMess {
    suggestions?: Array<{
        _id: string;
        content: string;
        isPublic: boolean;
        createdAt: string;
        userId: { name: string };
    }>;
    todayMenu?: IMenu;
}

export default function MessDetailPage({ params }: PageProps) {
    const { id } = use(params);
    const router = useRouter();
    const { user, token, logout } = useAuth();

    const [mess, setMess] = useState<MessDetails | null>(null);
    const [menus, setMenus] = useState<IMenu[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userRating, setUserRating] = useState(0);
    const [menuRating, setMenuRating] = useState(0);
    const [ratingMessage, setRatingMessage] = useState('');
    const [suggestion, setSuggestion] = useState('');
    const [suggestionMessage, setSuggestionMessage] = useState('');
    const [activeTab, setActiveTab] = useState<'menu' | 'suggestions'>('menu');
    const [activePhoto, setActivePhoto] = useState(0);

    // Custom header component
    const PageHeader = () => (
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-2 text-muted hover:text-foreground transition-colors"
                        >
                            <span className="text-xl">←</span>
                            <span className="hidden sm:inline">Back</span>
                        </button>
                        <Link href="/" className="flex items-center gap-2">
                            <span className="text-2xl">🍽️</span>
                            <span className="text-xl font-bold gradient-text">ThaliTrack</span>
                        </Link>
                    </div>
                    <div className="flex items-center gap-3">
                        {user ? (
                            <>
                                <span className="text-sm text-muted hidden sm:block">Hi, {user.name}</span>
                                <button
                                    onClick={() => {
                                        logout();
                                        router.push('/');
                                    }}
                                    className="btn btn-secondary text-sm"
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <Link href="/login" className="btn btn-secondary text-sm">
                                    Log In
                                </Link>
                                <Link href="/register" className="btn btn-primary text-sm">
                                    Get Started
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );

    useEffect(() => {
        const fetchMess = async () => {
            try {
                const headers: Record<string, string> = {};
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }

                const [messRes, menuRes] = await Promise.all([
                    fetch(`/api/messes/${id}`, { headers }),
                    fetch(`/api/messes/${id}/menu`, { headers }),
                ]);

                const messData = await messRes.json();
                const menuData = await menuRes.json();

                if (messData.success) {
                    setMess(messData.data);
                } else {
                    setError(messData.error || 'Mess not found');
                }

                if (menuData.success) {
                    setMenus(menuData.data);
                }

                // Fetch user's existing ratings if logged in
                if (token && user?.userId) {
                    try {
                        const ratingsRes = await fetch(`/api/messes/${id}/ratings`, { headers });
                        const ratingsData = await ratingsRes.json();
                        if (ratingsData.success && ratingsData.data.ratings) {
                            // Find user's mess rating - check if userId matches
                            const messRating = ratingsData.data.ratings.find(
                                (r: { type: string; userId?: { _id: string } }) =>
                                    r.type === 'mess' && r.userId?._id === user.userId
                            );
                            if (messRating) {
                                setUserRating(messRating.rating);
                            }

                            // Find user's menu rating (for today)
                            const menuRating = ratingsData.data.ratings.find(
                                (r: { type: string; userId?: { _id: string } }) =>
                                    r.type === 'menu' && r.userId?._id === user.userId
                            );
                            if (menuRating) {
                                setMenuRating(menuRating.rating);
                            }
                        }
                    } catch (ratingError) {
                        console.error('Failed to fetch user ratings:', ratingError);
                    }
                }
            } catch {
                setError('Failed to load mess details');
            } finally {
                setIsLoading(false);
            }
        };

        fetchMess();
    }, [id, token, user?.userId]);

    const handleRateMess = async (rating: number) => {
        if (!token) {
            setRatingMessage('Please log in to rate');
            return;
        }

        try {
            const response = await fetch(`/api/messes/${id}/ratings?type=mess`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ rating }),
            });

            const data = await response.json();
            if (data.success) {
                setUserRating(rating);
                setRatingMessage('Thanks for rating!');
                setTimeout(() => setRatingMessage(''), 3000);
            } else {
                setRatingMessage(data.error || 'Failed to submit rating');
            }
        } catch {
            setRatingMessage('Failed to submit rating');
        }
    };

    const handleRateMenu = async (rating: number) => {
        if (!token || !menus[0]) {
            setRatingMessage('Please log in to rate');
            return;
        }

        try {
            const response = await fetch(`/api/messes/${id}/ratings?type=menu`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ menuId: menus[0]._id, rating }),
            });

            const data = await response.json();
            if (data.success) {
                setMenuRating(rating);
                setRatingMessage('Thanks for rating the menu!');
                setTimeout(() => setRatingMessage(''), 3000);
            } else {
                setRatingMessage(data.error || 'Failed to submit rating');
            }
        } catch {
            setRatingMessage('Failed to submit rating');
        }
    };

    const handleSubmitSuggestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !suggestion.trim()) return;

        try {
            const response = await fetch(`/api/messes/${id}/suggestions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ content: suggestion, isPublic: true }),
            });

            const data = await response.json();
            if (data.success) {
                setSuggestion('');
                setSuggestionMessage('Suggestion submitted!');
                setTimeout(() => setSuggestionMessage(''), 3000);
            } else {
                setSuggestionMessage(data.error || 'Failed to submit');
            }
        } catch {
            setSuggestionMessage('Failed to submit');
        }
    };

    if (isLoading) {
        return (
            <>
                <PageHeader />
                <main className="min-h-screen pt-20 pb-10">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="animate-pulse space-y-6">
                            <div className="h-80 skeleton rounded-xl" />
                            <div className="h-8 skeleton rounded w-1/2" />
                            <div className="h-4 skeleton rounded w-3/4" />
                            <div className="h-4 skeleton rounded w-1/4" />
                        </div>
                    </div>
                </main>
                <Footer />
            </>
        );
    }

    if (error || !mess) {
        return (
            <>
                <PageHeader />
                <main className="min-h-screen pt-20 pb-10 flex items-center justify-center">
                    <div className="text-center">
                        <span className="text-6xl mb-4 block">😕</span>
                        <h2 className="text-xl font-semibold mb-2">{error || 'Mess not found'}</h2>
                        <button onClick={() => router.back()} className="btn btn-primary">
                            Go Back
                        </button>
                    </div>
                </main>
                <Footer />
            </>
        );
    }

    const defaultImage = 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&h=600&fit=crop';
    const photos = mess.photos?.length ? mess.photos : [defaultImage];

    return (
        <>
            <PageHeader />
            <main className="min-h-screen pt-20 pb-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Photo Gallery */}
                    <div className="relative mb-8">
                        <div className="relative h-80 md:h-96 rounded-xl overflow-hidden">
                            <Image
                                src={photos[activePhoto]}
                                alt={mess.name}
                                fill
                                className="object-cover"
                                priority
                            />
                        </div>
                        {photos.length > 1 && (
                            <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                                {photos.map((photo, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setActivePhoto(index)}
                                        className={`relative w-20 h-20 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${activePhoto === index ? 'border-primary' : 'border-transparent'
                                            }`}
                                    >
                                        <Image src={photo} alt="" fill className="object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Header */}
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="badge badge-primary">
                                        {mess.messType === 'veg' ? '🟢 Veg' : mess.messType === 'nonVeg' ? '🔴 Non-Veg' : '🟡 Both'}
                                    </span>
                                    {!mess.isApproved && (
                                        <span className="badge badge-warning">Pending Approval</span>
                                    )}
                                </div>
                                <h1 className="text-3xl md:text-4xl font-bold mb-2">{mess.name}</h1>
                                <p className="text-muted">{mess.address}</p>
                            </div>

                            {/* Rating & Price */}
                            <div className="flex flex-wrap gap-6">
                                <div className="flex items-center gap-2">
                                    <span className="text-yellow-500 text-2xl">⭐</span>
                                    <span className="text-2xl font-bold">{mess.averageRating.toFixed(1)}</span>
                                    <span className="text-muted">({mess.totalRatings} ratings)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">💰</span>
                                    <span className="text-2xl font-bold text-primary">₹{mess.monthlyPrice}</span>
                                    <span className="text-muted">/month</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">👥</span>
                                    <span className="font-semibold">{mess.capacity} capacity</span>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="border-b border-border">
                                <div className="flex gap-6">
                                    <button
                                        onClick={() => setActiveTab('menu')}
                                        className={`pb-3 font-medium transition-colors ${activeTab === 'menu'
                                            ? 'text-primary border-b-2 border-primary'
                                            : 'text-muted hover:text-foreground'
                                            }`}
                                    >
                                        📋 Today&apos;s Menu
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('suggestions')}
                                        className={`pb-3 font-medium transition-colors ${activeTab === 'suggestions'
                                            ? 'text-primary border-b-2 border-primary'
                                            : 'text-muted hover:text-foreground'
                                            }`}
                                    >
                                        💬 Suggestions
                                    </button>
                                </div>
                            </div>

                            {/* Tab Content */}
                            {activeTab === 'menu' ? (
                                <div className="space-y-6">
                                    {menus.length > 0 ? (
                                        <>
                                            <div className="card">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="font-semibold">Today&apos;s Thali Menu</h3>
                                                    {menus[0].thaliPrice && (
                                                        <span className="text-lg font-bold text-primary">
                                                            ₹{menus[0].thaliPrice}
                                                        </span>
                                                    )}
                                                </div>
                                                <ul className="space-y-2">
                                                    {menus[0].items.map((item, index) => (
                                                        <li key={index} className="flex items-center gap-2">
                                                            <span className="text-success">✓</span>
                                                            {item}
                                                        </li>
                                                    ))}
                                                </ul>
                                                {menus[0].description && (
                                                    <p className="mt-4 text-muted">{menus[0].description}</p>
                                                )}

                                                {/* Menu Rating */}
                                                <div className="mt-6 pt-4 border-t border-border">
                                                    <p className="text-sm text-muted mb-2">Rate today&apos;s menu:</p>
                                                    <StarRating
                                                        rating={menuRating}
                                                        onRate={handleRateMenu}
                                                        readonly={!user || user.role !== 'student'}
                                                    />
                                                    {ratingMessage && (
                                                        <p className="text-sm text-primary mt-2">{ratingMessage}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="card text-center py-10">
                                            <span className="text-4xl mb-2 block">📋</span>
                                            <p className="text-muted">No menu uploaded for today</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Submit Suggestion */}
                                    {user && user.role === 'student' && (
                                        <form onSubmit={handleSubmitSuggestion} className="card">
                                            <h3 className="font-semibold mb-4">Share Your Feedback</h3>
                                            <textarea
                                                value={suggestion}
                                                onChange={(e) => setSuggestion(e.target.value)}
                                                placeholder="Share your suggestions or feedback..."
                                                className="input min-h-[100px] resize-none"
                                                minLength={10}
                                                required
                                            />
                                            <div className="flex items-center justify-between mt-4">
                                                <span className="text-sm text-muted">
                                                    {suggestion.length}/1000 characters
                                                </span>
                                                <button type="submit" className="btn btn-primary">
                                                    Submit
                                                </button>
                                            </div>
                                            {suggestionMessage && (
                                                <p className="text-sm text-primary mt-2">{suggestionMessage}</p>
                                            )}
                                        </form>
                                    )}

                                    {/* Suggestions List */}
                                    {mess.suggestions && mess.suggestions.length > 0 ? (
                                        <div className="space-y-4">
                                            {mess.suggestions.map((sug) => (
                                                <div key={sug._id} className="card">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                                                            {sug.userId?.name?.[0] || 'A'}
                                                        </span>
                                                        <span className="font-medium">{sug.userId?.name || 'Anonymous'}</span>
                                                        <span className="text-xs text-muted">
                                                            {new Date(sug.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-muted">{sug.content}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="card text-center py-10">
                                            <span className="text-4xl mb-2 block">💬</span>
                                            <p className="text-muted">No suggestions yet. Be the first!</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Contact Card */}
                            <div className="card">
                                <h3 className="font-semibold mb-4">Contact</h3>
                                <div className="space-y-3">
                                    <a
                                        href={`tel:${mess.contactPhone}`}
                                        className="flex items-center gap-3 p-3 rounded-lg bg-card hover:bg-primary/10 transition-colors"
                                    >
                                        <span className="text-xl">📞</span>
                                        <span>{mess.contactPhone}</span>
                                    </a>
                                    {mess.contactWhatsApp && (
                                        <a
                                            href={`https://wa.me/91${mess.contactWhatsApp}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 p-3 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors"
                                        >
                                            <span className="text-xl">💬</span>
                                            <span>WhatsApp</span>
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Rate Mess Card */}
                            <div className="card">
                                <h3 className="font-semibold mb-4">Rate This Mess</h3>
                                <StarRating
                                    rating={userRating}
                                    onRate={handleRateMess}
                                    readonly={!user || user.role !== 'student'}
                                    size="lg"
                                />
                                {!user && (
                                    <p className="text-sm text-muted mt-3">
                                        <Link href="/login" className="text-primary hover:underline">
                                            Log in
                                        </Link>{' '}
                                        to rate
                                    </p>
                                )}
                                {ratingMessage && (
                                    <p className="text-sm text-primary mt-2">{ratingMessage}</p>
                                )}
                            </div>

                            {/* Map Card */}
                            <div className="card">
                                <h3 className="font-semibold mb-4">Location</h3>
                                <a
                                    href={`https://www.google.com/maps?q=${mess.location?.coordinates[1]},${mess.location?.coordinates[0]}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-secondary w-full"
                                >
                                    📍 Open in Google Maps
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
