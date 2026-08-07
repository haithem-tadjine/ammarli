import { Uuid } from '@/common/types/common.type';
import { Injectable } from '@nestjs/common';
import { AppLogger } from 'src/logger/logger.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WilayaEntity } from '../wilaya/entities/wilaya.entity';
import {
  DriverMetadata,
  DriverMetadataService,
} from '../driver/driver-metadata.service';
import { RequestResDto } from '../request/dto/request.res.dto';

interface ScoredCandidate {
  driverId: string;
  score: number;
  metadata: DriverMetadata;
  distanceKm: number;
  debug: Record<string, number>;
}

/**
 * Service that implements the "Fairness & Logic" matching algorithm for driver assignment.
 * Scores candidates based on a weighted multi-criteria decision-making (MCDM) approach.
 *
 * Factors:
 * - DISTANCE (0.7): Closer drivers score higher. Ensures fast delivery.
 * - IDLE_TIME (0.3): Drivers waiting longer score higher. Prevents starvation
 *   and ensures fair job distribution across the driver pool.
 *
 * @class MatchingService
 */
@Injectable()
export class MatchingService {
  /**
   * Configurable weights for scoring factors.
   * Total must sum to 1.0 for predictable normalization.
   *
   * DISTANCE (0.7): Proximity to pickup — closer is better.
   * IDLE_TIME (0.3): Time since last job — longer wait = higher priority.
   * @private
   */
  private readonly WEIGHTS = {
    DISTANCE: 0.7,
    IDLE_TIME: 0.3,
    DAILY_BALANCE: 0.0,
    RATING: 0.0,
  };

  constructor(
    private readonly driverMetadataService: DriverMetadataService,
    private readonly logger: AppLogger,
    @InjectRepository(WilayaEntity)
    private readonly wilayaRepo: Repository<WilayaEntity>,
  ) {
    this.logger.setContext(MatchingService.name);
  }

