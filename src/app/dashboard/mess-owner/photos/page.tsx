'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks';

export default function ManagePhotosPage() {
    const router = useRouter();
    const { user, token, isLoading: authLoading } = useAuth();

    const [photos, setPhotos] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [messId, setMessId] = useState<string | null>(null);
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
                    setMessId(result.data.mess.id);

                    // Fetch mess photos
                    const messResponse = await fetch(`/api/messes/${result.data.mess.id}`);
                    const messData = await messResponse.json();

                    if (messData.success && messData.data.photos) {
                        setPhotos(messData.data.photos);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch mess:', err);
                setError('Failed to load photos');
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

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !messId) return;

        setIsUploading(true);
        setError('');

        try {
            // Convert files to base64
            const base64Images = await Promise.all(
                Array.from(files).map((file) => {
                    return new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
                })
            );

            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ images: base64Images }),
            });

            const result = await response.json();

            if (result.success) {
                const uploadedUrls = result.data.images?.map((img: { url: string }) => img.url) ||
                    (result.data.image ? [result.data.image.url] : []);
                const newPhotos = [...photos, ...uploadedUrls];
                setPhotos(newPhotos);

                // Update mess with new photos
                await fetch(`/api/messes/${messId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ photos: newPhotos }),
                });

                setSuccess('Photos uploaded successfully!');
            } else {
                setError(result.error || 'Failed to upload photos');
            }
        } catch (err) {
            console.error('Upload error:', err);
            setError('Upload failed. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeletePhoto = async (photoUrl: string) => {
        if (!messId) return;

        try {
            const newPhotos = photos.filter((p) => p !== photoUrl);
            setPhotos(newPhotos);

            await fetch(`/api/messes/${messId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ photos: newPhotos }),
            });

            setSuccess('Photo deleted successfully!');
        } catch (err) {
            setError('Failed to delete photo');
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

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <h1 className="text-3xl font-bold mb-8 text-center">📸 Manage Photos</h1>

                {error && <div className="bg-error/10 text-error p-4 rounded-lg mb-6">{error}</div>}
                {success && <div className="bg-success/10 text-success p-4 rounded-lg mb-6">{success}</div>}

                {/* Upload Section */}
                <div className="card mb-8">
                    <h2 className="font-semibold mb-4">Upload New Photos</h2>
                    <p className="text-sm text-muted mb-4">
                        Upload photos of your mess, food, and dining area. Maximum 10 photos allowed.
                    </p>

                    <label className="block">
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFileUpload}
                            disabled={isUploading || photos.length >= 10}
                            className="hidden"
                        />
                        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors">
                            {isUploading ? (
                                <div className="flex flex-col items-center">
                                    <span className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-2" />
                                    <span>Uploading...</span>
                                </div>
                            ) : photos.length >= 10 ? (
                                <span className="text-muted">Maximum 10 photos reached</span>
                            ) : (
                                <>
                                    <span className="text-3xl mb-2 block">📷</span>
                                    <span className="text-muted">Click to upload photos</span>
                                </>
                            )}
                        </div>
                    </label>
                </div>

                {/* Photos Grid */}
                <div className="card">
                    <h2 className="font-semibold mb-4">Current Photos ({photos.length}/10)</h2>

                    {photos.length === 0 ? (
                        <p className="text-muted text-center py-8">No photos uploaded yet</p>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {photos.map((photo, index) => (
                                <div key={index} className="relative group">
                                    <img
                                        src={photo}
                                        alt={`Mess photo ${index + 1}`}
                                        className="w-full h-40 object-cover rounded-lg"
                                    />
                                    <button
                                        onClick={() => handleDeletePhoto(photo)}
                                        className="absolute top-2 right-2 bg-error text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
