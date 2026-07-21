-- reserve_driver.lua
-- ==================
-- Atomic check-and-set to reserve a driver for a dispatch offer.
-- Prevents two concurrent requests from offering to the same driver.
--
-- KEYS[1] = driver:metadata:{driverId}   (Hash key)
--
-- ARGV[1] = expected current status       (e.g., 'AVAILABLE')
-- ARGV[2] = new status to set             (e.g., 'BUSY')
--
-- Returns:
--   1  = Success (driver was AVAILABLE, now set to BUSY)
--   0  = Failure (driver was NOT AVAILABLE — already BUSY, OFFLINE, or missing)

local key = KEYS[1]

-- Check if the hash exists at all
local exists = redis.call('EXISTS', key)
if exists == 0 then
    return 0 -- Driver metadata not found (probably offline)
end

local currentStatus = redis.call('HGET', key, 'status')
if currentStatus ~= ARGV[1] then
    return 0 -- Driver is not in the expected state
end

-- Atomically set the new status
redis.call('HSET', key, 'status', ARGV[2])
return 1
