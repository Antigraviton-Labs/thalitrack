'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks';

export default function CreateMessPage() {
    const router = useRouter();
    const { user, token, isLoading: authLoading } = useAuth();

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        address: '',
        latitude: '',
        longitude: '',
        contactPhone: '',
        contactWhatsApp: '',
        capacity: '',
        monthlyPrice: '',
        messType: 'veg' as 'veg' | 'nonVeg' | 'both',
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [isGettingLocation, setIsGettingLocation] = useState(false);

    // Get current location
    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            return;
        }

        setIsGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setFormData((prev) => ({
                    ...prev,
                    latitude: position.coords.latitude.toString(),
                    longitude: position.coords.longitude.toString(),
                }));
                setIsGettingLocation(false);
            },
            (error) => {
                setError('Failed to get location: ' + error.message);
                setIsGettingLocation(false);
            }
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            const response = await fetch('/api/messes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ...formData,
                    latitude: parseFloat(formData.latitude),
                    longitude: parseFloat(formData.longitude),
                    capacity: parseInt(formData.capacity),
                    monthlyPrice: parseFloat(formData.monthlyPrice),
                }),
            });

            const result = await response.json();

            if (result.success) {
                router.push('/dashboard/mess-owner');
            } else {
                setError(result.error || 'Failed to create mess');
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
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

    if (!user || user.role !== 'messOwner') {
        router.push('/login');
        return null;
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="bg-card border-b border-border sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/dashboard/mess-owner" className="flex items-center gap-2">
                            <span className="text-2xl">🍽️</span>
                            <span className="text-xl font-bold gradient-text">ThaliTrack</span>
                        </Link>
                        <Link href="/dashboard/mess-owner" className="btn btn-secondary text-sm">
                            ← Back to Dashboard
                        </Link>
                    </div>
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">Create Your Mess Profile</h1>
                    <p className="text-muted">
                        Fill in the details below to set up your mess and start reaching hungry students.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="card space-y-6">
                    {error && (
                        <div className="bg-error/10 text-error p-4 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Basic Info */}
                    <div>
                        <label className="label">Mess Name *</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="e.g., Shree Krishna Mess"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label className="label">Description</label>
                        <textarea
                            className="input min-h-[100px]"
                            placeholder="Tell students about your mess, specialties, etc."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="label">Full Address *</label>
                        <textarea
                            className="input"
                            placeholder="e.g., Shop No. 5, Near XYZ College, ABC Road, City - 400001"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            required
                        />
                    </div>

                    {/* Location */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Latitude *</label>
                            <input
                                type="number"
                                step="any"
                                className="input"
                                placeholder="18.5204"
                                value={formData.latitude}
                                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="label">Longitude *</label>
                            <input
                                type="number"
                                step="any"
                                className="input"
                                placeholder="73.8567"
                                value={formData.longitude}
                                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={getCurrentLocation}
                        disabled={isGettingLocation}
                        className="btn btn-secondary w-full"
                    >
                        {isGettingLocation ? '📍 Getting Location...' : '📍 Use My Current Location'}
                    </button>

                    {/* Contact */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Contact Phone *</label>
                            <input
                                type="tel"
                                className="input"
                                placeholder="9876543210"
                                value={formData.contactPhone}
                                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="label">WhatsApp Number</label>
                            <input
                                type="tel"
                                className="input"
                                placeholder="9876543210"
                                value={formData.contactWhatsApp}
                                onChange={(e) => setFormData({ ...formData, contactWhatsApp: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Seating Capacity *</label>
                            <input
                                type="number"
                                className="input"
                                placeholder="50"
                                value={formData.capacity}
                                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="label">Monthly Price (₹) *</label>
                            <input
                                type="number"
                                className="input"
                                placeholder="1500"
                                value={formData.monthlyPrice}
                                onChange={(e) => setFormData({ ...formData, monthlyPrice: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="label">Mess Type *</label>
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

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn btn-primary w-full"
                    >
                        {isSubmitting ? 'Creating...' : 'Create Mess Profile'}
                    </button>

                    <p className="text-sm text-muted text-center">
                        After creating, your mess will be reviewed by our team before going live.
                    </p>
                </form>
            </div>
        </div>
    );
}
