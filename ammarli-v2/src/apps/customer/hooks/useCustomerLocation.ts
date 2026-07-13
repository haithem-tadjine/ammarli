/**
 * ─── useCustomerLocation ──────────────────────────────────────────────────────
 * One-time location fetch for the customer (for order placement).
 * Checks permission, fetches coords, handles errors gracefully.
 */

import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

interface CustomerLocationState {
  coords: { latitude: number; longitude: number } | null;
  address: string;
  permissionGranted: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCustomerLocation(): CustomerLocationState {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [address, setAddress] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchLocation = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          setError('location_permission_denied');
          setIsLoading(false);
          return;
        }

        setPermissionGranted(true);

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
        });

        if (cancelled) return;

        const { latitude, longitude } = loc.coords;
        setCoords({ latitude, longitude });

        // Reverse geocode
        const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (!cancelled && geo.length > 0) {
          const g = geo[0];
          const parts = [g.street, g.district, g.city].filter(Boolean);
          setAddress(parts.join(', ') || 'Current Location');
        }
      } catch (e) {
        if (!cancelled) {
          setError('location_fetch_failed');
          console.warn('[useCustomerLocation] error:', e);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchLocation();
    return () => {
      cancelled = true;
    };
  }, [trigger]);

  const refetch = () => setTrigger((t) => t + 1);

  return { coords, address, permissionGranted, isLoading, error, refetch };
}
