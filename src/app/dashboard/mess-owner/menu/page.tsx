'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks';

interface ThaliItem {
    id: string;
    itemName: string;
}

interface Thali {
    thaliId: string;
    thaliName: string;
    description?: string;
    price: number;
    items: ThaliItem[];
    averageRating?: number;
    totalRatings?: number;
    mealType?: 'afternoon' | 'evening'; // Only used for Regular Thali (index 0)
}


// Helper to ensure stable IDs for React keys
const normalizeThalis = (thalis: any[]): Thali[] => {
    return (thalis || []).map((thali) => ({
        ...thali,
        thaliId: thali.thaliId || thali._id || crypto.randomUUID(),
        items: (thali.items || []).map((item: any) => ({
            ...item,
            id: item.id || item._id || crypto.randomUUID(),
        })),
    }));
};

export default function ManageMenuPage() {
    const router = useRouter();
    const { user, token, isLoading: authLoading } = useAuth();

    const [messId, setMessId] = useState<string>('');
    const [thalis, setThalis] = useState<Thali[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [savingIndex, setSavingIndex] = useState<number | null>(null); // Track which single thali is saving
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchMess = useCallback(async () => {
        if (!token) return;
        try {
            const res = await fetch('/api/mess-owner/analytics', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const result = await res.json();
            if (result.success && result.data?.mess) {
                setMessId(result.data.mess.id);
                // Fetch full mess data for thalis
                const messRes = await fetch(`/api/messes/${result.data.mess.id}`);
                const messData = await messRes.json();
                if (messData.success) {
                    // Ensure every item has a stable id for React keying
                    const loadedThalis = normalizeThalis(messData.data?.thalis);
                    // Enforce first thali name to "Regular Thali"
                    if (loadedThalis.length > 0) {
                        loadedThalis[0].thaliName = 'Regular Thali';
                    }
                    setThalis(loadedThalis);
                }
            }
        } catch (error) {
            console.error('Failed to fetch mess:', error);
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
            fetchMess();
        }
    }, [authLoading, user, token, router, fetchMess]);

    // Add new thali
    const addThali = () => {
        const isFirstThali = thalis.length === 0;
        setThalis(prev => [
            ...prev,
            {
                thaliId: crypto.randomUUID(),
                thaliName: isFirstThali ? 'Regular Thali' : '',
                description: '',
                price: 0,
                items: [{ id: crypto.randomUUID(), itemName: '' }],
            },
        ]);
    };

    // Remove thali and save deletion immediately
    const removeThali = async (index: number) => {
        if (!confirm('Remove this thali? This will also delete all its ratings.')) return;
        
        const newThalis = thalis.filter((_, i) => i !== index);
        setThalis(newThalis); // Optimistic UI update

        if (!token || !messId) return;
        setIsSaving(true);
        setSaveMessage(null);

        // Enforce first thali name for the new array payload
        const thalisToSave = newThalis.map((t, i) =>
            i === 0 ? { ...t, thaliName: 'Regular Thali' } : t
        );

        try {
            const response = await fetch(`/api/messes/${messId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ thalis: thalisToSave }),
            });

            const result = await response.json();
            if (result.success) {
                setSaveMessage({ type: 'success', text: 'Thali removed successfully!' });
                if (result.data?.thalis) {
                    const updated = normalizeThalis(result.data.thalis);
                    if (updated.length > 0) updated[0].thaliName = 'Regular Thali';
                    setThalis(updated);
                }
            } else {
                setSaveMessage({ type: 'error', text: result.error || 'Failed to remove thali from server.' });
            }
        } catch {
            setSaveMessage({ type: 'error', text: 'Network error while removing.' });
        } finally {
            setIsSaving(false);
        }
    };

    // Update thali field
    const updateThali = (index: number, field: keyof Thali, value: string | number) => {
        setThalis(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
    };

    // Add item to thali
    const addItem = (thaliIndex: number) => {
        setThalis(prev => prev.map((t, i) =>
            i === thaliIndex ? { ...t, items: [...t.items, { id: crypto.randomUUID(), itemName: '' }] } : t
        ));
    };

    // Remove item from thali
    const removeItem = (thaliIndex: number, itemIndex: number) => {
        setThalis(prev => prev.map((t, i) =>
            i === thaliIndex ? { ...t, items: t.items.filter((_, j) => j !== itemIndex) } : t
        ));
    };

    // Update item field
    const updateItem = (thaliIndex: number, itemIndex: number, field: keyof ThaliItem, value: string | number) => {
        setThalis(prev => prev.map((t, i) =>
            i === thaliIndex ? {
                ...t,
                items: t.items.map((item, j) => j === itemIndex ? { ...item, [field]: value } : item),
            } : t
        ));
    };

    // Validate a single thali
    const validateThali = (thali: Thali): string | null => {
        if (!thali.thaliName.trim()) return 'Thali must have a name.';
        if (thali.price < 0) return 'Thali price cannot be negative.';
        for (const item of thali.items) {
            if (!item.itemName.trim()) return `Thali "${thali.thaliName}" has items without names.`;
        }
        return null;
    };

    // Save a single thali at a specific index
    const handleSaveSingle = async (index: number) => {
        if (!token || !messId) return;

        const thali = thalis[index];

        // Enforce first thali name
        const thaliToSave = index === 0 ? { ...thali, thaliName: 'Regular Thali' } : thali;

        const validationError = validateThali(thaliToSave);
        if (validationError) {
            setSaveMessage({ type: 'error', text: validationError });
            return;
        }

        setSavingIndex(index);
        setSaveMessage(null);

        try {
            const response = await fetch(`/api/messes/${messId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    thalis: [thaliToSave], // Send just this one thali
                    singleThaliIndex: index, // Tell backend which index to update
                }),
            });

            const result = await response.json();
            if (result.success) {
                setSaveMessage({ type: 'success', text: `"${thaliToSave.thaliName}" saved successfully!` });
                // Update thalis with server response
                if (result.data?.thalis) {
                    const updated = normalizeThalis(result.data.thalis);
                    if (updated.length > 0) updated[0].thaliName = 'Regular Thali';
                    setThalis(updated);
                }
            } else {
                setSaveMessage({ type: 'error', text: result.error || 'Failed to save thali.' });
            }
        } catch {
            setSaveMessage({ type: 'error', text: 'Network error. Please try again.' });
        } finally {
            setSavingIndex(null);
        }
    };

    // Save ALL thalis (full replace)
    const handleSaveAll = async () => {
        if (!token || !messId) return;

        // Validate all
        for (const thali of thalis) {
            const err = validateThali(thali);
            if (err) {
                setSaveMessage({ type: 'error', text: err });
                return;
            }
        }

        setIsSaving(true);
        setSaveMessage(null);

        // Enforce first thali name
        const thalisToSave = thalis.map((t, i) =>
            i === 0 ? { ...t, thaliName: 'Regular Thali' } : t
        );

        try {
            const response = await fetch(`/api/messes/${messId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ thalis: thalisToSave }),
            });

            const result = await response.json();
            if (result.success) {
                setSaveMessage({ type: 'success', text: 'All thalis saved successfully!' });
                if (result.data?.thalis) {
                    const updated = normalizeThalis(result.data.thalis);
                    if (updated.length > 0) updated[0].thaliName = 'Regular Thali';
                    setThalis(updated);
                }
            } else {
                setSaveMessage({ type: 'error', text: result.error || 'Failed to save menu.' });
            }
        } catch {
            setSaveMessage({ type: 'error', text: 'Network error. Please try again.' });
        } finally {
            setIsSaving(false);
        }
    };

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <span className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin inline-block mb-4" />
                    <p className="text-muted">Loading menu...</p>
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
                            ← Dashboard
                        </Link>
                        <h1 className="text-lg font-bold">Manage Menu</h1>
                        <button
                            onClick={handleSaveAll}
                            disabled={isSaving || savingIndex !== null}
                            className="btn btn-primary text-sm"
                        >
                            {isSaving ? 'Saving...' : '💾 Save All'}
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Save Message */}
                {saveMessage && (
                    <div className={`p-3 rounded-lg mb-6 text-sm ${saveMessage.type === 'success'
                        ? 'bg-success/10 text-success border border-success/30'
                        : 'bg-error/10 text-error border border-error/30'
                        }`}>
                        {saveMessage.text}
                    </div>
                )}

                {/* Thali Cards */}
                {thalis.length === 0 ? (
                    <div className="card text-center py-12">
                        <span className="text-5xl mb-4 block">🍽️</span>
                        <h2 className="text-xl font-bold mb-2">No Thalis Yet</h2>
                        <p className="text-muted mb-6">Add your first thali to start building your menu.</p>
                        <button onClick={addThali} className="btn btn-primary">
                            + Add First Thali
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {thalis.map((thali, tIdx) => (
                            <div key={thali.thaliId} className="card">
                                {/* Thali Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1 grid sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-muted mb-1 block">Thali Name *</label>
                                            <input
                                                type="text"
                                                className="input"
                                                placeholder="e.g., Regular Thali"
                                                value={tIdx === 0 ? 'Regular Thali' : thali.thaliName}
                                                onChange={e => updateThali(tIdx, 'thaliName', e.target.value)}
                                                disabled={tIdx === 0}
                                                style={tIdx === 0 ? { opacity: 0.7, cursor: 'not-allowed', fontWeight: 600 } : {}}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-muted mb-1 block">Price (₹) *</label>
                                            <input
                                                type="number"
                                                className="input"
                                                placeholder="0"
                                                value={thali.price || ''}
                                                onChange={e => updateThali(tIdx, 'price', Number(e.target.value))}
                                                min={0}
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeThali(tIdx)}
                                        className="text-error/60 hover:text-error ml-3 mt-5 text-lg"
                                        title="Remove thali"
                                    >
                                        ✕
                                    </button>
                                </div>

                                {/* Thali Description */}
                                <div className="mb-4">
                                    <label className="text-xs text-muted mb-1 block">Description (optional)</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="Brief description of this thali"
                                        value={thali.description || ''}
                                        onChange={e => updateThali(tIdx, 'description', e.target.value)}
                                    />
                                </div>

                                {/* Meal Type Toggle - ONLY for Regular Thali (index 0) */}
                                {tIdx === 0 && (
                                    <div className="mb-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                                        <label className="text-xs text-muted mb-3 block font-semibold">Select Meal Type (Regular Thali Only)</label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => updateThali(tIdx, 'mealType', 'afternoon')}
                                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                                                    thali.mealType === 'afternoon' || !thali.mealType
                                                        ? 'bg-primary text-white shadow-md'
                                                        : 'bg-card border border-border text-muted hover:border-primary'
                                                }`}
                                            >
                                                🟠 Afternoon
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updateThali(tIdx, 'mealType', 'evening')}
                                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                                                    thali.mealType === 'evening'
                                                        ? 'bg-primary text-white shadow-md'
                                                        : 'bg-card border border-border text-muted hover:border-primary'
                                                }`}
                                            >
                                                🔵 Evening
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Rating Badge (if rated) */}
                                {thali.averageRating !== undefined && thali.averageRating > 0 && (
                                    <div className="text-xs text-muted mb-3">
                                        ⭐ {thali.averageRating.toFixed(1)} ({thali.totalRatings} ratings)
                                    </div>
                                )}

                                {/* Items */}
                                <div className="border-t border-border pt-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-semibold text-muted">Items</h4>
                                        <button
                                            onClick={() => addItem(tIdx)}
                                            className="text-xs text-primary hover:text-primary/80"
                                        >
                                            + Add Item
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {thali.items.map((item, iIdx) => (
                                            <div key={item.id} className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    className="input flex-1"
                                                    placeholder="e.g., Roti, Dal, Rice..."
                                                    value={item.itemName}
                                                    onChange={e => updateItem(tIdx, iIdx, 'itemName', e.target.value)}
                                                />
                                                <button
                                                    onClick={() => removeItem(tIdx, iIdx)}
                                                    className="text-error/50 hover:text-error text-sm px-1"
                                                    disabled={thali.items.length <= 1}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Individual Save Button */}
                                <div className="mt-4 pt-3 border-t border-border flex justify-end">
                                    <button
                                        onClick={() => handleSaveSingle(tIdx)}
                                        disabled={isSaving || savingIndex !== null}
                                        className="btn btn-secondary text-sm flex items-center gap-2"
                                        style={{
                                            minWidth: '140px',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {savingIndex === tIdx ? (
                                            <>
                                                <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin inline-block" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>💾 Save {tIdx === 0 ? 'Regular Thali' : thali.thaliName || 'Thali'}</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Add Thali Button */}
                        <button
                            onClick={addThali}
                            className="w-full card border-dashed border-2 hover:border-primary text-muted hover:text-foreground transition-colors text-center py-6"
                        >
                            <span className="text-2xl block mb-1">+</span>
                            <span className="text-sm">Add Another Thali</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
