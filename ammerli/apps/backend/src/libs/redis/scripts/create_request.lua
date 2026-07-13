-- create_request.lua
-- =================
-- Atomic request creation with idempotency check
--
-- KEYS[1] = requests:index:{requestId}     (RedisConstants.KEYS.REQUESTS_INDEX:requestId)
-- KEYS[2] = requests:index:user:{userId}   (RedisConstants.KEYS.REQUESTS_INDEX:user:userId)
--
-- ARGV[1] = requestId
-- ARGV[2] = requestPayload (JSON string)
-- ARGV[3] = ttlSeconds
-- ARGV[4] = userId

-- Check if user already has an active request
local activeRequestId = redis.call('GET', KEYS[2])

if activeRequestId then
    -- Fetch existing active request
    local existingRequest = redis.call('GET', 'requests:' .. activeRequestId)
    if existingRequest then
        -- Safety check: don't return terminal states
        local decoded = cjson.decode(existingRequest)
        if decoded.status == "CANCELLED" or decoded.status == "EXPIRED" or decoded.status == "UNFULFILLED" then
            redis.call('DEL', KEYS[2])
        else
            return existingRequest
        end
    else
        -- Clean up dead link
        redis.call('DEL', KEYS[2])
    end
end

-- Create new request
redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
-- Link user to active request
redis.call('SET', KEYS[2], ARGV[1], 'EX', ARGV[3])

return ARGV[2]
