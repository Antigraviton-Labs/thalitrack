'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks';
import LocationPicker from '@/components/LocationPicker';

interface MenuItem {
    dishName: string;
    price: number;
}

interface MessData {
    _id: string;
    name: string;
    description: string;
    address: string;
    latitude: number;
    longitude: number;
    contactPhone: string;
    contactWhatsApp: string;
    capacity: number;
    messType: 'veg' | 'nonVeg' | 'both';
    foodLicenseUrl: string;
    monthlyPlan: 'yes' | 'no';
    monthlyPrice: number;
    monthlyDescription: string;
    openingTime: string;
    closingTime: string;
    tiffinService: 'yes' | 'no';
    menuEnabled: 'yes' | 'no';
    menuItems: { dishName: string }[];
}

export default function EditMessPage() {
    const router = useRouter();
    const { user, token, isLoading: authLoading } = useAuth();

    const [formData, setFormData] = useState<MessData | null>(null);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([{ dishName: '', price: 0 }]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');


    // Food license upload state
    const [licenseFile, setLicenseFile] = useState<File | null>(null);
    const [licensePreview, setLicensePreview] = useState('');
    const [isUploadingLicense, setIsUploadingLicense] = useState(false);

    useEffect(() => {
        const fetchMess = async () => {
            if (!token) return;

            try {
                const response = await fetch('/api/mess-owner/analytics', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const result = await response.json();

                if (result.success && result.data.mess) {
                    const messResponse = await fetch(`/api/messes/${result.data.mess.id}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    const messData = await messResponse.json();

                    if (messData.success) {
                        const d = messData.data;
                        setFormData({
                            _id: d._id,
                            name: d.name || '',
                            description: d.description || '',
                            address: d.address || '',
                            latitude: d.location?.coordinates[1] || 0,
                            longitude: d.location?.coordinates[0] || 0,
                            contactPhone: d.contactPhone || '',
                            contactWhatsApp: d.contactWhatsApp || '',
                            capacity: d.capacity || 0,
                            messType: d.messType || 'veg',
                            foodLicenseUrl: d.foodLicenseUrl || '',
                            monthlyPlan: d.monthlyPlan || 'no',
                            monthlyPrice: d.monthlyPrice || 0,
                            monthlyDescription: d.monthlyDescription || '',
                            openingTime: d.openingTime || '11:00',
                            closingTime: d.closingTime || '21:00',
                            tiffinService: d.tiffinService || 'no',
                            menuEnabled: d.menuEnabled || 'no',
                            menuItems: d.menuItems || [],
                        });

                        // Set menu items for editing
                        if (d.menuItems && d.menuItems.length > 0) {
                            setMenuItems(
                                d.menuItems.map((item: { dishName: string; price?: number }) => ({
                                    dishName: item.dishName,
                                    price: item.price || 0,
                                }))
                            );
                        }
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

    // Food license handlers
    const handleLicenseFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setError('Food license file must be under 5MB');
            return;
        }

        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            setError('Allowed file types: PDF, JPG, PNG, WebP');
            return;
        }

        setError('');
        setLicenseFile(file);

        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (ev) => setLicensePreview(ev.target?.result as string);
            reader.readAsDataURL(file);
        } else {
            setLicensePreview('');
        }
    };

    const uploadFoodLicense = async (): Promise<string> => {
        if (!licenseFile) return formData?.foodLicenseUrl || '';

        setIsUploadingLicense(true);
        try {
            const reader = new FileReader();
            const base64 = await new Promise<string>((resolve) => {
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(licenseFile);
            });

            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ type: 'food-license', file: base64 }),
            });

            const result = await response.json();
            if (result.success) {
                return result.data.file.url;
            } else {
                throw new Error(result.error || 'Failed to upload food license');
            }
        } finally {
            setIsUploadingLicense(false);
        }
    };



    // Menu items management
    const addMenuItem = () => {
        setMenuItems([...menuItems, { dishName: '', price: 0 }]);
    };

    const removeMenuItem = (index: number) => {
        if (menuItems.length > 1) {
            setMenuItems(menuItems.filter((_, i) => i !== index));
        }
    };

    const updateMenuItem = (index: number, field: keyof MenuItem, value: string | number) => {
        const updated = [...menuItems];
        // @ts-ignore
        updated[index][field] = value;
        setMenuItems(updated);
    };

    // Toggle handlers with edge-case clearing
    const handleMonthlyPlanToggle = (value: 'yes' | 'no') => {
        if (!formData) return;
        setFormData({
            ...formData,
            monthlyPlan: value,
            ...(value === 'no' ? { monthlyPrice: 0, monthlyDescription: '' } : {}),
        });
    };

    const handleMenuToggle = (value: 'yes' | 'no') => {
        if (!formData) return;
        setFormData({ ...formData, menuEnabled: value });
        if (value === 'no') {
            setMenuItems([{ dishName: '', price: 0 }]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData) return;

        setIsSubmitting(true);
        setError('');
        setSuccess('');

        try {
            // Upload food license if changed
            let foodLicenseUrl = formData.foodLicenseUrl;
            if (licenseFile) {
                foodLicenseUrl = await uploadFoodLicense();
            }

            // Prepare menu items
            const cleanedMenuItems = formData.menuEnabled === 'yes'
                ? menuItems
                    .filter((item) => item.dishName.trim().length > 0)
                    .map((item) => ({
                        dishName: item.dishName.trim(),
                        price: item.price,
                    }))
                : [];

            const payload = {
                name: formData.name.trim(),
                description: formData.description.trim(),
                address: formData.address.trim(),
                latitude: formData.latitude,
                longitude: formData.longitude,
                contactPhone: formData.contactPhone.trim(),
                contactWhatsApp: formData.contactWhatsApp.trim() || undefined,
                capacity: formData.capacity,
                messType: formData.messType,
                foodLicenseUrl: foodLicenseUrl || undefined,
                monthlyPlan: formData.monthlyPlan,
                monthlyPrice:
                    formData.monthlyPlan === 'yes' ? formData.monthlyPrice : 0,
                monthlyDescription:
                    formData.monthlyPlan === 'yes'
                        ? formData.monthlyDescription.trim()
                        : undefined,
                openingTime: formData.openingTime,
                closingTime: formData.closingTime,
                tiffinService: formData.tiffinService,
                menuEnabled: formData.menuEnabled,
                menuItems: cleanedMenuItems,
            };

            const response = await fetch(`/api/messes/${formData._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
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
                            <span className="text-xl font-bold"><span style={{ color: '#1A1208' }}>Thali</span><span style={{ color: '#E8861A' }}>Track</span></span>
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

                    {/* ── Basic Info ── */}
                    <div className="space-y-1">
                        <h3 className="text-lg font-semibold flex items-center gap-2">🏪 Basic Info</h3>
                        <div className="h-px bg-border" />
                    </div>

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

                    {/* ── Food License ── */}
                    <div className="space-y-1">
                        <h3 className="text-lg font-semibold flex items-center gap-2">📄 Food License</h3>
                        <div className="h-px bg-border" />
                    </div>

                    <div>
                        <label className="label">Upload Food License (PDF / Image, max 5MB)</label>
                        {formData.foodLicenseUrl && !licenseFile && (
                            <div style={{ marginBottom: '0.5rem' }}>
                                <a
                                    href={formData.foodLicenseUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm"
                                    style={{ color: 'var(--primary)' }}
                                >
                                    📎 View current food license ↗
                                </a>
                            </div>
                        )}
                        <div className="file-upload-area">
                            <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.webp"
                                onChange={handleLicenseFileChange}
                                id="food-license-input"
                                style={{ display: 'none' }}
                            />
                            <label
                                htmlFor="food-license-input"
                                className="btn btn-secondary"
                                style={{ cursor: 'pointer', display: 'inline-flex' }}
                            >
                                {isUploadingLicense ? '⏳ Uploading...' : '📎 Change File'}
                            </label>
                            {licenseFile && (
                                <span style={{ marginLeft: '0.75rem', fontSize: '0.875rem', color: 'var(--muted)' }}>
                                    {licenseFile.name} ({(licenseFile.size / 1024 / 1024).toFixed(2)} MB)
                                </span>
                            )}
                        </div>
                        {licensePreview && (
                            <div style={{ marginTop: '0.5rem' }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={licensePreview}
                                    alt="Food License Preview"
                                    style={{
                                        maxWidth: '200px',
                                        maxHeight: '150px',
                                        borderRadius: '0.5rem',
                                        border: '1px solid var(--border)',
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* ── Location ── */}
                    <div className="space-y-1">
                        <h3 className="text-lg font-semibold flex items-center gap-2">📍 Location</h3>
                        <div className="h-px bg-border" />
                    </div>

                    <div>
                        <label className="label">Mess Address *</label>
                        <textarea
                            className="input"
                            placeholder="e.g., 123, Near Pune Station, Pune, Maharashtra 411001"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            required
                            style={{ minHeight: '80px' }}
                        />
                        <LocationPicker
                            onLocationChange={({ latitude, longitude }) => {
                                if (!formData) return;
                                setFormData({ ...formData, latitude, longitude });
                            }}
                            initialLatitude={formData.latitude}
                            initialLongitude={formData.longitude}
                        />
                    </div>

                    {/* ── Contact ── */}
                    <div className="space-y-1">
                        <h3 className="text-lg font-semibold flex items-center gap-2">📞 Contact</h3>
                        <div className="h-px bg-border" />
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

                    {/* ── Mess Details ── */}
                    <div className="space-y-1">
                        <h3 className="text-lg font-semibold flex items-center gap-2">🍽️ Mess Details</h3>
                        <div className="h-px bg-border" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Capacity</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.capacity}
                                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                                required
                                min="1"
                                max="1000"
                            />
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
                    </div>

                    {/* ── Timings ── */}
                    <div className="space-y-1">
                        <h3 className="text-lg font-semibold flex items-center gap-2">🕐 Timings</h3>
                        <div className="h-px bg-border" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Opening Time</label>
                            <input
                                type="time"
                                className="input"
                                value={formData.openingTime}
                                onChange={(e) => setFormData({ ...formData, openingTime: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="label">Closing Time</label>
                            <input
                                type="time"
                                className="input"
                                value={formData.closingTime}
                                onChange={(e) => setFormData({ ...formData, closingTime: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    {/* ── Monthly Plan ── */}
                    <div className="space-y-1">
                        <h3 className="text-lg font-semibold flex items-center gap-2">💰 Monthly Plan</h3>
                        <div className="h-px bg-border" />
                    </div>

                    <div>
                        <label className="label">Do you have a Monthly Plan?</label>
                        <div className="toggle-group">
                            <button
                                type="button"
                                className={`toggle-btn ${formData.monthlyPlan === 'yes' ? 'active' : ''}`}
                                onClick={() => handleMonthlyPlanToggle('yes')}
                            >
                                ✅ Yes
                            </button>
                            <button
                                type="button"
                                className={`toggle-btn ${formData.monthlyPlan === 'no' ? 'active' : ''}`}
                                onClick={() => handleMonthlyPlanToggle('no')}
                            >
                                ❌ No
                            </button>
                        </div>
                    </div>

                    {formData.monthlyPlan === 'yes' && (
                        <div className="animate-fadeIn" style={{ paddingLeft: '1rem', borderLeft: '3px solid var(--primary)' }}>
                            <div>
                                <label className="label">Monthly Price (₹)</label>
                                <input
                                    type="number"
                                    className="input"
                                    placeholder="1500"
                                    value={formData.monthlyPrice}
                                    onChange={(e) => setFormData({ ...formData, monthlyPrice: parseFloat(e.target.value) || 0 })}
                                    required
                                    min="0"
                                    max="50000"
                                />
                            </div>
                            <div style={{ marginTop: '0.75rem' }}>
                                <label className="label">Monthly Plan Description</label>
                                <textarea
                                    className="input"
                                    placeholder="e.g., Includes lunch and dinner, 2 rotis, 1 sabzi, rice, dal, salad"
                                    value={formData.monthlyDescription}
                                    onChange={(e) => setFormData({ ...formData, monthlyDescription: e.target.value })}
                                    maxLength={500}
                                />
                            </div>
                        </div>
                    )}

                    {/* ── Tiffin Service ── */}
                    <div className="space-y-1">
                        <h3 className="text-lg font-semibold flex items-center gap-2">🥡 Tiffin Service</h3>
                        <div className="h-px bg-border" />
                    </div>

                    <div>
                        <label className="label">Do you provide Tiffin Service?</label>
                        <div className="toggle-group">
                            <button
                                type="button"
                                className={`toggle-btn ${formData.tiffinService === 'yes' ? 'active' : ''}`}
                                onClick={() => setFormData({ ...formData, tiffinService: 'yes' })}
                            >
                                ✅ Yes
                            </button>
                            <button
                                type="button"
                                className={`toggle-btn ${formData.tiffinService === 'no' ? 'active' : ''}`}
                                onClick={() => setFormData({ ...formData, tiffinService: 'no' })}
                            >
                                ❌ No
                            </button>
                        </div>
                    </div>

                    {/* ── Menu Upload ── */}
                    <div className="space-y-1">
                        <h3 className="text-lg font-semibold flex items-center gap-2">📋 Menu</h3>
                        <div className="h-px bg-border" />
                    </div>

                    <div>
                        <label className="label">Do you want to upload Menu?</label>
                        <div className="toggle-group">
                            <button
                                type="button"
                                className={`toggle-btn ${formData.menuEnabled === 'yes' ? 'active' : ''}`}
                                onClick={() => handleMenuToggle('yes')}
                            >
                                ✅ Yes
                            </button>
                            <button
                                type="button"
                                className={`toggle-btn ${formData.menuEnabled === 'no' ? 'active' : ''}`}
                                onClick={() => handleMenuToggle('no')}
                            >
                                ❌ No
                            </button>
                        </div>
                    </div>

                    {formData.menuEnabled === 'yes' && (
                        <div className="animate-fadeIn" style={{ paddingLeft: '1rem', borderLeft: '3px solid var(--primary)' }}>
                            {menuItems.map((item, index) => (
                                <div
                                    key={index}
                                    className="flex gap-3 items-end"
                                    style={{ marginBottom: '0.75rem' }}
                                >
                                    <div className="flex-1 grid grid-cols-3 gap-3">
                                        <div className="col-span-2">
                                            <label className="label" style={{ fontSize: '0.775rem' }}>
                                                Dish Name {index + 1}
                                            </label>
                                            <input
                                                type="text"
                                                className="input"
                                                placeholder="e.g., Paneer Butter Masala"
                                                value={item.dishName}
                                                onChange={(e) => updateMenuItem(index, 'dishName', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="label" style={{ fontSize: '0.775rem' }}>
                                                Price (₹)
                                            </label>
                                            <input
                                                type="number"
                                                className="input"
                                                placeholder="0"
                                                value={item.price}
                                                onChange={(e) => updateMenuItem(index, 'price', parseFloat(e.target.value) || 0)}
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeMenuItem(index)}
                                        disabled={menuItems.length <= 1}
                                        className="btn btn-secondary"
                                        style={{
                                            padding: '0.5rem 0.75rem',
                                            fontSize: '1rem',
                                            opacity: menuItems.length <= 1 ? 0.4 : 1,
                                        }}
                                        title="Remove dish"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={addMenuItem}
                                className="btn btn-outline"
                                style={{ marginTop: '0.25rem' }}
                            >
                                ➕ Add More Dish
                            </button>
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isSubmitting || isUploadingLicense}
                        className="btn btn-primary w-full"
                    >
                        {isSubmitting
                            ? '⏳ Saving...'
                            : isUploadingLicense
                                ? '⏳ Uploading License...'
                                : '💾 Save Changes'}
                    </button>
                </form>
            </div>


        </div>
    );
}
