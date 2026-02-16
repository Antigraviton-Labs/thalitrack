'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks';

interface AdminStats {
    overview: {
        totalUsers: number;
        totalStudents: number;
        totalMessOwners: number;
        totalMesses: number;
        approvedMesses: number;
        pendingMesses: number;
        activeSubscriptions: number;
        trialSubscriptions: number;
        totalRatings: number;
        monthlyRevenue: number;
    };
    today: {
        messViews: number;
        menuViews: number;
    };
    pendingApproval: Array<{
        _id: string;
        name: string;
        description?: string;
        address: string;
        contactPhone?: string;
        contactWhatsApp?: string;
        capacity?: number;
        monthlyPrice?: number;
        messType?: 'veg' | 'nonVeg' | 'both';
        createdAt: string;
        ownerId: { name: string; email: string };
    }>;
    recentUsers: Array<{
        _id: string;
        name: string;
        email: string;
        role: string;
        createdAt: string;
    }>;
    topMesses: Array<{
        _id: string;
        name: string;
        averageRating: number;
        totalRatings: number;
        viewCount: number;
    }>;
}

export default function AdminDashboard() {
    const router = useRouter();
    const { user, token, isLoading: authLoading, logout } = useAuth();

    const [stats, setStats] = useState<AdminStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'pending' | 'users'>('overview');
    const [expandedMess, setExpandedMess] = useState<string | null>(null);

    const fetchStats = useCallback(async () => {
        if (!token) return;

        try {
            const response = await fetch('/api/admin/stats', {
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await response.json();
            if (data.success) {
                setStats(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch admin stats:', error);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }

        if (!authLoading && user?.role !== 'admin') {
            router.push('/');
            return;
        }

        if (token) {
            fetchStats();
        }
    }, [authLoading, user, token, router, fetchStats]);

    const handleApproveMess = async (messId: string) => {
        try {
            const response = await fetch(`/api/admin/messes/${messId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ isApproved: true }),
            });

            if (response.ok) {
                fetchStats(); // Refresh data
            }
        } catch (error) {
            console.error('Failed to approve mess:', error);
        }
    };

    const handleBlockMess = async (messId: string) => {
        try {
            const response = await fetch(`/api/admin/messes/${messId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ isActive: false }),
            });

            if (response.ok) {
                fetchStats();
            }
        } catch (error) {
            console.error('Failed to block mess:', error);
        }
    };

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <span className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin inline-block mb-4" />
                    <p className="text-muted">Loading admin dashboard...</p>
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
                            <span className="badge badge-primary ml-2">Admin</span>
                        </Link>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-muted hidden sm:block">
                                {user?.name}
                            </span>
                            <button onClick={logout} className="btn btn-secondary text-sm">
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="card">
                        <div className="text-3xl font-bold gradient-text">{stats?.overview.totalUsers || 0}</div>
                        <div className="text-sm text-muted">Total Users</div>
                    </div>
                    <div className="card">
                        <div className="text-3xl font-bold gradient-text">{stats?.overview.totalMesses || 0}</div>
                        <div className="text-sm text-muted">Total Messes</div>
                    </div>
                    <div className="card">
                        <div className="text-3xl font-bold text-success">₹{(stats?.overview.monthlyRevenue || 0).toLocaleString()}</div>
                        <div className="text-sm text-muted">Monthly Revenue</div>
                    </div>
                    <div className="card">
                        <div className="text-3xl font-bold text-warning">{stats?.overview.pendingMesses || 0}</div>
                        <div className="text-sm text-muted">Pending Approval</div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-border mb-6">
                    <div className="flex gap-6">
                        {[
                            { id: 'overview', label: 'Overview' },
                            { id: 'pending', label: `Pending (${stats?.overview.pendingMesses || 0})` },
                            { id: 'users', label: 'Users' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                className={`pb-3 font-medium transition-colors ${activeTab === tab.id
                                    ? 'text-primary border-b-2 border-primary'
                                    : 'text-muted hover:text-foreground'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <div className="grid lg:grid-cols-2 gap-6">
                        {/* Today's Stats */}
                        <div className="card">
                            <h3 className="font-semibold mb-4">Today&apos;s Activity</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-card rounded-lg">
                                    <div className="text-2xl font-bold">{stats?.today.messViews || 0}</div>
                                    <div className="text-sm text-muted">Profile Views</div>
                                </div>
                                <div className="p-4 bg-card rounded-lg">
                                    <div className="text-2xl font-bold">{stats?.today.menuViews || 0}</div>
                                    <div className="text-sm text-muted">Menu Views</div>
                                </div>
                            </div>
                        </div>

                        {/* Subscription Stats */}
                        <div className="card">
                            <h3 className="font-semibold mb-4">Subscriptions</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-success/10 rounded-lg">
                                    <div className="text-2xl font-bold text-success">{stats?.overview.activeSubscriptions || 0}</div>
                                    <div className="text-sm text-muted">Active</div>
                                </div>
                                <div className="p-4 bg-warning/10 rounded-lg">
                                    <div className="text-2xl font-bold text-warning">{stats?.overview.trialSubscriptions || 0}</div>
                                    <div className="text-sm text-muted">On Trial</div>
                                </div>
                            </div>
                        </div>

                        {/* Top Messes */}
                        <div className="card lg:col-span-2">
                            <h3 className="font-semibold mb-4">Top Rated Messes</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-left text-sm text-muted border-b border-border">
                                            <th className="pb-2">Name</th>
                                            <th className="pb-2">Rating</th>
                                            <th className="pb-2">Reviews</th>
                                            <th className="pb-2">Views</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats?.topMesses.map((mess) => (
                                            <tr key={mess._id} className="border-b border-border last:border-0">
                                                <td className="py-3">{mess.name}</td>
                                                <td className="py-3">⭐ {mess.averageRating.toFixed(1)}</td>
                                                <td className="py-3">{mess.totalRatings}</td>
                                                <td className="py-3">{mess.viewCount}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'pending' && (
                    <div className="card">
                        <h3 className="font-semibold mb-4">Messes Pending Approval</h3>
                        {stats?.pendingApproval && stats.pendingApproval.length > 0 ? (
                            <div className="space-y-4">
                                {stats.pendingApproval.map((mess) => (
                                    <div key={mess._id} className="p-4 border border-border rounded-lg">
                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-semibold">{mess.name}</h4>
                                                    {mess.messType && (
                                                        <span className={`badge text-xs ${mess.messType === 'veg' ? 'badge-success' :
                                                            mess.messType === 'nonVeg' ? 'badge-error' : 'badge-warning'}`}>
                                                            {mess.messType === 'veg' ? '🥬 Veg' :
                                                                mess.messType === 'nonVeg' ? '🍗 Non-Veg' : '🍽️ Both'}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted">{mess.address}</p>
                                                <p className="text-xs text-muted mt-1">
                                                    Owner: {mess.ownerId.name} ({mess.ownerId.email})
                                                </p>
                                                <p className="text-xs text-muted">
                                                    Applied: {new Date(mess.createdAt).toLocaleDateString()}
                                                </p>

                                                {/* Expand/Collapse Button */}
                                                <button
                                                    onClick={() => setExpandedMess(expandedMess === mess._id ? null : mess._id)}
                                                    className="text-primary text-xs mt-2 hover:underline"
                                                >
                                                    {expandedMess === mess._id ? '▲ Hide Details' : '▼ View Full Details'}
                                                </button>

                                                {/* Expanded Details */}
                                                {expandedMess === mess._id && (
                                                    <div className="mt-4 p-3 bg-background rounded-lg text-sm space-y-2">
                                                        {mess.description && (
                                                            <p><span className="font-medium">Description:</span> {mess.description}</p>
                                                        )}
                                                        {mess.contactPhone && (
                                                            <p><span className="font-medium">Phone:</span> {mess.contactPhone}</p>
                                                        )}
                                                        {mess.contactWhatsApp && (
                                                            <p><span className="font-medium">WhatsApp:</span> {mess.contactWhatsApp}</p>
                                                        )}
                                                        {mess.capacity && (
                                                            <p><span className="font-medium">Capacity:</span> {mess.capacity} students</p>
                                                        )}
                                                        {mess.monthlyPrice && (
                                                            <p><span className="font-medium">Monthly Price:</span> ₹{mess.monthlyPrice}</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-2 flex-shrink-0">
                                                <button
                                                    onClick={() => handleApproveMess(mess._id)}
                                                    className="btn btn-primary text-sm"
                                                >
                                                    ✓ Approve
                                                </button>
                                                <button
                                                    onClick={() => handleBlockMess(mess._id)}
                                                    className="btn btn-secondary text-error text-sm"
                                                >
                                                    ✕ Reject
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted text-center py-8">No messes pending approval</p>
                        )}
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="card">
                        <h3 className="font-semibold mb-4">Recent Users</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-sm text-muted border-b border-border">
                                        <th className="pb-2">Name</th>
                                        <th className="pb-2">Email</th>
                                        <th className="pb-2">Role</th>
                                        <th className="pb-2">Joined</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats?.recentUsers.map((u) => (
                                        <tr key={u._id} className="border-b border-border last:border-0">
                                            <td className="py-3">{u.name}</td>
                                            <td className="py-3">{u.email}</td>
                                            <td className="py-3">
                                                <span className={`badge ${u.role === 'student' ? 'badge-primary' :
                                                    u.role === 'messOwner' ? 'badge-warning' :
                                                        'badge-success'
                                                    }`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="py-3">{new Date(u.createdAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
