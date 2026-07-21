# Ammarli System Architecture & Context Map

This document provides a comprehensive analysis of the Ammarli application ecosystem (Frontend and Backend), mapping out its core technologies, request lifecycle, data linkages, and potential vulnerabilities.

---

## 1. System Architecture & Stack

The Ammarli application follows a modern, decoupled client-server architecture with a strong emphasis on real-time event-driven processing.

### **Frontend (`ammarli-v2`)**
- **Framework:** React Native with Expo (v54.0.35)
- **State Management:** Zustand (lightweight, hook-based state management)
- **API & Networking:** Axios for REST API calls
- **Real-Time Communication:** `socket.io-client` for persistent WebSocket connections (tracking, dispatch offers).
- **Core Features:** Background/Foreground location tracking (`expo-location`), notifications (`expo-notifications`).

### **Backend (`ammerli/apps/backend`)**
- **Framework:** NestJS (v11)
- **Database (Persistent):** PostgreSQL with TypeORM. Used for persistent data (Users, Drivers, finalized Requests, Orders).
- **In-Memory & Caching:** Redis (`ioredis`). Heavily utilized for ephemeral data: active requests, driver geospatial indexes (`geoRadius`), and session metadata.
- **Message Broker:** RabbitMQ (`@golevelup/nestjs-rabbitmq`). Used for decoupling domain modules (e.g., dispatching engine communicating with tracking gateway).
- **Job Queue:** BullMQ (`@nestjs/bullmq`). Used for delayed tasks like `dispatch-timeout` (30s limits) and continuous matching sweeps.
- **Real-Time Server:** Socket.io (`@nestjs/websockets` & `@nestjs/platform-socket.io`).

---

## 2. Core Lifecycle Flow: "Water Delivery Request"

The step-by-step journey of a request from the Customer clicking "Order" to the Driver clicking "Delivered".

1. **Creation (Client -> Backend):**
   - The Client POSTs to `/requests`. 
   - `RequestService.createRequest()` generates a UUID, stores the request in **Redis** with a status of `SEARCHING` and a 60-second TTL.
   - It publishes a `REQUEST_CREATED` event to **RabbitMQ**.

2. **Dispatching (Backend Internal):**
   - A consumer picks up the event and triggers `DispatchService.dispatchRequest()`.
   - Uses Redis Geospatial Query (`geoRadius`) to find nearby drivers.
   - `MatchingService` scores the candidates (currently hardcoded to prioritize 100% distance proximity).
   - The Request is updated to `DISPATCHED` in Redis.
   - A 30-second `dispatch-timeout-job` is added to **BullMQ**.
   - Emits `RabbitMqRoutingKey.DRIVER_OFFERED` to RabbitMQ.

3. **Driver Offering (Backend -> Driver):**
   - `TrackingGateway` intercepts the `DRIVER_OFFERED` RabbitMQ event.
   - Emits a `dispatch_offer` WebSocket event to the specific driver's socket room (`driver_<id>`).
   - The Driver's metadata is marked as `BUSY` in Redis to prevent concurrent offers.

4. **Acceptance / Rejection (Driver -> Backend):**
   - **Reject:** If rejected (or if BullMQ timeout expires), `DispatchService.handleDispatchRejection()` runs an atomic Lua script (`REJECT_REQUEST`) to reset the state to `SEARCHING`, marks the driver as `AVAILABLE`, and re-emits `REQUEST_CREATED` to cascade to the next driver.
   - **Accept:** Driver POSTs to `/requests/:id/lock`. `DispatchService.acceptRequest()` runs an atomic Lua script (`ACCEPT_REQUEST`) ensuring no race conditions. Status becomes `LOCKED`/`ACCEPTED`. The BullMQ timeout is cancelled. Emits `request.accepted`.

5. **In Progress (Driver -> Backend):**
   - Driver clicks Start: POST `/requests/:id/start` -> Status becomes `DELIVERING`. Emits `RIDE_STARTED`.
   - Driver arrives: POST `/requests/:id/arrived` -> Status becomes `ARRIVED`.

