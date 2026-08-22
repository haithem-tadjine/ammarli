export const RedisScripts = {
  UPDATE_DRIVER_LOCATION: {
    content: `
      local lastSeen = redis.call('HGET', KEYS[2], 'lastSeen')
      if lastSeen and tonumber(lastSeen) > tonumber(ARGV[4]) then
        return 0
      end
      redis.call('GEOADD', KEYS[1], ARGV[1], ARGV[2], ARGV[3])
      redis.call('HSET', KEYS[2], 'lastSeen', ARGV[4], 'lat', ARGV[2], 'lng', ARGV[1])
      redis.call('EXPIRE', KEYS[2], ARGV[5])
      return 1
    `,
  },
  CREATE_REQUEST: {
    content: `
      local activeRequestId = redis.call('GET', KEYS[2])
      if activeRequestId then
          local existingRequest = redis.call('GET', 'requests:' .. activeRequestId)
          if existingRequest then
              local decoded = cjson.decode(existingRequest)
              if decoded.status == "CANCELLED" or decoded.status == "EXPIRED" or decoded.status == "UNFULFILLED" then
                  redis.call('DEL', KEYS[2])
              else
                  return existingRequest
              end
          else
              redis.call('DEL', KEYS[2])
          end
      end
      redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
      redis.call('SET', KEYS[2], ARGV[1], 'EX', ARGV[3])
      return ARGV[2]
    `,
  },
  ACCEPT_REQUEST: {
    content: `
      local requestData = redis.call('GET', KEYS[1])
      if not requestData then
          return -1
      end
      local request = cjson.decode(requestData)
      if request.status == ARGV[3] or request.status == ARGV[4] then
          request.status = ARGV[2]
          request.driverId = ARGV[1]
          local updatedData = cjson.encode(request)
          redis.call('SET', KEYS[1], updatedData, 'KEEPTTL')
          return 1
      end
      return 0
    `,
  },
  REFUSE_REQUEST: {
    content: `
      local requestData = redis.call('GET', KEYS[1])
      if not requestData then
          return -1
      end
      local request = cjson.decode(requestData)
      if request.status == ARGV[2] or request.status == ARGV[3] then
          if not request.refusedDrivers then
              request.refusedDrivers = {}
          end
          local found = false
          for _, id in ipairs(request.refusedDrivers) do
              if id == ARGV[1] then
                  found = true
                  break
              end
          end
          if not found then
              table.insert(request.refusedDrivers, ARGV[1])
          end
          request.status = ARGV[2]
          local updatedData = cjson.encode(request)
          redis.call('SET', KEYS[1], updatedData, 'KEEPTTL')
          return 1
      end
      return 0
    `,
  },
  CLEAR_CACHE_BY_PATTERN: {
    content: `
      local cursor = "0"
      local deleted_count = 0
      repeat
          local result = redis.call("SCAN", cursor, "MATCH", ARGV[1], "COUNT", 100)
          cursor = result[1]
          local keys = result[2]
          if #keys > 0 then
              redis.call("DEL", unpack(keys))
              deleted_count = deleted_count + #keys
          end
      until cursor == "0"
      return deleted_count
    `,
  },
  REJECT_REQUEST: {
    content: `
      local requestData = redis.call('GET', KEYS[1])
      if not requestData then
          return -1
      end
      local request = cjson.decode(requestData)
      if (request.status == ARGV[3] or request.status == ARGV[4]) and request.offeredDriverId == ARGV[1] then
          request.status = ARGV[2]
          request.offeredDriverId = nil
          if not request.refusedDrivers then
              request.refusedDrivers = {}
          end
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
          return updatedData
      end
      return 0
    `,
  },
  RESERVE_DRIVER: {
    content: `
      local key = KEYS[1]
      local exists = redis.call('EXISTS', key)
      if exists == 0 then
          return 0
      end
      local currentStatus = redis.call('HGET', key, 'status')
      if currentStatus ~= ARGV[1] then
          return 0
      end
      redis.call('HSET', key, 'status', ARGV[2])
      return 1
    `,
  },
} as const;

export type RedisScriptName = keyof typeof RedisScripts;