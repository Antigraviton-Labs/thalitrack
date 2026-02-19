'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';

interface DashboardData {
    mess: {
        id: string;
        name: string;
        isApproved: boolean;
        averageRating: number;
        totalRatings: number;
        thaliRating: number;
        thaliTotalRatings: number;
        viewCount: number;
        status: 'open' | 'closed';
        menuEnabled: 'yes' | 'no';
    } | null;
    subscription: {
        status: string;
        isValid: boolean;
        daysLeft: number;
        trialEndsAt: string;
    } | null;
    daily: Array<{
        date: string;
        messViews: number;
        menuViews: number;
    }>;
    monthly: {
        messViews: number;
        menuViews: number;
        totalViews: number;
    };
}

interface Suggestion {
    _id: string;
    content: string;
    user: { name: string } | null;
    likesCount: number;
    dislikesCount: number;
    createdAt: string;
}

type AnalyticsPeriod = 'today' | '7d' | '30d';

export default function MessOwnerDashboard() {
    const router = useRouter();
    const { user, token, isLoading: authLoading, logout } = useAuth();

    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsPeriod>('7d');
    const [statusToggling, setStatusToggling] = useState(false);
    const [deletingSuggestionId, setDeletingSuggestionId] = useState<string | null>(null);

    const fetchDashboardData = useCallback(async (period: AnalyticsPeriod = '7d') => {
        if (!token) return;

        try {
            const response = await fetch(`/api/mess-owner/analytics?period=${period}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const result = await response.json();
            if (result.success) {
                setData(result.data);

                // Fetch suggestions for this mess
                if (result.data?.mess?.id) {
                    const suggestionsRes = await fetch(`/api/suggestions?messId=${result.data.mess.id}&limit=10`);
                    const suggestionsData = await suggestionsRes.json();
                    if (suggestionsData.success) {
                        setSuggestions(suggestionsData.data.suggestions || []);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    // Handle period change
    const handlePeriodChange = async (period: AnalyticsPeriod) => {
        setAnalyticsPeriod(period);
        if (!token) return;
        try {
            const response = await fetch(`/api/mess-owner/analytics?period=${period}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const result = await response.json();
            if (result.success) {
                setData(result.data);
            }
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        }
    };

    // Update mess status
    const updateMessStatus = async (newStatus: 'open' | 'closed') => {
        if (!data?.mess || statusToggling || !token || data.mess.status === newStatus) return;

        const oldStatus = data.mess.status;

        // Optimistic update
        setStatusToggling(true);
        setData(prev => prev ? {
            ...prev,
            mess: prev.mess ? { ...prev.mess, status: newStatus } : null,
        } : null);

        try {
            const response = await fetch(`/api/messes/${data.mess.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: newStatus }),
            });

            const result = await response.json();
            if (!result.success) {
                // Rollback on failure
                setData(prev => prev ? {
                    ...prev,
                    mess: prev.mess ? { ...prev.mess, status: oldStatus } : null,
                } : null);
                alert('Failed to update status. Please try again.');
            }
        } catch {
            // Rollback on error
            setData(prev => prev ? {
                ...prev,
                mess: prev.mess ? { ...prev.mess, status: oldStatus } : null,
            } : null);
            alert('Network error. Please try again.');
        } finally {
            setStatusToggling(false);
        }
    };

    // Delete suggestion (soft-delete)
    const handleDeleteSuggestion = async (suggestionId: string) => {
        if (!confirm('Delete this suggestion?')) return;
        if (!token) return;

        setDeletingSuggestionId(suggestionId);
        try {
            const response = await fetch(`/api/suggestions/${suggestionId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            const result = await response.json();
            if (result.success) {
                setSuggestions(prev => prev.filter(s => s._id !== suggestionId));
            } else {
                alert(result.error || 'Failed to delete suggestion');
            }
        } catch {
            alert('Failed to delete suggestion. Please try again.');
        } finally {
            setDeletingSuggestionId(null);
        }
    };

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }

        if (!authLoading && user?.role !== 'messOwner') {
            router.push('/');
            return;
        }

        if (token) {
            fetchDashboardData(analyticsPeriod);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, user, token, router]);

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <span className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin inline-block mb-4" />
                    <p className="text-muted">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="bg-card border-b border-border sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/" className="flex items-center gap-2">
                            <span className="text-2xl">🍽️</span>
                            <span className="text-xl font-bold gradient-text">ThaliTrack</span>
                        </Link>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-muted hidden sm:block">
                                Welcome, {user?.name}
                            </span>
                            <button onClick={logout} className="btn btn-secondary text-sm">
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Subscription Alert */}
                {data?.subscription && !data.subscription.isValid && (
                    <div className="bg-error/10 border border-error/30 text-error p-4 rounded-xl mb-8 flex items-center justify-between">
                        <div>
                            <strong>⚠️ Subscription Expired</strong>
                            <p className="text-sm">Your subscription has ended. Please renew to continue using all features.</p>
                        </div>
                        <Link href="/dashboard/mess-owner/subscription" className="btn btn-primary">
                            Renew Now
                        </Link>
                    </div>
                )}

                {data?.subscription?.status === 'trial' && data.subscription.daysLeft <= 7 && (
                    <div className="bg-warning/10 border border-warning/30 text-warning p-4 rounded-xl mb-8">
                        <strong>🎁 Trial Ending Soon!</strong>
                        <p className="text-sm">Your free trial ends in {data.subscription.daysLeft} days. Subscribe now to continue reaching students.</p>
                        <Link href="/dashboard/mess-owner/subscription" className="btn btn-primary mt-2">
                            Subscribe Now - ₹500/month
                        </Link>
                    </div>
                )}

                {/* Mess Not Created */}
                {!data?.mess && (
                    <div className="card text-center py-16">
                        <span className="text-6xl mb-4 block">🍳</span>
                        <h2 className="text-2xl font-bold mb-2">Set Up Your Mess Profile</h2>
                        <p className="text-muted mb-6 max-w-md mx-auto">
                            Create your mess profile to start reaching hungry students near you.
                        </p>
                        <Link href="/dashboard/mess-owner/mess/create" className="btn btn-primary">
                            Create Mess Profile
                        </Link>
                    </div>
                )}

                {/* Dashboard Content */}
                {data?.mess && (
                    <>
                        {/* Mess Name + Status Toggle */}
                        <div className="flex items-center justify-between mb-6">
                            <h1 className="text-2xl font-bold">{data.mess.name}</h1>
                            <div className="flex items-center gap-3 bg-secondary/30 p-1.5 rounded-lg border border-border/50">
                                <span className="text-sm font-medium text-muted px-2">Mess Status:</span>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => updateMessStatus('open')}
                                        disabled={statusToggling || data.mess.status === 'open'}
                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${data.mess.status === 'open'
                                            ? 'bg-success text-white shadow-sm ring-1 ring-success/50'
                                            : 'text-muted hover:text-foreground hover:bg-secondary'
                                            }`}
                                    >
                                        Open
                                    </button>
                                    <button
                                        onClick={() => updateMessStatus('closed')}
                                        disabled={statusToggling || data.mess.status === 'closed'}
                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${data.mess.status === 'closed'
                                            ? 'bg-error text-white shadow-sm ring-1 ring-error/50'
                                            : 'text-muted hover:text-foreground hover:bg-secondary'
                                            }`}
                                    >
                                        Closed
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            <div className="card">
                                <div className="text-3xl font-bold gradient-text">{data.monthly.totalViews}</div>
                                <div className="text-sm text-muted">Total Views (30d)</div>
                            </div>
                            <div className="card">
                                <div className="text-3xl font-bold text-yellow-500">
                                    {data.mess.averageRating.toFixed(1)} ⭐
                                </div>
                                <div className="text-sm text-muted">Mess Rating ({data.mess.totalRatings})</div>
                            </div>
                            <div className="card">
                                <div className="text-3xl font-bold text-orange-500">
                                    {data.mess.thaliRating > 0 ? data.mess.thaliRating.toFixed(1) : '—'} {data.mess.thaliRating > 0 ? '⭐' : ''}
                                </div>
                                <div className="text-sm text-muted">
                                    Thali Rating {data.mess.thaliTotalRatings > 0 ? `(${data.mess.thaliTotalRatings})` : ''}
                                </div>
                            </div>
                            <div className="card">
                                <div className={`text-3xl font-bold ${data.mess.isApproved ? 'text-success' : 'text-warning'}`}>
                                    {data.mess.isApproved ? '✓' : '⏳'}
                                </div>
                                <div className="text-sm text-muted">
                                    {data.mess.isApproved ? 'Approved' : 'Pending Approval'}
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            {data.mess.menuEnabled === 'yes' && (
                                <Link href="/dashboard/mess-owner/menu" className="card hover:border-primary transition-colors">
                                    <span className="text-3xl mb-2 block">📋</span>
                                    <h3 className="font-semibold">Manage Menu</h3>
                                    <p className="text-sm text-muted">Manage thalis &amp; menu items</p>
                                </Link>
                            )}
                            <Link href={`/dashboard/mess-owner/mess/edit`} className="card hover:border-primary transition-colors">
                                <span className="text-3xl mb-2 block">🏠</span>
                                <h3 className="font-semibold">Edit Profile</h3>
                                <p className="text-sm text-muted">Update mess details</p>
                            </Link>
                            <Link href="/dashboard/mess-owner/photos" className="card hover:border-primary transition-colors">
                                <span className="text-3xl mb-2 block">📸</span>
                                <h3 className="font-semibold">Manage Photos</h3>
                                <p className="text-sm text-muted">Upload mess photos</p>
                            </Link>
                            <Link href="/dashboard/mess-owner/subscription" className="card hover:border-primary transition-colors">
                                <span className="text-3xl mb-2 block">💳</span>
                                <h3 className="font-semibold">Subscription</h3>
                                <p className="text-sm text-muted">
                                    {data.subscription?.status === 'trial'
                                        ? `Trial: ${data.subscription.daysLeft} days left`
                                        : data.subscription?.status}
                                </p>
                            </Link>
                        </div>

                        {/* Analytics Graph */}
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">📊 Analytics</h2>
                            <div className="flex gap-1 bg-card rounded-lg p-1 border border-border">
                                {([
                                    { label: 'Today', value: 'today' as AnalyticsPeriod },
                                    { label: '7 Days', value: '7d' as AnalyticsPeriod },
                                    { label: '30 Days', value: '30d' as AnalyticsPeriod },
                                ]).map(({ label, value }) => (
                                    <button
                                        key={value}
                                        onClick={() => handlePeriodChange(value)}
                                        className={`px-3 py-1.5 text-sm rounded-md transition-colors font-medium ${analyticsPeriod === value
                                            ? 'bg-primary text-white'
                                            : 'text-muted hover:text-foreground'
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="card mb-8">
                            {data.daily.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={data.daily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorMessViews" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--color-primary, #7c3aed)" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="var(--color-primary, #7c3aed)" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorMenuViews" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #333)" />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={(date: string) =>
                                                new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                                            }
                                            tick={{ fontSize: 12 }}
                                            stroke="var(--color-muted, #888)"
                                        />
                                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--color-muted, #888)" />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'var(--color-card, #1a1a2e)',
                                                border: '1px solid var(--color-border, #333)',
                                                borderRadius: '8px',
                                                color: 'var(--color-foreground, #fff)',
                                            }}
                                            labelFormatter={(date: any) =>
                                                new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
                                            }
                                        />
                                        <Legend />
                                        <Area
                                            type="monotone"
                                            dataKey="messViews"
                                            name="Profile Views"
                                            stroke="var(--color-primary, #7c3aed)"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorMessViews)"
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="menuViews"
                                            name="Menu Views"
                                            stroke="#f97316"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorMenuViews)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-center text-muted py-12">
                                    No analytics data yet. Views will appear here once students start discovering your mess.
                                </div>
                            )}
                        </div>

                        {/* Student Suggestions */}
                        <h2 className="text-xl font-semibold mt-8 mb-4">💡 Student Suggestions</h2>
                        <div className="card">
                            {suggestions.length > 0 ? (
                                <div className="divide-y divide-border">
                                    {suggestions.map((s) => (
                                        <div key={s._id} className="py-4 first:pt-0 last:pb-0">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1">
                                                    <p className="text-sm mb-2">{s.content}</p>
                                                    <div className="flex items-center text-xs text-muted gap-3">
                                                        <span>{s.user?.name || 'Anonymous'} • {new Date(s.createdAt).toLocaleDateString()}</span>
                                                        <span>👍 {s.likesCount} • 👎 {s.dislikesCount}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteSuggestion(s._id)}
                                                    disabled={deletingSuggestionId === s._id}
                                                    className="text-error/60 hover:text-error text-sm px-2 py-1 rounded hover:bg-error/10 transition-colors flex-shrink-0"
                                                    title="Delete suggestion"
                                                >
                                                    {deletingSuggestionId === s._id ? '...' : '🗑️'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-muted py-6">
                                    No suggestions yet. Students can share feedback about your mess here.
                                </p>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
