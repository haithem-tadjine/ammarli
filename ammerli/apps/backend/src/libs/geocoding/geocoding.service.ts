import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  
  // Cache to avoid hitting Nominatim rate limits. Key is rounded lat/lng (approx 1km precision)
  private cache = new Map<string, { wilaya: string; commune: string }>();

  /**
   * Performs a reverse geocode using Nominatim OpenStreetMap API.
   * Note: This is a public free API, consider adding a user-agent to comply with their TOS.
   */
  async reverseGeocode(lat: number, lng: number): Promise<{ wilaya: string; commune: string } | null> {
    // Round to 2 decimal places (approx 1.1km accuracy)
    const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: {
          lat,
          lon: lng,
          format: 'jsonv2',
          zoom: 10,
          'accept-language': 'ar', // Attempt to get Arabic names if possible, or fallback
        },
        headers: {
          'User-Agent': 'Ammarli-App/1.0' // Required by Nominatim usage policy
        }
      });

      if (response.data && response.data.address) {
        const address = response.data.address;
        
        // In Algeria, State/Province maps to 'state', Commune maps to 'county', 'city', 'town', or 'suburb'
        const wilaya = address.state || address.province || address.region || 'Unknown Wilaya';
        const commune = address.county || address.city || address.town || address.suburb || address.village || 'Unknown Commune';
        
        const result = { wilaya, commune };
        this.cache.set(cacheKey, result);
        return result;
      }

      const fallback = { wilaya: 'Unknown Wilaya', commune: 'Unknown Commune' };
      this.cache.set(cacheKey, fallback);
      return fallback;
    } catch (error) {
      this.logger.error(`Failed to reverse geocode lat: ${lat}, lng: ${lng}`, error);
      // Return a fallback or null so we don't crash the main flow
      const fallback = { wilaya: 'Unknown Wilaya', commune: 'Unknown Commune' };
      this.cache.set(cacheKey, fallback);
      return fallback;
    }
  }
}
