'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks';

interface Mess {
    _id: string;
    name: string;
    description: string;
    address: string;
    averageRating: number;
    totalRatings: number;
    monthlyPrice: number;
    messType: 'veg' | 'nonVeg' | 'both';
    distance?: number;
    photos?: string[];
    todayMenu?: {
        items: string[];
        averageRating: number;
        updatedAt?: string;
        thaliPrice?: number;
    };
    thalis?: {
        thaliName: string;
        price: number;
    }[];
    monthlyPlan?: 'yes' | 'no';
}

// Helper function for relative time
function getRelativeTime(date: Date | string): string {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin === 1) return '1 minute ago';
    if (diffMin < 60) return `${diffMin} minutes ago`;
    if (diffHour === 1) return '1 hour ago';
    if (diffHour < 24) return `${diffHour} hours ago`;
    if (diffDay === 1) return '1 day ago';
    if (diffDay < 7) return `${diffDay} days ago`;
    return past.toLocaleDateString();
}

interface Suggestion {
    _id: string;
    content: string;
    user: { _id: string; name: string } | null;
    messId?: string;
    likesCount: number;
    dislikesCount: number;
    likes: string[];
    dislikes: string[];
    createdAt: string;
}

export default function StudentDashboard() {
    const router = useRouter();
    const { user, token, isLoading: authLoading, logout } = useAuth();

    // Discover tab state
    const [messes, setMesses] = useState<Mess[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'nearest' | 'topRated' | 'lowestPrice'>('nearest');
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // Saved tab state
    const [savedMesses, setSavedMesses] = useState<Mess[]>([]);
    const [savedMessIds, setSavedMessIds] = useState<Set<string>>(new Set());
    const [loadingSaved, setLoadingSaved] = useState(false);

    // Suggestions tab state
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [mostLikedSuggestions, setMostLikedSuggestions] = useState<Suggestion[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [newSuggestion, setNewSuggestion] = useState('');
    const [submittingSuggestion, setSubmittingSuggestion] = useState(false);
    const [suggestionFilter, setSuggestionFilter] = useState<'recent' | 'mostLiked'>('recent');

    const [activeTab, setActiveTab] = useState<'discover' | 'saved' | 'suggestions'>('discover');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Show toast notification
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Fetch messes with optional search
    const fetchMesses = useCallback(async (query?: string) => {
        setIsLoading(true);
        try {
            let url = '/api/messes?sortBy=rating&limit=20';
            if (query) {
                url += `&query=${encodeURIComponent(query)}`;
            }

            const response = await fetch(url);
            const result = await response.json();

            if (result.success) {
                setMesses(result.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch messes:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch saved messes
    const fetchSavedMesses = useCallback(async () => {
        if (!token) return;
        setLoadingSaved(true);
        try {
            const response = await fetch('/api/users/saved', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const result = await response.json();
            if (result.success) {
                setSavedMesses(result.data || []);
                setSavedMessIds(new Set((result.data || []).map((m: Mess) => m._id)));
            }
        } catch (error) {
            console.error('Failed to fetch saved messes:', error);
        } finally {
            setLoadingSaved(false);
        }
    }, [token]);

    // Fetch suggestions
    const fetchSuggestions = useCallback(async () => {
        setLoadingSuggestions(true);
        try {
            // Fetch recent suggestions (all public suggestions)
            const recentRes = await fetch('/api/suggestions?sortBy=recent&limit=50');
            const recentData = await recentRes.json();
            console.log('📊 Suggestions response:', recentData);
            if (recentData.success) {
                // Filter to only show general suggestions (without messId)
                const generalSuggestions = (recentData.data.suggestions || []).filter(
                    (s: Suggestion) => !s.messId || s.messId === ''
                );
                setSuggestions(generalSuggestions.slice(0, 20));
            }

            // Fetch most liked suggestions
            const likedRes = await fetch('/api/suggestions?sortBy=mostLiked&limit=20');
            const likedData = await likedRes.json();
            if (likedData.success) {
                // Filter to only show general suggestions (without messId)
                const generalMostLiked = (likedData.data.suggestions || []).filter(
                    (s: Suggestion) => !s.messId || s.messId === ''
                );
                setMostLikedSuggestions(generalMostLiked.slice(0, 5));
            }
        } catch (error) {
            console.error('Failed to fetch suggestions:', error);
        } finally {
            setLoadingSuggestions(false);
        }
    }, []);

    // Handle search with debounce
    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            if (activeTab === 'discover') {
                fetchMesses(searchQuery || undefined);
            }
        }, 300);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [searchQuery, activeTab, fetchMesses]);

    // Initial data fetch
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }

        if (!authLoading && user?.role !== 'student') {
            if (user?.role === 'messOwner') {
                router.push('/dashboard/mess-owner');
            } else if (user?.role === 'admin') {
                router.push('/dashboard/admin');
            }
            return;
        }

        if (!authLoading && token) {
            fetchMesses();
            fetchSavedMesses();
        }
    }, [authLoading, user, router, token, fetchMesses, fetchSavedMesses]);

    // Fetch suggestions when tab changes
    useEffect(() => {
        if (activeTab === 'suggestions') {
            fetchSuggestions();
        }
    }, [activeTab, fetchSuggestions]);

    // Save/unsave mess
    const handleSaveMess = async (messId: string) => {
        if (!token) {
            showToast('Please login to save messes', 'error');
            return;
        }

        const isSaved = savedMessIds.has(messId);

        try {
            if (isSaved) {
                await fetch(`/api/users/saved?messId=${messId}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` },
                });
                setSavedMessIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(messId);
                    return newSet;
                });
                setSavedMesses(prev => prev.filter(m => m._id !== messId));
                showToast('Removed from saved');
            } else {
                await fetch('/api/users/saved', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ messId }),
                });
                setSavedMessIds(prev => new Set(prev).add(messId));
                showToast('Mess saved!');
                // Refresh saved messes
                fetchSavedMesses();
            }
        } catch (error) {
            console.error('Save mess error:', error);
            showToast('Failed to save mess', 'error');
        }
    };

    // Submit new suggestion
    const handleSubmitSuggestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) {
            showToast('Please login to share suggestions', 'error');
            return;
        }
        if (newSuggestion.length < 10) {
            showToast('Suggestion must be at least 10 characters', 'error');
            return;
        }

        setSubmittingSuggestion(true);
        try {
            const response = await fetch('/api/suggestions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ content: newSuggestion, isPublic: true }),
            });
            const result = await response.json();
            if (result.success) {
                // Optimistic UI update - add new suggestion to top of list
                const newSuggestionData: Suggestion = {
                    _id: result.data._id || Date.now().toString(),
                    content: newSuggestion,
                    user: { _id: user?.userId || '', name: user?.name || 'You' },
                    likesCount: 0,
                    dislikesCount: 0,
                    likes: [],
                    dislikes: [],
                    createdAt: new Date().toISOString(),
                };
                setSuggestions(prev => [newSuggestionData, ...prev]);
                setNewSuggestion('');
                showToast('Suggestion shared!');
            } else {
                showToast(result.error || 'Failed to share suggestion', 'error');
            }
        } catch (error) {
            console.error('Submit suggestion error:', error);
            showToast('Failed to share suggestion', 'error');
        } finally {
            setSubmittingSuggestion(false);
        }
    };

    // Like/dislike suggestion
    const handleVote = async (suggestionId: string, type: 'like' | 'dislike') => {
        if (!token) {
            showToast('Please login to vote', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/suggestions/${suggestionId}/${type}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            const result = await response.json();
            if (result.success) {
                // Update local state
                const updateSuggestion = (s: Suggestion) => {
                    if (s._id !== suggestionId) return s;
                    return {
                        ...s,
                        likesCount: result.data.likesCount,
                        dislikesCount: result.data.dislikesCount,
                        likes: result.data.liked ? [...s.likes, user?.userId || ''] : s.likes.filter(id => id !== user?.userId),
                        dislikes: result.data.disliked ? [...s.dislikes, user?.userId || ''] : s.dislikes.filter(id => id !== user?.userId),
                    };
                };
                setSuggestions(prev => prev.map(updateSuggestion));
                setMostLikedSuggestions(prev => prev.map(updateSuggestion));
            }
        } catch (error) {
            console.error('Vote error:', error);
        }
    };

    // Mess card component
    const MessCard = ({ mess, showSave = true }: { mess: Mess; showSave?: boolean }) => (
        <div className="card hover:border-primary transition-all hover:scale-[1.02]">
            <Link href={`/messes/${mess._id}`} className="block">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h3 className="font-semibold text-lg">{mess.name}</h3>
                        <span className={`badge ${mess.messType === 'veg' ? 'badge-success' :
                            mess.messType === 'nonVeg' ? 'badge-error' : 'badge-warning'}`}>
                            {mess.messType === 'veg' ? '🥬 Veg' :
                                mess.messType === 'nonVeg' ? '🍗 Non-Veg' : '🍽️ Both'}
                        </span>
                    </div>
                    <div className="text-right">
                        <div className="text-yellow-500 font-bold">
                            ⭐ {mess.averageRating?.toFixed(1) || '0.0'}
                        </div>
                        <div className="text-xs text-muted">{mess.totalRatings || 0} reviews</div>
                    </div>
                </div>
                <p className="text-sm text-muted mb-2 line-clamp-2">
                    {mess.description || mess.address}
                </p>

                {/* Thali Preview */}
                {mess.thalis && mess.thalis.length > 0 && (
                    <div className="mb-3 p-3 bg-muted/20 rounded-lg">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-xs font-semibold uppercase text-muted tracking-wider">Thali</span>
                                <p className="font-medium text-foreground">{mess.thalis[0].thaliName}</p>
                            </div>
                            <div className="text-right">
                                <span className="block font-bold text-lg text-primary">₹{mess.thalis[0].price}</span>
                                {mess.thalis.length > 1 && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-background rounded-full border border-border text-muted">
                                        +{mess.thalis.length - 1} more
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center border-t border-dashed border-border pt-3 mt-2">
                    <div className="flex flex-col">
                        {mess.monthlyPlan === 'yes' ? (
                            <>
                                <span className="text-[10px] uppercase text-muted font-medium">Monthly Plan</span>
                                <span className="font-bold">₹{mess.monthlyPrice}/month</span>
                            </>
                        ) : (
                            <span className="text-xs text-muted italic">No Monthly Plan Available</span>
                        )}
                    </div>
                    {mess.distance && (
                        <div className="flex items-center gap-1 text-xs text-muted">
                            <span>📍</span>
                            <span>{mess.distance.toFixed(1)} km</span>
                        </div>
                    )}
                </div>
            </Link>
            {showSave && (
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        handleSaveMess(mess._id);
                    }}
                    className={`mt-3 w-full py-2 rounded-lg text-sm font-medium transition-all ${savedMessIds.has(mess._id)
                        ? 'bg-primary/20 text-primary border border-primary'
                        : 'bg-card border border-border hover:border-primary'
                        }`}
                >
                    {savedMessIds.has(mess._id) ? '❤️ Saved' : '🤍 Save'}
                </button>
            )}
        </div>
    );

    // Suggestion card component
    const SuggestionCard = ({ suggestion }: { suggestion: Suggestion }) => {
        const isLiked = suggestion.likes.includes(user?.userId || '');
        const isDisliked = suggestion.dislikes.includes(user?.userId || '');

        return (
            <div className="card">
                <p className="text-sm mb-3">{suggestion.content}</p>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">
                        {suggestion.user?.name || 'Anonymous'} • {getRelativeTime(suggestion.createdAt)}
                    </span>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => handleVote(suggestion._id, 'like')}
                            className={`flex items-center gap-1 text-sm ${isLiked ? 'text-green-500' : 'text-muted hover:text-green-500'}`}
                        >
                            👍 {suggestion.likesCount}
                        </button>
                        <button
                            onClick={() => handleVote(suggestion._id, 'dislike')}
                            className={`flex items-center gap-1 text-sm ${isDisliked ? 'text-red-500' : 'text-muted hover:text-red-500'}`}
                        >
                            👎 {suggestion.dislikesCount}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <span className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin inline-block mb-4" />
                    <p className="text-muted">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                    } text-white animate-fade-in`}>
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <header className="bg-card border-b border-border sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/" className="flex items-center gap-2">
                            <span className="text-2xl">🍽️</span>
                            <span className="text-xl font-bold gradient-text">ThaliTrack</span>
                        </Link>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-muted hidden sm:block">Hi, {user?.name}</span>
                            <button onClick={logout} className="btn btn-secondary text-sm">Logout</button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Search Bar */}
                <div className="mb-8">
                    <input
                        type="text"
                        className="input w-full"
                        placeholder="Search messes by name, menu items, location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-8 border-b border-border">
                    {(['discover', 'saved', 'suggestions'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 font-medium transition-colors ${activeTab === tab
                                ? 'text-primary border-b-2 border-primary'
                                : 'text-muted hover:text-foreground'
                                }`}
                        >
                            {tab === 'discover' && '🔍 '}
                            {tab === 'saved' && '❤️ '}
                            {tab === 'suggestions' && '💡 '}
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Discover Tab */}
                {activeTab === 'discover' && (
                    <>
                        {/* Sort Dropdown */}
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-sm text-muted">{messes.length} messes found</p>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as 'nearest' | 'topRated' | 'lowestPrice')}
                                className="input py-2 px-3 text-sm w-auto"
                            >
                                <option value="nearest">📍 Nearest</option>
                                <option value="topRated">⭐ Top Rated</option>
                                <option value="lowestPrice">💰 Lowest Price</option>
                            </select>
                        </div>

                        {isLoading ? (
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[1, 2, 3, 4, 5, 6].map((i) => (
                                    <div key={i} className="card animate-pulse">
                                        <div className="h-6 bg-border rounded w-3/4 mb-2" />
                                        <div className="h-4 bg-border rounded w-1/2" />
                                    </div>
                                ))}
                            </div>
                        ) : messes.length === 0 ? (
                            <div className="text-center py-16">
                                <span className="text-6xl mb-4 block">🍽️</span>
                                <h3 className="text-xl font-semibold mb-2">No messes found</h3>
                                <p className="text-muted">Try a different search term</p>
                            </div>
                        ) : (
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[...messes]
                                    .sort((a, b) => {
                                        if (sortBy === 'nearest') {
                                            return (a.distance ?? 9999) - (b.distance ?? 9999);
                                        } else if (sortBy === 'topRated') {
                                            return (b.averageRating ?? 0) - (a.averageRating ?? 0);
                                        } else {
                                            return (a.monthlyPrice ?? 9999) - (b.monthlyPrice ?? 9999);
                                        }
                                    })
                                    .map((mess) => (
                                        <MessCard key={mess._id} mess={mess} />
                                    ))}
                            </div>
                        )}
                    </>
                )}

                {/* Saved Tab */}
                {activeTab === 'saved' && (
                    <>
                        {loadingSaved ? (
                            <div className="text-center py-16">
                                <span className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin inline-block" />
                            </div>
                        ) : savedMesses.length === 0 ? (
                            <div className="text-center py-16">
                                <span className="text-6xl mb-4 block">❤️</span>
                                <h3 className="text-xl font-semibold mb-2">No saved messes yet</h3>
                                <p className="text-muted mb-4">Save your favorite messes to find them later</p>
                                <button onClick={() => setActiveTab('discover')} className="btn btn-primary">
                                    Discover Messes
                                </button>
                            </div>
                        ) : (
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {savedMesses.map((mess) => (
                                    <MessCard key={mess._id} mess={mess} />
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* Suggestions Tab */}
                {activeTab === 'suggestions' && (
                    <div className="space-y-8">
                        {/* Create Suggestion Form */}
                        <div className="card">
                            <h3 className="font-semibold mb-3">💡 Share Your Suggestion</h3>
                            <form onSubmit={handleSubmitSuggestion}>
                                <textarea
                                    className="input w-full mb-3"
                                    rows={3}
                                    placeholder="Share a food recommendation, must-try mess, or any helpful tip... (min 10 characters)"
                                    value={newSuggestion}
                                    onChange={(e) => setNewSuggestion(e.target.value)}
                                    maxLength={1000}
                                />
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted">{newSuggestion.length}/1000</span>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={submittingSuggestion || newSuggestion.length < 10}
                                    >
                                        {submittingSuggestion ? 'Sharing...' : 'Share Suggestion'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Most Liked Suggestions */}
                        {mostLikedSuggestions.length > 0 && (
                            <div>
                                <h3 className="font-semibold mb-4">🔥 Top Picks</h3>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    {mostLikedSuggestions.map((s) => (
                                        <SuggestionCard key={s._id} suggestion={s} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* All Suggestions with Filter */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold">💬 All Suggestions</h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setSuggestionFilter('recent')}
                                        className={`px-3 py-1 rounded-lg text-sm transition-all ${suggestionFilter === 'recent'
                                            ? 'bg-primary text-white'
                                            : 'bg-card border border-border hover:border-primary'
                                            }`}
                                    >
                                        🕐 Recent
                                    </button>
                                    <button
                                        onClick={() => setSuggestionFilter('mostLiked')}
                                        className={`px-3 py-1 rounded-lg text-sm transition-all ${suggestionFilter === 'mostLiked'
                                            ? 'bg-primary text-white'
                                            : 'bg-card border border-border hover:border-primary'
                                            }`}
                                    >
                                        👍 Most Liked
                                    </button>
                                </div>
                            </div>
                            {loadingSuggestions ? (
                                <div className="text-center py-8">
                                    <span className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin inline-block" />
                                </div>
                            ) : suggestions.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-muted">No suggestions yet. Be the first to share!</p>
                                </div>
                            ) : (
                                <div className="grid sm:grid-cols-2 gap-4">
                                    {(suggestionFilter === 'mostLiked'
                                        ? [...suggestions].sort((a, b) => b.likesCount - a.likesCount)
                                        : suggestions
                                    ).map((s) => (
                                        <SuggestionCard key={s._id} suggestion={s} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
