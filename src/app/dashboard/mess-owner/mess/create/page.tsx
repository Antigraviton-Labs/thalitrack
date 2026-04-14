'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks';
import LocationPicker from '@/components/LocationPicker';

interface MenuItem {
    dishName: string;
    price: number;
}

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
        messType: 'veg' as 'veg' | 'nonVeg' | 'both',
        // New fields
        foodLicenseUrl: '',
        monthlyPlan: 'no' as 'yes' | 'no',
        monthlyPrice: '',
        monthlyDescription: '',
        openingTime: '11:00',
        closingTime: '21:00',
        tiffinService: 'no' as 'yes' | 'no',
        menuEnabled: 'yes' as 'yes' | 'no', // Enabled by default for new mess owners
    });




    const [menuItems, setMenuItems] = useState<MenuItem[]>([
        { dishName: '', price: 0 },
    ]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');


    // Food license upload state
    const [licenseFile, setLicenseFile] = useState<File | null>(null);
    const [licensePreview, setLicensePreview] = useState('');
    const [isUploadingLicense, setIsUploadingLicense] = useState(false);

    // Handle food license file selection
    const handleLicenseFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError('Food license file must be under 5MB');
            return;
        }

        // Validate file type
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            setError('Allowed file types: PDF, JPG, PNG, WebP');
            return;
        }

        setError('');
        setLicenseFile(file);

        // Preview for images
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (ev) => setLicensePreview(ev.target?.result as string);
            reader.readAsDataURL(file);
        } else {
            setLicensePreview('');
        }
    };

    // Upload food license to Cloudinary
    const uploadFoodLicense = async (): Promise<string> => {
        if (!licenseFile) return formData.foodLicenseUrl;

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

    const updateMenuItem = (index: number, field: 'dishName' | 'price', value: string | number) => {
        const updated = [...menuItems];
        // @ts-ignore
        updated[index][field] = value;
        setMenuItems(updated);
    };

    // Toggle handlers with edge-case clearing
    const handleMonthlyPlanToggle = (value: 'yes' | 'no') => {
        setFormData((prev) => ({
            ...prev,
            monthlyPlan: value,
            ...(value === 'no' ? { monthlyPrice: '', monthlyDescription: '' } : {}),
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            // Validate required fields
            if (!formData.address.trim()) {
                setError('Please enter your mess address');
                setIsSubmitting(false);
                return;
            }

            if (!formData.openingTime || !formData.closingTime) {
                setError('Please set opening and closing times');
                setIsSubmitting(false);
                return;
            }

            // Upload food license if selected
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
                        price: Number(item.price) || 0,
                    }))
                : [];

            const payload = {
                name: formData.name.trim(),
                description: formData.description.trim(),
                address: formData.address.trim(),
                latitude: parseFloat(formData.latitude) || 18.5204,
                longitude: parseFloat(formData.longitude) || 73.8567,
                contactPhone: formData.contactPhone.trim(),
                contactWhatsApp: formData.contactWhatsApp.trim() || undefined,
                capacity: parseInt(formData.capacity),
                messType: formData.messType,
                foodLicenseUrl: foodLicenseUrl || undefined,
                monthlyPlan: formData.monthlyPlan,
                monthlyPrice:
                    formData.monthlyPlan === 'yes'
                        ? parseFloat(formData.monthlyPrice) || 0
                        : 0,
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



            const response = await fetch('/api/messes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
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
                            <span className="text-xl font-bold"><span style={{ color: '#1A1208' }}>Thali</span><span style={{ color: '#E8861A' }}>Track</span></span>
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

                    {/* ── Basic Info ── */}
                    <div className="space-y-1">
                        <h3 className="text-lg font-semibold flex items-center gap-2">🏪 Basic Info</h3>
                        <div className="h-px bg-border" />
                    </div>

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

                    {/* ── Food License ── */}
                    <div className="space-y-1">
                        <h3 className="text-lg font-semibold flex items-center gap-2">📄 Food License</h3>
                        <div className="h-px bg-border" />
                    </div>

                    <div>
                        <label className="label">Upload Food License (PDF / Image, max 5MB)</label>
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
                                {isUploadingLicense ? '⏳ Uploading...' : '📎 Choose File'}
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
                            onLocationChange={({ latitude, longitude }) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    latitude: latitude.toString(),
                                    longitude: longitude.toString(),
                                }))
                            }
                            initialLatitude={formData.latitude ? parseFloat(formData.latitude) : undefined}
                            initialLongitude={formData.longitude ? parseFloat(formData.longitude) : undefined}
                        />
                    </div>

                    {/* ── Contact ── */}
                    <div className="space-y-1">
                        <h3 className="text-lg font-semibold flex items-center gap-2">📞 Contact</h3>
                        <div className="h-px bg-border" />
                    </div>

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

                    {/* ── Capacity & Mess Type ── */}
                    <div className="space-y-1">
                        <h3 className="text-lg font-semibold flex items-center gap-2">🍽️ Mess Details</h3>
                        <div className="h-px bg-border" />
                    </div>

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
                                min="1"
                                max="1000"
                            />
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
                    </div>

                    {/* ── Opening / Closing Time ── */}
                    <div className="space-y-1">
                        <h3 className="text-lg font-semibold flex items-center gap-2">🕐 Timings</h3>
                        <div className="h-px bg-border" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Opening Time *</label>
                            <input
                                type="time"
                                className="input"
                                value={formData.openingTime}
                                onChange={(e) => setFormData({ ...formData, openingTime: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="label">Closing Time *</label>
                            <input
                                type="time"
                                className="input"
                                value={formData.closingTime}
                                onChange={(e) => setFormData({ ...formData, closingTime: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    {/* ── Monthly Plan Toggle ── */}
                    <div className="space-y-1">
                        <h3 className="text-lg font-semibold flex items-center gap-2">💰 Monthly Plan</h3>
                        <div className="h-px bg-border" />
                    </div>

                    <div>
                        <label className="label">Do you have a Monthly Plan? *</label>
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
                                <label className="label">Monthly Price (₹) *</label>
                                <input
                                    type="number"
                                    className="input"
                                    placeholder="1500"
                                    value={formData.monthlyPrice}
                                    onChange={(e) => setFormData({ ...formData, monthlyPrice: e.target.value })}
                                    required
                                    min="0"
                                    max="50000"
                                />
                            </div>
                            <div style={{ marginTop: '0.75rem' }}>
                                <label className="label">Short Description about Monthly Plan</label>
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
                        <label className="label">Do you provide Tiffin Service? *</label>
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
                        <label className="label">✅ Menu Upload is Enabled by Default</label>
                        <p className="text-sm text-muted">You can manage your menu and add dishes after creating your mess</p>
                    </div>

                    {/* Menu items section - always shown since menuEnabled is always 'yes' */}
                    <div className="animate-fadeIn" style={{ paddingLeft: '1rem', borderLeft: '3px solid var(--primary)' }}>
                            {menuItems.map((item, index) => (
                                <div
                                    key={index}
                                    className="flex gap-3 items-end"
                                    style={{ marginBottom: '0.75rem' }}
                                >
                                    <div className="flex-1 grid grid-cols-3 gap-2">
                                        <div className="col-span-2">
                                            <label className="label" style={{ fontSize: '0.775rem' }}>
                                                Dish Name {index + 1}
                                            </label>
                                            <input
                                                type="text"
                                                className="input"
                                                placeholder="e.g., Paneer Butter Masala"
                                                value={item.dishName}
                                                onChange={(e) =>
                                                    updateMenuItem(index, 'dishName', e.target.value)
                                                }
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
                                                value={item.price || ''}
                                                onChange={(e) =>
                                                    updateMenuItem(index, 'price', parseFloat(e.target.value))
                                                }
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

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isSubmitting || isUploadingLicense}
                        className="btn btn-primary w-full"
                    >
                        {isSubmitting
                            ? '⏳ Creating...'
                            : isUploadingLicense
                                ? '⏳ Uploading License...'
                                : '🚀 Create Mess Profile'}
                    </button>

                    <p className="text-sm text-muted text-center">
                        After creating, your mess will be reviewed by our team before going live.
                    </p>
                </form>
            </div>


        </div>
    );
}
