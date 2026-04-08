'use client';

import { useState } from 'react';

interface LocationPickerProps {
    onLocationChange: (location: { latitude: number; longitude: number }) => void;
    initialLatitude?: number;
    initialLongitude?: number;
}

export default function LocationPicker({
    onLocationChange,
    initialLatitude,
    initialLongitude,
}: LocationPickerProps) {
    const [latitude, setLatitude] = useState<string>(
        initialLatitude && initialLatitude !== 0 ? initialLatitude.toString() : ''
    );
    const [longitude, setLongitude] = useState<string>(
        initialLongitude && initialLongitude !== 0 ? initialLongitude.toString() : ''
    );
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser.');
            return;
        }

        setIsLoading(true);
        setError('');
        setSuccess(false);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                setLatitude(lat.toString());
                setLongitude(lng.toString());
                setSuccess(true);
                setIsLoading(false);
                setError('');
                onLocationChange({ latitude: lat, longitude: lng });
            },
            (err) => {
                setIsLoading(false);
                setSuccess(false);
                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        setError('Location permission denied. Please allow location access in your browser settings.');
                        break;
                    case err.POSITION_UNAVAILABLE:
                        setError('Location information is unavailable. Please enter coordinates manually.');
                        break;
                    case err.TIMEOUT:
                        setError('Location request timed out. Please try again or enter coordinates manually.');
                        break;
                    default:
                        setError('An unknown error occurred while fetching location.');
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    };

    const handleManualChange = (field: 'latitude' | 'longitude', value: string) => {
        // Allow empty, minus sign, digits, and one decimal point
        if (value !== '' && value !== '-' && !/^-?\d*\.?\d*$/.test(value)) return;

        if (field === 'latitude') {
            setLatitude(value);
        } else {
            setLongitude(value);
        }

        const lat = field === 'latitude' ? parseFloat(value) : parseFloat(latitude);
        const lng = field === 'longitude' ? parseFloat(value) : parseFloat(longitude);

        if (!isNaN(lat) && !isNaN(lng)) {
            setSuccess(true);
            setError('');
            onLocationChange({ latitude: lat, longitude: lng });
        } else {
            setSuccess(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Use Current Location Button */}
            <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isLoading}
                className="btn btn-secondary"
                style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1rem',
                    background: 'linear-gradient(135deg, rgba(232,134,26,0.1), rgba(217,119,6,0.1))',
                    border: '1px dashed var(--primary)',
                    fontWeight: 600,
                    opacity: isLoading ? 0.7 : 1,
                    cursor: isLoading ? 'wait' : 'pointer',
                }}
            >
                {isLoading ? (
                    <>
                        <span
                            style={{
                                width: '1rem',
                                height: '1rem',
                                border: '2px solid var(--primary)',
                                borderTopColor: 'transparent',
                                borderRadius: '50%',
                                animation: 'spin 0.8s linear infinite',
                                display: 'inline-block',
                            }}
                        />
                        Fetching Location...
                    </>
                ) : (
                    '📍 Use Current Location'
                )}
            </button>

            {/* Manual Lat/Lng Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                    <label className="label" style={{ fontSize: '0.8rem' }}>
                        Latitude
                    </label>
                    <input
                        type="text"
                        className="input"
                        placeholder="e.g., 18.5204"
                        value={latitude}
                        onChange={(e) => handleManualChange('latitude', e.target.value)}
                    />
                </div>
                <div>
                    <label className="label" style={{ fontSize: '0.8rem' }}>
                        Longitude
                    </label>
                    <input
                        type="text"
                        className="input"
                        placeholder="e.g., 73.8567"
                        value={longitude}
                        onChange={(e) => handleManualChange('longitude', e.target.value)}
                    />
                </div>
            </div>

            {/* Success Message */}
            {success && latitude && longitude && (
                <div
                    style={{
                        display: 'flex',
                        gap: '1rem',
                        fontSize: '0.8rem',
                        color: 'var(--success, #22c55e)',
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(46,125,82,0.08)',
                        borderRadius: '0.5rem',
                    }}
                >
                    <span>✅ Lat: {parseFloat(latitude).toFixed(6)}</span>
                    <span>Lng: {parseFloat(longitude).toFixed(6)}</span>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div
                    style={{
                        fontSize: '0.8rem',
                        color: 'var(--error, #ef4444)',
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(192,57,43,0.08)',
                        borderRadius: '0.5rem',
                    }}
                >
                    ⚠️ {error}
                </div>
            )}
        </div>
    );
}
