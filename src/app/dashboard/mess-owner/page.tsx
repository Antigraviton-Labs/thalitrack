'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks';

interface DashboardData {
    mess: {
        id: string;
        name: string;
        isApproved: boolean;
        averageRating: number;
        totalRatings: number;
        viewCount: number;
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
        uniqueStudents: number;
    }>;
    monthly: {
        messViews: number;
        menuViews: number;
        uniqueStudents: number;
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

export default function MessOwnerDashboard() {
    const router = useRouter();
    const { user, token, isLoading: authLoading, logout } = useAuth();

    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

    const fetchDashboardData = useCallback(async () => {
        if (!token) return;

        try {
            const response = await fetch('/api/mess-owner/analytics', {
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
            fetchDashboardData();
        }
    }, [authLoading, user, token, router, fetchDashboardData]);

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
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            <div className="card">
                                <div className="text-3xl font-bold gradient-text">{data.monthly.totalViews}</div>
                                <div className="text-sm text-muted">Total Views (30 days)</div>
                            </div>
                            <div className="card">
                                <div className="text-3xl font-bold gradient-text">{data.monthly.uniqueStudents}</div>
                                <div className="text-sm text-muted">Unique Students</div>
                            </div>
                            <div className="card">
                                <div className="text-3xl font-bold text-yellow-500">
                                    {data.mess.averageRating.toFixed(1)} ⭐
                                </div>
                                <div className="text-sm text-muted">{data.mess.totalRatings} Ratings</div>
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
                            <Link href="/dashboard/mess-owner/menu" className="card hover:border-primary transition-colors">
                                <span className="text-3xl mb-2 block">📋</span>
                                <h3 className="font-semibold">Update Menu</h3>
                                <p className="text-sm text-muted">Add today&apos;s thali menu</p>
                            </Link>
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

                        {/* Recent Analytics */}
                        <h2 className="text-xl font-semibold mb-4">Last 7 Days</h2>
                        <div className="card overflow-x-auto">
                            <table className="w-full min-w-[400px]">
                                <thead>
                                    <tr className="text-left text-sm text-muted border-b border-border">
                                        <th className="pb-3 font-medium">Date</th>
                                        <th className="pb-3 font-medium">Profile Views</th>
                                        <th className="pb-3 font-medium">Menu Views</th>
                                        <th className="pb-3 font-medium">Unique Students</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.daily.length > 0 ? (
                                        data.daily.map((day) => (
                                            <tr key={day.date} className="border-b border-border last:border-0">
                                                <td className="py-3">
                                                    {new Date(day.date).toLocaleDateString('en-IN', {
                                                        weekday: 'short',
                                                        month: 'short',
                                                        day: 'numeric',
                                                    })}
                                                </td>
                                                <td className="py-3">{day.messViews}</td>
                                                <td className="py-3">{day.menuViews}</td>
                                                <td className="py-3">{day.uniqueStudents}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="py-8 text-center text-muted">
                                                No analytics data yet. Views will appear here once students start discovering your mess.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Student Suggestions */}
                        <h2 className="text-xl font-semibold mt-8 mb-4">💡 Student Suggestions</h2>
                        <div className="card">
                            {suggestions.length > 0 ? (
                                <div className="divide-y divide-border">
                                    {suggestions.map((s) => (
                                        <div key={s._id} className="py-4 first:pt-0 last:pb-0">
                                            <p className="text-sm mb-2">{s.content}</p>
                                            <div className="flex items-center justify-between text-xs text-muted">
                                                <span>{s.user?.name || 'Anonymous'} • {new Date(s.createdAt).toLocaleDateString()}</span>
                                                <span>👍 {s.likesCount} • 👎 {s.dislikesCount}</span>
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
