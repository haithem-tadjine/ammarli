-- accept_request.lua
-- ==================
-- Atomic request acceptance by driver.
-- Prevents multiple drivers from accepting the same request.
--
-- KEYS[1] = requests:index:{requestId}     (Full Redis key for the request payload)
-- KEYS[2] = requests:driver:{driverId}     (Reverse index: driver → active request key)
--
-- ARGV[1] = driverId
-- ARGV[2] = statusAccepted (e.g., 'LOCKED')
-- ARGV[3] = statusSearching (e.g., 'SEARCHING')
-- ARGV[4] = statusDispatched (e.g., 'DISPATCHED')
-- ARGV[5] = ttlSeconds (e.g., '7200' — 2 hours, trip safety window)

local requestData = redis.call('GET', KEYS[1])
if not requestData then
    return -1 -- Request not found
end

local request = cjson.decode(requestData)

if request.status == ARGV[3] or request.status == ARGV[4] then
    request.status = ARGV[2]
    request.driverId = ARGV[1]

    local updatedData = cjson.encode(request)
    redis.call('SET', KEYS[1], updatedData, 'KEEPTTL')

    -- Write the reverse index: requests:driver:{driverId} → requests:index:{requestId}
    -- This lets the Gateway find the active request key in O(1) without touching PostgreSQL.
    redis.call('SET', KEYS[2], KEYS[1], 'EX', tonumber(ARGV[5]))

    return 1 -- Success
end

return 0 -- Already accepted or in invalid state
