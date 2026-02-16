// Google Maps utilities for geocoding and distance calculation
// Client-side only for Places Autocomplete; server uses internal Haversine

export interface GeocodingResult {
    latitude: number;
    longitude: number;
    formattedAddress: string;
}

// Server-side geocoding using Google Geocoding API
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
        console.error('Google Maps API key not configured');
        return null;
    }

    try {
        const encodedAddress = encodeURIComponent(address);
        const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`
        );

        const data = await response.json();

        if (data.status !== 'OK' || !data.results?.[0]) {
            console.error('Geocoding failed:', data.status);
            return null;
        }

        const result = data.results[0];
        return {
            latitude: result.geometry.location.lat,
            longitude: result.geometry.location.lng,
            formattedAddress: result.formatted_address,
        };
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
}

// Reverse geocoding (coordinates to address)
export async function reverseGeocode(
    latitude: number,
    longitude: number
): Promise<string | null> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
        console.error('Google Maps API key not configured');
        return null;
    }

    try {
        const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
        );

        const data = await response.json();

        if (data.status !== 'OK' || !data.results?.[0]) {
            return null;
        }

        return data.results[0].formatted_address;
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return null;
    }
}

// Client-side: Initialize Google Places Autocomplete
export function initPlacesAutocomplete(
    inputElement: HTMLInputElement,
    onPlaceSelect: (place: {
        address: string;
        latitude: number;
        longitude: number;
    }) => void
): void {
    if (typeof window === 'undefined' || !window.google?.maps?.places) {
        console.error('Google Maps not loaded');
        return;
    }

    const autocomplete = new window.google.maps.places.Autocomplete(inputElement, {
        componentRestrictions: { country: 'in' },
        fields: ['formatted_address', 'geometry'],
        types: ['address'],
    });

    autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry?.location) {
            onPlaceSelect({
                address: place.formatted_address || '',
                latitude: place.geometry.location.lat(),
                longitude: place.geometry.location.lng(),
            });
        }
    });
}

// Format distance for display
export function formatDistance(distanceKm: number): string {
    if (distanceKm < 1) {
        return `${Math.round(distanceKm * 1000)}m`;
    }
    return `${distanceKm.toFixed(1)}km`;
}

// Generate Google Maps URL for a location
export function getGoogleMapsUrl(latitude: number, longitude: number): string {
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

// Generate directions URL
export function getDirectionsUrl(
    destLat: number,
    destLng: number,
    originLat?: number,
    originLng?: number
): string {
    const destination = `${destLat},${destLng}`;
    if (originLat && originLng) {
        const origin = `${originLat},${originLng}`;
        return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}
