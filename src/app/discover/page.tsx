'use client';

import { useState, useEffect, useCallback } from 'react';
import { Navbar, Footer } from '@/components/layouts';
import { MessCard } from '@/components/ui';
import { useLocation, useAuth } from '@/hooks';
import { MessWithDistance } from '@/types';

export default function DiscoverPage() {
    const { latitude, longitude } = useLocation();
    const { token, user } = useAuth();

    const [messes, setMesses] = useState<MessWithDistance[]>([]);
    const [savedMessIds, setSavedMessIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({
        sortBy: 'distance' as 'distance' | 'rating' | 'price',
        messType: '' as '' | 'veg' | 'nonVeg' | 'both',
        maxPrice: '',
        minRating: '',
    });

    const fetchSavedMesses = useCallback(async () => {
        if (!token) return;
        try {
            const response = await fetch('/api/users/saved', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const result = await response.json();
            if (result.success) {
                setSavedMessIds(new Set((result.data || []).map((m: any) => m._id)));
            }
        } catch (error) {
            console.error('Failed to fetch saved messes:', error);
        }
    }, [token]);

    const fetchMesses = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();

            if (latitude && longitude) {
                params.append('latitude', latitude.toString());
                params.append('longitude', longitude.toString());
            }
            if (searchQuery) params.append('query', searchQuery);
            if (filters.sortBy) params.append('sortBy', filters.sortBy);
            if (filters.messType) params.append('messType', filters.messType);
            if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
            if (filters.minRating) params.append('minRating', filters.minRating);
            params.append('limit', '20');

            const response = await fetch(`/api/messes?${params.toString()}`);
            const data = await response.json();

            if (data.success) {
                setMesses(data.data);
            } else {
                setError(data.error || 'Failed to fetch messes');
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [latitude, longitude, searchQuery, filters]);

    useEffect(() => {
        fetchMesses();
    }, [fetchMesses]);

    useEffect(() => {
        if (token) {
            fetchSavedMesses();
        }
    }, [token, fetchSavedMesses]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchMesses();
    };

    const handleSaveToggle = async (messId: string) => {
        if (!token) return;

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
            }
        } catch (error) {
            console.error('Save error:', error);
        }
    };

    return (
        <>
            <Navbar />
            <main className="min-h-screen pt-20 pb-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold mb-2">Discover Messes</h1>
                        <p className="text-muted">
                            Find the perfect thali near you
                        </p>
                    </div>

                    {/* Search & Filters */}
                    <div className="card mb-8">
                        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
                            {/* Search Input */}
                            <div className="flex-1">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by mess name, menu items..."
                                    className="input w-full"
                                />
                            </div>

                            {/* Filters */}
                            <div className="flex flex-wrap gap-3">
                                <select
                                    value={filters.sortBy}
                                    onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value as typeof filters.sortBy }))}
                                    className="input w-auto"
                                >
                                    <option value="distance">Nearest</option>
                                    <option value="rating">Top Rated</option>
                                    <option value="price">Lowest Price</option>
                                </select>

                                <select
                                    value={filters.messType}
                                    onChange={(e) => setFilters((prev) => ({ ...prev, messType: e.target.value as typeof filters.messType }))}
                                    className="input w-auto"
                                >
                                    <option value="">All Types</option>
                                    <option value="veg">Veg Only</option>
                                    <option value="nonVeg">Non-Veg</option>
                                    <option value="both">Both</option>
                                </select>

                                <button type="submit" className="btn btn-primary">
                                    🔍 Search
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Results */}
                    {isLoading ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="card p-0 overflow-hidden">
                                    <div className="h-48 skeleton" />
                                    <div className="p-4 space-y-3">
                                        <div className="h-6 skeleton rounded w-3/4" />
                                        <div className="h-4 skeleton rounded w-1/2" />
                                        <div className="h-4 skeleton rounded w-full" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className="text-center py-20">
                            <span className="text-6xl mb-4 block">😕</span>
                            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
                            <button onClick={fetchMesses} className="btn btn-primary mt-4">
                                Try Again
                            </button>
                        </div>
                    ) : messes.length === 0 ? (
                        <div className="text-center py-20">
                            <span className="text-6xl mb-4 block">🍽️</span>
                            <h2 className="text-xl font-semibold mb-2">No messes found</h2>
                            <p className="text-muted">
                                Try adjusting your search or filters
                            </p>
                        </div>
                    ) : (
                        <>
                            <p className="text-muted mb-4">{messes.length} messes found</p>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {messes.map((mess) => (
                                    <MessCard
                                        key={mess._id}
                                        mess={mess}
                                        isSaved={savedMessIds.has(mess._id)}
                                        onSaveToggle={handleSaveToggle}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </main>
            <Footer />
        </>
    );
}
