# Presence / Online Members (Socket.IO)

This file documents the Socket.IO presence feature implemented for branch-specific "who's online" support.

## Events (server -> clients)

### online-members
- Direction: server → `branch-{branchId}`
- Payload: Array of member objects
  [
    {
      "id": "user_abc123",
      "name": "Jane Doe",
      "photoUrl": "https://.../abc.jpg",
      "role": "ADMIN|MANAGER|STAFF",
      "branchId": "branch-123",
      "lastActiveAt": "2025-11-25T12:34:56Z"
    }, ...
  ]

### user-online
- Direction: server → `branch-{branchId}`
- Payload: single member object (see above) with `connectedAt`

### user-offline
- Direction: server → `branch-{branchId}`
- Payload: { id, branchId, wentOfflineAt }

## Client → Server interactions

- Client must connect with an auth token in the socket handshake (recommended):
  ```js
  const socket = io('https://api.example.com', { auth: { token: JWT } });
  ```
- After connect the server will authenticate your token and auto-join you to `branch-{branchId}` (from the user's `branch_context` / `branch_id`).
- Admins are auto-joined to `admins-overview` room.
- You can request joining another branch (admins only or your own) with:
  ```js
  socket.emit('join-branch', 'BRANCH_ID', (response) => { /* ack */ });
  ```

## Server-side implementation

- `backend/utils/presence.js` — presence abstraction with Redis (if `REDIS_URL` is set) or in-memory fallback.
- `backend/server.js` — socket auth middleware (JWT) and handlers to add/remove presence, and relay presence events (using the presence module) to Socket.IO rooms.
- `backend/routes/presence.js` — debug/admin REST endpoints:
  - `GET /api/presence/branch/:branchId` — returns online members for a branch (authenticated & branch access required)
  - `GET /api/presence/online` — admin-only listing for all branches

## Scaling & cluster behavior

- When `REDIS_URL` is provided and `ioredis` is installed, presence will store sets/hashes in Redis and use Redis Pub/Sub to sync presence across instances.
- In-memory fallback works for single-instance deployments.
- Consider setting short TTLs for stale sockets & sending client heartbeats if desired.

## Tests

- Unit test: `backend/tests/presence_unit_test.js` — validates add/remove/get behavior and multiple sockets per user
- Event integration test: `backend/tests/presence_integration_event_test.js` — validates events emitted by the presence module

Run tests (from `backend` folder):

```bash
npm run test:presence
npm run test:presence-events
```

## Security & privacy

- Only authenticated sockets are allowed to join presence
- Server verifies that non-admin users can only join their own branch
- Admins may be allowed to view cross-branch presence (admins-overview room)
- Only minimal user info is emitted (id, name, photoUrl, role, branch)

## Next steps & improvements

- Add TTL/heartbeat cleanup of stale sockets (e.g. remove sockets not heartbeating for 60–120s)
- Add more integration tests with real Redis cluster simulation
- Support ephemeral socket identifiers tied to instance id for better cleanup across crashes

