/**
 * ─── useDriverLocation ────────────────────────────────────────────────────────
 * Custom hook for real-time driver GPS tracking.
 *
 * Uses expo-location's watchPositionAsync for continuous updates.
 * Updates the driver's location in useDriverStore every 3 seconds or 10 meters.
 *
 * @example
 * const { coords, cityName, permissionGranted } = useDriverLocation();
 */

import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useDriverStore } from '../../../store/useDriverStore';

interface DriverLocationState {
  coords: { latitude: number; longitude: number } | null;
  cityName: string;
  permissionGranted: boolean;
  isLoading: boolean;
}

const DEFAULT_CITY = 'Batna';
const MOCK_LOCATION = { latitude: 35.5548, longitude: 6.1499 }; // Batna Center

export function useDriverLocation(): DriverLocationState {
  const updateDriverLocation = useDriverStore((s) => s.updateDriverLocation);

  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [cityName, setCityName] = useState(DEFAULT_CITY);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let mockInterval: ReturnType<typeof setInterval> | null = null;

    const emitToSocket = (lat: number, lng: number) => {
      import('../../../services/socket').then(({ socketService }) => {
        if (!socketService.socket) {
          const { useAuthStore } = require('../../../store/useAuthStore');
          const driverId = useAuthStore.getState().userProfile?.id ?? 'unknown';
          socketService.connectAsDriver(driverId).then(() => {
            socketService.emitLocationUpdate(lat, lng);
          });
        } else {
          socketService.emitLocationUpdate(lat, lng);
        }
      });
    };

    const startMockTracking = () => {
      setCoords(MOCK_LOCATION);
      updateDriverLocation(MOCK_LOCATION.latitude, MOCK_LOCATION.longitude);
      setCityName('Batna (Mock)');
      setIsLoading(false);
      
      // Emit immediately
      emitToSocket(MOCK_LOCATION.latitude, MOCK_LOCATION.longitude);
      
      // And emit every 5 seconds to keep geo index fresh
      mockInterval = setInterval(() => {
        emitToSocket(MOCK_LOCATION.latitude, MOCK_LOCATION.longitude);
      }, 5000);
    };

    const startTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          console.warn('[useDriverLocation] Permission denied, using mock location.');
          startMockTracking();
          return;
        }

        setPermissionGranted(true);

        // Get initial position
        const initialLoc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
        });

        const { latitude, longitude } = initialLoc.coords;
        setCoords({ latitude, longitude });
        updateDriverLocation(latitude, longitude);

        // Reverse geocode for city name
        try {
          const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (geo.length > 0) {
            setCityName(
              geo[0].city || geo[0].district || geo[0].region || DEFAULT_CITY,
            );
          }
        } catch (e) {
          // ignore geocode error
        }

        // Start continuous tracking
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 3000,   // every 3 seconds
            distanceInterval: 10, // or every 10 meters
          },
          (location) => {
            const { latitude: lat, longitude: lng } = location.coords;
            setCoords({ latitude: lat, longitude: lng });
            updateDriverLocation(lat, lng);
            emitToSocket(lat, lng);
          },
        );
        setIsLoading(false);
      } catch (error) {
        console.warn('[useDriverLocation] error during tracking:', error);
        // Fallback to mock location if GPS fails (common on web/emulators)
        startMockTracking();
      }
    };

    startTracking();

    return () => {
      subscription?.remove();
      if (mockInterval) clearInterval(mockInterval);
    };
  }, []);

  return { coords, cityName, permissionGranted, isLoading };
}

