'use client';

import { useState, useEffect, useCallback } from 'react';

interface LocationState {
    latitude: number | null;
    longitude: number | null;
    error: string | null;
    isLoading: boolean;
}

export function useLocation() {
    const [location, setLocation] = useState<LocationState>({
        latitude: null,
        longitude: null,
        error: null,
        isLoading: false,
    });

    const requestLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setLocation((prev) => ({
                ...prev,
                error: 'Geolocation is not supported by your browser',
                isLoading: false,
            }));
            return;
        }

        setLocation((prev) => ({ ...prev, isLoading: true, error: null }));

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    error: null,
                    isLoading: false,
                });
            },
            (error) => {
                let errorMessage = 'Failed to get location';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location permission denied. Please enable it in your browser settings.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information is unavailable.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out.';
                        break;
                }
                setLocation({
                    latitude: null,
                    longitude: null,
                    error: errorMessage,
                    isLoading: false,
                });
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000, // 5 minutes
            }
        );
    }, []);

    useEffect(() => {
        // Try to get location on mount
        requestLocation();
    }, [requestLocation]);

    return { ...location, requestLocation };
}

export default useLocation;
