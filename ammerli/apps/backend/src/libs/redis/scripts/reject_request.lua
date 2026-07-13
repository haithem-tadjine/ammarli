-- reject_request.lua
-- ==================
-- Atomic request rejection by driver or timeout.
-- Prevents stale timeouts from modifying the state of the request.
--
-- KEYS[1] = requests:index:{requestId}     (Full Redis key)
--
-- ARGV[1] = driverId
-- ARGV[2] = statusSearching (e.g., 'SEARCHING')
-- ARGV[3] = statusDispatched (e.g., 'DISPATCHED')

local requestData = redis.call('GET', KEYS[1])
if not requestData then
    return -1 -- Request not found
end

local request = cjson.decode(requestData)

if (request.status == ARGV[3] or request.status == ARGV[4]) and request.offeredDriverId == ARGV[1] then
    -- It is a valid timeout/rejection for the currently offered driver
    request.status = ARGV[2]
    
    -- Clear the offeredDriverId
    request.offeredDriverId = nil
    
    -- Add the driver to refusedDrivers array
    if not request.refusedDrivers then
        request.refusedDrivers = {}
    end
    
    -- Check if driver is already in the array (Lua table)
    local found = false
    for i, v in ipairs(request.refusedDrivers) do
        if v == ARGV[1] then
            found = true
            break
        end
    end
    
    if not found then
        table.insert(request.refusedDrivers, ARGV[1])
    end

    local updatedData = cjson.encode(request)
    redis.call('SET', KEYS[1], updatedData, 'KEEPTTL')
    
    -- Return the updated payload so the backend can use it to cascade
    return updatedData
end

-- Stale timeout or request already accepted
return 0