  /**
   * Ranks a set of driver candidates based on current request context and driver metadata.
   *
   * Algorithm Details:
   * 1. Filtering: Removes drivers who are not 'AVAILABLE' or have missing metadata.
   * 2. Normalization: Scales factors (distance, idle time, jobs) to a 0-1 range.
   * 3. Weighting: Applies the WEIGHTS configuration to produce a final composite score.
   * 4. Sorting: Returns candidates ordered by score descending.
   *
   * @param request - The active request being matched
   * @param candidates - List of [driverId, distanceKm] pairs from geospatial query
   * @returns Array of scored candidates with debug normalization data
   */
  async findBestDrivers(
    request: RequestResDto,
    candidates: [string, string][],
  ): Promise<ScoredCandidate[]> {
    if (!candidates.length) return [];

    const driverIds = candidates.map(([id]) => id);
    const metadataList =
      await this.driverMetadataService.getMetadataForDrivers(driverIds);

    let enforceDebtLimit = true;
    if (request.wilaya) {
      // Robustly identify the Wilaya using geoalgeria
      const geoalgeria = require('geoalgeria');
      const reqWilayaLower = request.wilaya.trim().toLowerCase();
      const matchedGeoWilaya = geoalgeria.wilayas.find((w: any) => 
        w.name_fr.toLowerCase() === reqWilayaLower ||
        w.name_ar === reqWilayaLower ||
        reqWilayaLower.includes(w.name_fr.toLowerCase()) ||
        reqWilayaLower.includes(w.name_ar) ||
        String(w.code) === reqWilayaLower ||
        String(w.code).padStart(2, '0') === reqWilayaLower
      );

      const searchCode = matchedGeoWilaya ? String(matchedGeoWilaya.code).padStart(2, '0') : request.wilaya;

      // In Algeria, Wilaya strings might be like "16 - الجزائر" or just "الجزائر".
      // We will try a flexible ILIKE match or just check if it contains the wilaya name.
      const wilayaRecord = await this.wilayaRepo.createQueryBuilder('w')
        .where(':reqWilaya ILIKE \'%\' || w.name || \'%\'', { reqWilaya: request.wilaya })
        .orWhere('w.code = :searchCode', { searchCode })
        .getOne();
      
      if (wilayaRecord) {
        // First check Commune exemption
        const reqCommune = (request.commune || '').trim().toLowerCase();
        let isCommuneExempt = false;
        
        if (reqCommune && wilayaRecord.exemptedCommunes && Array.isArray(wilayaRecord.exemptedCommunes)) {
          // Robust commune matching using geoalgeria just in case
          let searchCommune = reqCommune;
          if (matchedGeoWilaya) {
            const wilayaCommunes = geoalgeria.getCommunesByWilaya(matchedGeoWilaya.code);
            const matchedComm = wilayaCommunes.find((c: any) => c.name_fr.toLowerCase() === reqCommune || c.name_ar === reqCommune || reqCommune.includes(c.name_fr.toLowerCase()) || reqCommune.includes(c.name_ar));
            if (matchedComm) searchCommune = matchedComm.name_ar; // Assuming DB stores Arabic tags
          }
          
          isCommuneExempt = wilayaRecord.exemptedCommunes.some(c => {
             const cleanC = c.trim().toLowerCase();
             return cleanC === searchCommune || cleanC === reqCommune || reqCommune.includes(cleanC) || searchCommune.includes(cleanC);
          });
        }

        if (isCommuneExempt) {
          enforceDebtLimit = false;
          this.logger.log(`Commune ${reqCommune} in Wilaya ${wilayaRecord.code} is exempt from debt limit.`);
        } else if (!wilayaRecord.isDebtCeilingEnabled) {
          enforceDebtLimit = false;
          this.logger.log(`Wilaya ${wilayaRecord.code} is exempt from debt limit. Including suspended drivers.`);
        }
      } else {
        this.logger.warn(`Could not resolve wilaya policy for request wilaya: ${request.wilaya} (searchCode: ${searchCode}). Assuming default policy (debt enforced).`);
      }
    }

    const scoredCandidates: ScoredCandidate[] = [];

    let maxDist = 0;
    let maxIdle = 0;
    let maxDaily = 1;

    const now = Date.now();
    const validMetadata: { meta: DriverMetadata; dist: number }[] = [];

    // Stage 1: Filter and aggregate statistics for normalization
    for (let i = 0; i < candidates.length; i++) {
      const [id, distStr] = candidates[i];
      const dist = parseFloat(distStr);
      const meta = metadataList.find((m) => m.driverId === id);

      if (!meta) continue;

      if (meta.status !== 'AVAILABLE') continue;

      // Filter out suspended drivers (Debt exceeded max limit) ONLY if Wilaya enforces it
      if (enforceDebtLimit && meta.isSuspended === true) continue;

      // Filter out drivers who have explicitly refused this request
      if (request.refusedDrivers?.includes(id as Uuid)) continue;

      // Type-based routing constraints (Strict Filtering)
      if (request.type === 'TANKER') {
        if (meta.driverType !== 'TANKER') continue;
        
        const reqWaterType = (request.tankerDetails?.waterType || '').toLowerCase();
        let metaWaterType = (meta.waterType || '').toLowerCase();
        
        // Map 'ashghal' to 'construction' for backwards compatibility
        const normalizedReqWaterType = reqWaterType === 'ashghal' ? 'construction' : reqWaterType;
        const normalizedMetaWaterType = metaWaterType === 'ashghal' ? 'construction' : metaWaterType;

        if (normalizedReqWaterType && normalizedMetaWaterType && normalizedReqWaterType !== normalizedMetaWaterType) {
          continue; // Water type mismatch, do not dispatch to this driver
        }
      } else if (request.type === 'BOTTLED') {
        if (meta.driverType !== 'BOTTLED') continue;
      }

      validMetadata.push({ meta, dist });

      if (dist > maxDist) maxDist = dist;
      const idle = now - meta.lastJobTimestamp;
      if (idle > maxIdle) maxIdle = idle;
      if (meta.dailyJobCount > maxDaily) maxDaily = meta.dailyJobCount;
    }

    if (maxDist === 0) maxDist = 1;
    if (maxIdle === 0) maxIdle = 1;

    // Stage 2: Calculate composite scores
    for (const { meta, dist } of validMetadata) {
      // Normalization Logic:
      // Distance: Closer is better (Invert: 1 - ratio)
      const nDist = 1 - dist / maxDist;

      // Idle Time: Longer wait equals higher priority (direct ratio)
      const idleMs = now - meta.lastJobTimestamp;
      const nIdle = idleMs / maxIdle;

      // Daily Balance: Fewer jobs today equals higher priority (Invert: 1 - ratio)
      const nBalance = 1 - meta.dailyJobCount / maxDaily;

      // Rating: Direct linear scale (0-5 to 0-1)
      const nRating = meta.rating / 5.0;

      const score =
        this.WEIGHTS.DISTANCE * nDist +
        this.WEIGHTS.IDLE_TIME * nIdle +
        this.WEIGHTS.DAILY_BALANCE * nBalance +
        this.WEIGHTS.RATING * nRating;

      this.logger.debug(
        `[Matching] Driver ${meta.driverId}: score=${score.toFixed(4)} ` +
        `(dist=${dist.toFixed(2)}km nDist=${nDist.toFixed(3)}, ` +
        `idle=${(idleMs / 1000).toFixed(0)}s nIdle=${nIdle.toFixed(3)}) ` +
        `W=[D:${this.WEIGHTS.DISTANCE} I:${this.WEIGHTS.IDLE_TIME}]`,
      );

      scoredCandidates.push({
        driverId: meta.driverId,
        score,
        metadata: meta,
        distanceKm: dist,
        debug: { nDist, nIdle, nBalance, nRating },
      });
    }

    return scoredCandidates.sort((a, b) => b.score - a.score);
  }
}
