'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks';

interface MessData {
    _id: string;
    name: string;
    description: string;
    address: string;
    latitude: number;
    longitude: number;
    contactPhone: string;
    contactWhatsApp?: string;
    capacity: number;
    monthlyPrice: number;
    messType: 'veg' | 'nonVeg' | 'both';
}

export default function EditMessPage() {
    const router = useRouter();
    const { user, token, isLoading: authLoading } = useAuth();

    const [formData, setFormData] = useState<MessData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const fetchMess = async () => {
            if (!token) return;

            try {
                const response = await fetch('/api/mess-owner/analytics', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const result = await response.json();

                if (result.success && result.data.mess) {
                    // Fetch full mess details
                    const messResponse = await fetch(`/api/messes/${result.data.mess.id}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    const messData = await messResponse.json();

                    if (messData.success) {
                        setFormData({
                            _id: messData.data._id,
                            name: messData.data.name,
                            description: messData.data.description || '',
                            address: messData.data.address,
                            latitude: messData.data.location?.coordinates[1] || 0,
                            longitude: messData.data.location?.coordinates[0] || 0,
                            contactPhone: messData.data.contactPhone,
                            contactWhatsApp: messData.data.contactWhatsApp || '',
                            capacity: messData.data.capacity,
                            monthlyPrice: messData.data.monthlyPrice,
                            messType: messData.data.messType,
                        });
                    }
                }
            } catch (err) {
                console.error('Failed to fetch mess:', err);
                setError('Failed to load mess details');
            } finally {
                setIsLoading(false);
            }
        };

        if (!authLoading && user?.role === 'messOwner' && token) {
            fetchMess();
        } else if (!authLoading && (!user || user.role !== 'messOwner')) {
            router.push('/login');
        }
    }, [authLoading, user, token, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData) return;

        setIsSubmitting(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch(`/api/messes/${formData._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: formData.name,
                    description: formData.description,
                    address: formData.address,
                    latitude: formData.latitude,
                    longitude: formData.longitude,
                    contactPhone: formData.contactPhone,
                    contactWhatsApp: formData.contactWhatsApp,
                    capacity: formData.capacity,
                    monthlyPrice: formData.monthlyPrice,
                    messType: formData.messType,
                }),
            });

            const result = await response.json();

            if (result.success) {
                setSuccess('Mess details updated successfully!');
                setTimeout(() => router.push('/dashboard/mess-owner'), 1500);
            } else {
                setError(result.error || 'Failed to update mess');
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setIsSubmitting(false);
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

    if (!formData) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-error">No mess found. Please create one first.</p>
                    <Link href="/dashboard/mess-owner/mess/create" className="btn btn-primary mt-4">
                        Create Mess
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <header className="bg-card border-b border-border sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/dashboard/mess-owner" className="flex items-center gap-2">
                            <span className="text-2xl">🍽️</span>
                            <span className="text-xl font-bold gradient-text">ThaliTrack</span>
                        </Link>
                        <Link href="/dashboard/mess-owner" className="btn btn-secondary text-sm">
                            ← Back
                        </Link>
                    </div>
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <h1 className="text-3xl font-bold mb-8 text-center">Edit Mess Profile</h1>

                <form onSubmit={handleSubmit} className="card space-y-6">
                    {error && <div className="bg-error/10 text-error p-4 rounded-lg">{error}</div>}
                    {success && <div className="bg-success/10 text-success p-4 rounded-lg">{success}</div>}

                    <div>
                        <label className="label">Mess Name</label>
                        <input
                            type="text"
                            className="input"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label className="label">Description</label>
                        <textarea
                            className="input min-h-[100px]"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="label">Address</label>
                        <textarea
                            className="input"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Contact Phone</label>
                            <input
                                type="tel"
                                className="input"
                                value={formData.contactPhone}
                                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="label">WhatsApp</label>
                            <input
                                type="tel"
                                className="input"
                                value={formData.contactWhatsApp}
                                onChange={(e) => setFormData({ ...formData, contactWhatsApp: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Capacity</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.capacity}
                                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                                required
                            />
                        </div>
                        <div>
                            <label className="label">Monthly Price (₹)</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.monthlyPrice}
                                onChange={(e) => setFormData({ ...formData, monthlyPrice: parseFloat(e.target.value) })}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="label">Mess Type</label>
                        <select
                            className="input"
                            value={formData.messType}
                            onChange={(e) => setFormData({ ...formData, messType: e.target.value as 'veg' | 'nonVeg' | 'both' })}
                        >
                            <option value="veg">🥬 Vegetarian Only</option>
                            <option value="nonVeg">🍗 Non-Vegetarian Only</option>
                            <option value="both">🍽️ Both Veg & Non-Veg</option>
                        </select>
                    </div>

                    <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            </div>
        </div>
    );
}