6. **Completion (Driver -> Backend):**
   - Driver clicks Delivered: POST `/requests/:id/complete`. 
   - `RequestService.finalizeRequest()` changes status to `DELIVERED`.
   - **Persistence:** The ephemeral Redis request is finally translated into a TypeORM `RequestEntity` and saved to **PostgreSQL**.
   - The associated `Order` record in PostgreSQL is updated to `DELIVERED` via a raw SQL query.
   - Driver's total earnings and job count are incremented.
   - The active request is purged from the Redis cache.

---

## 3. Data Linkage & Relationships

- **Frontend to Backend:** Handled via standard REST endpoints for state transitions (Accept, Complete, Cancel). However, all "push" updates (new offers, customer tracking driver location, cancellations) happen via **WebSockets**.
- **Backend to Redis:** Redis is the source of truth for the **"Active Phase"**. All in-flight requests, real-time driver coordinates, and driver statuses (`BUSY`/`AVAILABLE`) live entirely in Redis. This ensures high throughput and low latency. Atomic **Lua scripts** are used heavily to prevent race conditions when two drivers try to accept the same order simultaneously.
- **Backend to PostgreSQL:** Postgres is the source of truth for the **"Rest Phase"**. It acts as the historical ledger. Requests only touch Postgres once they reach a terminal state (`DELIVERED`, `CANCELLED`, `EXPIRED`).
- **Inter-Module Communication:** Modules do not call each other tightly. Instead, `DispatchService` publishes to `RabbitMQ`, and `TrackingGateway` subscribes to those exchanges. This prevents the HTTP layer from being tightly coupled to the WebSocket layer.

---

## 4. Identified Vulnerabilities & Disconnects

During the codebase analysis, several critical areas of concern were identified:

### **A. Architecture & Consistency Risks**
1. **Raw SQL Bypassing TypeORM Lifecycle:**
   - In `RequestService.finalizeRequest()` and `cancelRequest()`, the associated orders and drivers are updated using raw SQL (`queryRunner.manager.query('UPDATE "orders" SET status = ...')`). This bypasses TypeORM entity listeners, subscribers, and interceptors. If an audit log or trigger relies on TypeORM hooks, it will fail silently.
2. **Global WebSocket Broadcast Fallback (Privacy Risk):**
   - In `TrackingGateway.handleRequestEvents()`, if a request is cancelled but the system fails to resolve the specific driver's User ID, it falls back to: `this.server.emit(dEvent, msg);`. This broadcasts the cancellation (and the request payload) to **every single connected user and driver** globally. This is a significant security and performance flaw.

### **B. Race Conditions in Dispatch Engine**
1. **Concurrent Offers (Driver Status Sync):**
   - `DispatchService.dispatchRequest` sets a driver to `BUSY` *after* querying for nearby drivers. Under high load, two simultaneous requests could query Redis at the same millisecond, find the same driver as `AVAILABLE`, and dispatch two competing offers to the same driver. The driver app must be resilient enough to handle multiple incoming `dispatch_offer` sockets.
2. **Continuous Sweep Conflict:**
   - The `continuous-matching` BullMQ job runs every 10 seconds. If a request reaches its 60s TTL exactly when the sweep picks it up, there may be a race condition between `markRequestUnfulfilled` and `dispatchRequest` attempting to re-route it.

### **C. Orphaned & Dead Code**
1. **Matching Service Weights:**
   - In `MatchingService.WEIGHTS`, `IDLE_TIME` is set to `0.0` and `DISTANCE` to `1.0`. This indicates that the "intelligent" dispatch algorithm is essentially dead code, defaulting purely to raw proximity.
2. **Questionable Cache Repository Methods:**
   - In `RequestService.finalizeRequest()`, there is a defensive check: `if (typeof this.cacheRepo.removeUserActiveRequest === 'function')`. This implies instability or a mismatch between the interface and implementation of the Cache Repository, hinting at unresolved technical debt.

---
*Report generated by Antigravity Principal Architect.*
