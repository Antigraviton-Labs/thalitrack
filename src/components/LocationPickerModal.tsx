'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface LocationPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLocationSelect: (location: {
        latitude: number;
        longitude: number;
        address: string;
    }) => void;
    initialLat?: number;
    initialLng?: number;
}


const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

// Default center: Pune, India
const DEFAULT_CENTER = { lat: 18.5204, lng: 73.8567 };

export default function LocationPickerModal({
    isOpen,
    onClose,
    onLocationSelect,
    initialLat,
    initialLng,
}: LocationPickerModalProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const markerRef = useRef<google.maps.Marker | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

    const [address, setAddress] = useState('');
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [selectedPosition, setSelectedPosition] = useState<{
        lat: number;
        lng: number;
    } | null>(initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null);

    // Manual address for fallback mode (no API key)
    const [manualAddress, setManualAddress] = useState('');

    const hasApiKey = !!GOOGLE_MAPS_API_KEY;

    // Reverse geocode coordinates to address
    const reverseGeocode = useCallback(
        async (lat: number, lng: number) => {
            try {
                const geocoder = new window.google.maps.Geocoder();
                const response = await geocoder.geocode({
                    location: { lat, lng },
                });
                if (response?.results?.[0]) {
                    setAddress(response.results[0].formatted_address);
                }
            } catch (error) {
                console.error('Reverse geocode error:', error);
                setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
            }
        },
        []
    );

    // Load Google Maps script (only when API key exists)
    useEffect(() => {
        if (!isOpen || !hasApiKey) return;
        if (window.google?.maps) {
            setMapLoaded(true);
            return;
        }

        // Check if script is already loading
        if (document.querySelector('script[src*="maps.googleapis.com"]')) {
            const checkGoogle = setInterval(() => {
                if (window.google?.maps) {
                    setMapLoaded(true);
                    clearInterval(checkGoogle);
                }
            }, 100);
            return () => clearInterval(checkGoogle);
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&v=weekly`;
        script.async = true;
        script.defer = true;
        script.onload = () => setMapLoaded(true);
        document.head.appendChild(script);
    }, [isOpen, hasApiKey]);

    // Initialize map when loaded (only with API key)
    useEffect(() => {
        if (!hasApiKey || !mapLoaded || !mapRef.current || !isOpen) return;

        const center = selectedPosition || DEFAULT_CENTER;

        const map = new window.google.maps.Map(mapRef.current, {
            center,
            zoom: 15,
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
        });

        mapInstanceRef.current = map;

        // Create standard draggable marker
        const marker = new window.google.maps.Marker({
            map,
            position: center,
            draggable: true,
            title: 'Drag to set mess location',
            animation: window.google.maps.Animation.DROP,
        });

        markerRef.current = marker;

        // Listen for drag end
        marker.addListener('dragend', () => {
            const pos = marker.getPosition();
            if (pos) {
                const lat = pos.lat();
                const lng = pos.lng();
                setSelectedPosition({ lat, lng });
                reverseGeocode(lat, lng);
            }
        });

        // Listen for map click — move marker to clicked position
        map.addListener('click', (e: google.maps.MapMouseEvent) => {
            if (e.latLng) {
                const lat = e.latLng.lat();
                const lng = e.latLng.lng();
                marker.setPosition({ lat, lng });
                setSelectedPosition({ lat, lng });
                reverseGeocode(lat, lng);
            }
        });

        // Initialize Places Autocomplete
        if (searchInputRef.current) {
            const autocomplete = new window.google.maps.places.Autocomplete(
                searchInputRef.current,
                {
                    componentRestrictions: { country: 'in' },
                    fields: ['formatted_address', 'geometry'],
                }
            );

            autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace();
                if (place.geometry?.location) {
                    const lat = place.geometry.location.lat();
                    const lng = place.geometry.location.lng();
                    map.setCenter({ lat, lng });
                    map.setZoom(17);
                    marker.setPosition({ lat, lng });
                    setSelectedPosition({ lat, lng });
                    setAddress(place.formatted_address || '');
                }
            });

            autocompleteRef.current = autocomplete;
        }

        // Reverse geocode initial position
        if (selectedPosition) {
            reverseGeocode(selectedPosition.lat, selectedPosition.lng);
        }

        return () => {
            // Cleanup marker
            marker.setMap(null);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapLoaded, isOpen, hasApiKey]);

    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        setIsLoadingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                setSelectedPosition({ lat, lng });

                if (hasApiKey && mapInstanceRef.current && markerRef.current) {
                    mapInstanceRef.current.setCenter({ lat, lng });
                    mapInstanceRef.current.setZoom(17);
                    markerRef.current.setPosition({ lat, lng });
                    reverseGeocode(lat, lng);
                } else {
                    // Fallback: set coordinates as address hint
                    setAddress(`Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`);
                }

                setIsLoadingLocation(false);
            },
            (error) => {
                alert('Failed to get location: ' + error.message);
                setIsLoadingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleConfirm = () => {
        if (hasApiKey) {
            // Full map mode — require position + address
            if (!selectedPosition) {
                alert('Please select a location on the map');
                return;
            }
            onLocationSelect({
                latitude: selectedPosition.lat,
                longitude: selectedPosition.lng,
                address: address,
            });
        } else {
            // Fallback mode — use manual address + selected/default position
            if (!manualAddress.trim()) {
                alert('Please enter your mess address');
                return;
            }
            const pos = selectedPosition || DEFAULT_CENTER;
            onLocationSelect({
                latitude: pos.lat,
                longitude: pos.lng,
                address: manualAddress.trim(),
            });
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal"
                style={{ maxWidth: '700px', width: '95%', maxHeight: '90vh' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                        📍 Pick Mess Location
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            color: 'var(--muted)',
                            padding: '0.25rem',
                        }}
                    >
                        ✕
                    </button>
                </div>

                {hasApiKey ? (
                    /* ── Full Map Mode (API key present) ── */
                    <>
                        {/* Search Input */}
                        <div style={{ marginBottom: '0.75rem' }}>
                            <input
                                ref={searchInputRef}
                                type="text"
                                className="input"
                                placeholder="🔍 Search for a location..."
                                style={{ fontSize: '0.95rem' }}
                            />
                        </div>

                        {/* Use Current Location Button */}
                        <button
                            type="button"
                            onClick={handleUseCurrentLocation}
                            disabled={isLoadingLocation}
                            className="btn btn-secondary"
                            style={{ width: '100%', marginBottom: '0.75rem' }}
                        >
                            {isLoadingLocation ? '⏳ Getting your location...' : '📍 Use My Current Location'}
                        </button>

                        {/* Map Container */}
                        <div
                            ref={mapRef}
                            style={{
                                width: '100%',
                                height: '350px',
                                borderRadius: '0.75rem',
                                border: '1px solid var(--border)',
                                marginBottom: '0.75rem',
                                background: 'var(--card)',
                            }}
                        >
                            {!mapLoaded && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '100%',
                                    color: 'var(--muted)',
                                }}>
                                    Loading map...
                                </div>
                            )}
                        </div>

                        {/* Selected Address */}
                        {address && (
                            <div style={{
                                padding: '0.75rem',
                                background: 'var(--card)',
                                borderRadius: '0.5rem',
                                border: '1px solid var(--border)',
                                marginBottom: '0.75rem',
                                fontSize: '0.875rem',
                            }}>
                                <span style={{ fontWeight: 600 }}>Selected Address: </span>
                                {address}
                            </div>
                        )}

                        {/* Coordinates */}
                        {selectedPosition && (
                            <div style={{
                                display: 'flex',
                                gap: '1rem',
                                marginBottom: '1rem',
                                fontSize: '0.8rem',
                                color: 'var(--muted)',
                            }}>
                                <span>Lat: {selectedPosition.lat.toFixed(6)}</span>
                                <span>Lng: {selectedPosition.lng.toFixed(6)}</span>
                            </div>
                        )}
                    </>
                ) : (
                    /* ── Fallback Mode (no API key) ── */
                    <>
                        <div style={{
                            padding: '0.75rem',
                            background: 'var(--warning, #fef3cd)',
                            borderRadius: '0.5rem',
                            marginBottom: '1rem',
                            fontSize: '0.85rem',
                            color: 'var(--warning-text, #856404)',
                            border: '1px solid var(--warning-border, #ffc107)',
                        }}>
                            ⚠️ Google Maps API key not configured. Enter your address manually for now — the interactive map will work once the API key is added.
                        </div>

                        <div style={{ marginBottom: '0.75rem' }}>
                            <label className="label">Enter Your Mess Address *</label>
                            <textarea
                                className="input"
                                placeholder="e.g., 123, Near Pune Station, Pune, Maharashtra 411001"
                                value={manualAddress}
                                onChange={(e) => setManualAddress(e.target.value)}
                                style={{ minHeight: '80px' }}
                            />
                        </div>

                        {/* Use Current Location for coordinates */}
                        <button
                            type="button"
                            onClick={handleUseCurrentLocation}
                            disabled={isLoadingLocation}
                            className="btn btn-secondary"
                            style={{ width: '100%', marginBottom: '0.75rem' }}
                        >
                            {isLoadingLocation ? '⏳ Getting coordinates...' : '📍 Detect My Coordinates (optional)'}
                        </button>

                        {selectedPosition && (
                            <div style={{
                                display: 'flex',
                                gap: '1rem',
                                marginBottom: '1rem',
                                fontSize: '0.8rem',
                                color: 'var(--muted)',
                            }}>
                                <span>✅ Lat: {selectedPosition.lat.toFixed(6)}</span>
                                <span>Lng: {selectedPosition.lng.toFixed(6)}</span>
                            </div>
                        )}
                    </>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-secondary"
                        style={{ flex: 1 }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={hasApiKey ? (!selectedPosition || !address) : !manualAddress.trim()}
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                    >
                        ✓ Confirm Location
                    </button>
                </div>
            </div>
        </div>
    );
}
