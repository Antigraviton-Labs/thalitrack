'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks';

export default function MenuManagePage() {
    const router = useRouter();
    const { user, token, isLoading: authLoading } = useAuth();

    const [menuItems, setMenuItems] = useState<string[]>(['']);
    const [description, setDescription] = useState('');
    const [thaliPrice, setThaliPrice] = useState<number | ''>('');
    const [existingMenu, setExistingMenu] = useState<{ items: string[]; description?: string; thaliPrice?: number; updatedAt?: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [messId, setMessId] = useState<string | null>(null);
    const [menuUploadTime, setMenuUploadTime] = useState<Date | null>(null);

    // Helper function for relative time
    const getRelativeTime = (date: Date | string): string => {
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
        return `${diffDay} days ago`;
    };

    // Check if menu is outdated (more than 24 hours old)
    const isMenuOutdated = (): boolean => {
        if (!menuUploadTime) return true;
        const now = new Date();
        const diffMs = now.getTime() - menuUploadTime.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        return diffHours >= 24;
    };

    const fetchCurrentMenu = useCallback(async () => {
        if (!token) return;

        try {
            // First get the mess
            const meResponse = await fetch('/api/auth/me', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const meData = await meResponse.json();

            if (meData.success && meData.data.mess) {
                setMessId(meData.data.mess.id);

                // Get today's menu
                const menuResponse = await fetch(`/api/messes/${meData.data.mess.id}/menu`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const menuData = await menuResponse.json();

                if (menuData.success && menuData.data.length > 0) {
                    const todayMenu = menuData.data[0];
                    setExistingMenu(todayMenu);
                    setMenuItems(todayMenu.items);
                    setDescription(todayMenu.description || '');
                    setThaliPrice(todayMenu.thaliPrice || '');
                    // Store the upload time
                    if (todayMenu.updatedAt) {
                        setMenuUploadTime(new Date(todayMenu.updatedAt));
                    } else if (todayMenu.createdAt) {
                        setMenuUploadTime(new Date(todayMenu.createdAt));
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch menu:', error);
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
            fetchCurrentMenu();
        }
    }, [authLoading, user, token, router, fetchCurrentMenu]);

    const handleAddItem = () => {
        if (menuItems.length < 20) {
            setMenuItems([...menuItems, '']);
        }
    };

    const handleRemoveItem = (index: number) => {
        if (menuItems.length > 1) {
            setMenuItems(menuItems.filter((_, i) => i !== index));
        }
    };

    const handleItemChange = (index: number, value: string) => {
        const newItems = [...menuItems];
        newItems[index] = value;
        setMenuItems(newItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!messId || !token) {
            setMessage({ type: 'error', text: 'Please create a mess profile first' });
            return;
        }

        const filteredItems = menuItems.filter((item) => item.trim() !== '');

        if (filteredItems.length === 0) {
            setMessage({ type: 'error', text: 'Please add at least one menu item' });
            return;
        }

        setIsSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await fetch(`/api/messes/${messId}/menu`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    date: new Date().toISOString(),
                    items: filteredItems,
                    description: description.trim() || undefined,
                    thaliPrice: thaliPrice !== '' ? Number(thaliPrice) : undefined,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setMessage({ type: 'success', text: data.message || 'Menu saved successfully!' });
                setExistingMenu({ items: filteredItems, description });
                setMenuUploadTime(new Date()); // Update the upload time to now
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to save menu' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Network error. Please try again.' });
        } finally {
            setIsSaving(false);
        }
    };

    if (authLoading || isLoading) {
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
            {/* Header */}
            <header className="bg-card border-b border-border sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/dashboard/mess-owner" className="flex items-center gap-2 text-muted hover:text-foreground">
                            ← Back to Dashboard
                        </Link>
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">📋 Today&apos;s Menu</h1>
                    <p className="text-muted">
                        Update your daily thali menu. Students can see this on your mess profile.
                    </p>
                </div>

                {message.text && (
                    <div className={`p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                        }`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="card">
                    <h2 className="text-xl font-semibold mb-4">Menu Items</h2>
                    <p className="text-sm text-muted mb-4">
                        Add items that are part of today&apos;s thali (e.g., Roti, Dal, Rice, Sabzi)
                    </p>

                    <div className="space-y-3 mb-6">
                        {menuItems.map((item, index) => (
                            <div key={index} className="flex gap-2">
                                <input
                                    type="text"
                                    value={item}
                                    onChange={(e) => handleItemChange(index, e.target.value)}
                                    placeholder={`Item ${index + 1} (e.g., ${['Roti', 'Dal Fry', 'Jeera Rice', 'Mix Veg', 'Salad'][index % 5]})`}
                                    className="input flex-1"
                                    maxLength={100}
                                />
                                {menuItems.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveItem(index)}
                                        className="px-3 py-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                                        title="Remove item"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {menuItems.length < 20 && (
                        <button
                            type="button"
                            onClick={handleAddItem}
                            className="btn btn-secondary mb-6"
                        >
                            + Add Another Item
                        </button>
                    )}

                    <div className="mb-6">
                        <label className="label">Description (Optional)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add any special notes about today's menu..."
                            className="input min-h-[100px] resize-none"
                            maxLength={500}
                        />
                    </div>

                    <div className="mb-6">
                        <label className="label">Thali Price (₹)</label>
                        <input
                            type="number"
                            value={thaliPrice}
                            onChange={(e) => setThaliPrice(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="e.g., 80"
                            className="input w-full max-w-xs"
                            min={0}
                            max={10000}
                        />
                        <p className="text-xs text-muted mt-1">Today&apos;s thali price for students</p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-border">
                        <div>
                            <span className="text-sm text-muted">
                                {menuItems.filter(i => i.trim()).length} items
                            </span>
                            {menuUploadTime && (
                                <span className={`text-sm ml-3 ${isMenuOutdated() ? 'text-error font-medium' : 'text-muted'}`}>
                                    Last updated: {getRelativeTime(menuUploadTime)}
                                </span>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className={`btn ${isMenuOutdated() ? 'bg-error hover:bg-error/90 text-white' : 'btn-primary'}`}
                        >
                            {isSaving ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Saving...
                                </span>
                            ) : isMenuOutdated() ? (
                                '⚠️ Update Today\'s Menu Now!'
                            ) : existingMenu ? (
                                'Update Menu'
                            ) : (
                                'Publish Menu'
                            )}
                        </button>
                    </div>
                </form>

                {existingMenu && (
                    <div className={`card mt-6 ${isMenuOutdated() ? 'bg-error/5 border-error/20' : 'bg-success/5 border-success/20'}`}>
                        {isMenuOutdated() ? (
                            <>
                                <h3 className="font-semibold text-error mb-2">⚠️ Menu Outdated</h3>
                                <p className="text-sm text-muted">
                                    Your menu hasn't been updated in over 24 hours. Please update it so students can see today's thali!
                                </p>
                            </>
                        ) : (
                            <>
                                <h3 className="font-semibold text-success mb-2">✓ Menu Published</h3>
                                <p className="text-sm text-muted">
                                    Your menu is live and students can see it on your profile.
                                    {menuUploadTime && ` Updated ${getRelativeTime(menuUploadTime)}.`}
                                </p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
