import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Thin wrapper over the Redis client for key-value operations.
 * Use this instead of injecting REDIS_CLIENT directly for get/set/del/exists.
 */
@Injectable()
export class RedisLibsService {
  constructor(@Inject('REDIS_CLIENT') private readonly client: Redis) {}

  /**
   * Checks if a key exists in Redis.
   *
   * @param key - Redis key to check.
   * @returns `true` if the key exists; `false` otherwise.
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  /**
   * Gets the string value of a key.
   *
   * @param key - Redis key to read.
   * @returns The value, or `null` if the key does not exist.
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * Sets a key to a string value, optionally with a TTL.
   *
   * @param key - Redis key to set.
   * @param value - String value to store.
   * @param ttlSeconds - Optional time-to-live in seconds (uses EX).
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds != null) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * Deletes a key from Redis.
   *
   * @param key - Redis key to delete.
   */
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Finds members in a geospatial index within a radius.
   *
   * @param key - Redis key of the geospatial index.
   * @param lng - Longitude of the center.
   * @param lat - Latitude of the center.
   * @param radius - Radius distance.
   * @param unit - Distance unit (e.g., 'km').
   * @returns Array of [member, distance] tuples.
   */
  async geoRadius(
    key: string,
    lng: number,
    lat: number,
    radius: number,
    unit: 'm' | 'km' | 'mi' | 'ft',
  ): Promise<[string, string][]> {
    return (await this.client.georadius(
      key,
      lng,
      lat,
      radius,
      unit,
      'WITHDIST',
      'ASC',
    )) as unknown as [string, string][];
  }

  /**
   * Adds a member to a geospatial index.
   *
   * @param key - Redis key of the geospatial index.
   * @param lng - Longitude.
   * @param lat - Latitude.
   * @param member - Member identifier.
   */
  async geoAdd(key: string, lng: number, lat: number, member: string): Promise<void> {
    await this.client.geoadd(key, lng, lat, member);
  }

  /**
   * Removes members from a sorted set.
   *
   * @param key - Redis key of the sorted set.
   * @param members - Members to remove.
   */
  async zrem(key: string, ...members: string[]): Promise<void> {
    if (members.length > 0) {
      await this.client.zrem(key, ...members);
    }
  }

  /**
   * Returns the number of members in a sorted set.
   *
   * @param key - Redis key of the sorted set.
   * @returns Number of members in the set.
   */
  async zcard(key: string): Promise<number> {
    return this.client.zcard(key);
  }

  /**
   * Returns the number of members in a set.
   *
   * @param key - Redis key of the set.
   * @returns Number of members in the set.
   */
  async scard(key: string): Promise<number> {
    return this.client.scard(key);
  }

  /**
   * Returns all members of a set.
   *
   * @param key - Redis key of the set.
   * @returns Array of string members.
   */
  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  /**
   * Removes one or more members from a set.
   *
   * @param key - Redis key of the set.
   * @param members - Members to remove.
   */
  async srem(key: string, ...members: string[]): Promise<void> {
    if (members.length > 0) {
      await this.client.srem(key, ...members);
    }
  }

  /**
   * Checks existence of multiple keys using a pipeline.
   *
   * @param keys - Array of Redis keys to check.
   * @returns Array of booleans corresponding to the input keys (true if exists).
   */
  async manyExists(keys: string[]): Promise<boolean[]> {
    if (keys.length === 0) return [];

    const pipeline = this.client.pipeline();
    keys.forEach((key) => pipeline.exists(key));
    const results = await pipeline.exec();

    return results.map(([, result]) => result === 1);
  }
  /**
   * Sets multiple fields in a hash.
   *
   * @param key - Redis key of the hash.
   * @param data - Object containing field-value pairs.
   * @param ttlSeconds - Optional TTL for the key.
   */
  async hset(
    key: string,
    data: Record<string, string | number>,
    ttlSeconds?: number,
  ): Promise<void> {
    await this.client.hset(key, data);
    if (ttlSeconds) {
      await this.client.expire(key, ttlSeconds);
    }
  }

  /**
   * Gets a specific field value from a hash.
   *
   * @param key - Redis key of the hash.
   * @param field - Field to retrieve.
   * @returns Value of the field, or null if it doesn't exist.
   */
  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  /**
   * Gets all fields and values from a hash.
   *
   * @param key - Redis key of the hash.
   * @returns Object containing all field-value pairs.
   */
  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  /**
   * Gets values for specific fields from a hash.
   *
   * @param key - Redis key.
   * @param fields - Fields to retrieve.
   */
  async hmget(key: string, ...fields: string[]): Promise<(string | null)[]> {
    return this.client.hmget(key, ...fields);
  }

  /**
   * Finds all keys matching a given pattern using non-blocking SCAN.
   * Replaces the blocking KEYS command to prevent Redis server-thread freezes
   * under production load. SCAN iterates in batches of 100, yielding between
   * each batch so other commands can interleave.
   *
   * @param pattern - Match pattern (e.g., 'requests:*')
   */
  async keys(pattern: string): Promise<string[]> {
    const results: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      results.push(...keys);
    } while (cursor !== '0');
    return results;
  }
}
