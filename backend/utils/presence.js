const EventEmitter = require('events');
const db = require('./../config/database');

class Presence extends EventEmitter {
  constructor() {
    super();
    this.useRedis = !!process.env.REDIS_URL;
    this.initialized = false;
    this.serverId = process.env.INSTANCE_ID || (Math.random() + '').slice(2, 10);

    // In-memory fallback structures
    this.branches = new Map(); // branchId -> Map(userId -> {meta, sockets:Set, connectedAt})
    this.socketToUser = new Map(); // socketId -> { userId, branchId }

    // Redis placeholders
    this.redis = null;
    this.redisSub = null;
  }

  async init() {
    if (this.initialized) return;

    if (this.useRedis) {
      try {
        const IORedis = require('ioredis');
        this.redis = new IORedis(process.env.REDIS_URL);
        this.redisSub = new IORedis(process.env.REDIS_URL);

        // subscribe to presence pubsub channel prefix
        this.redisSub.on('message', (channel, message) => {
          try {
            const payload = JSON.parse(message);
            // derive branchId from channel 'presence:branch:{branchId}' and include it
            const parts = channel.split(':');
            const branchId = parts[2] || null;
            const dataWithBranch = typeof payload.data === 'object' && payload.data !== null
              ? { ...payload.data, branchId }
              : payload.data;
            // re-emit events locally so server instance can use them
            this.emit(payload.event, dataWithBranch);
          } catch (e) {
            console.error('Invalid presence pubsub message', e?.message || e);
          }
        });

        await this.redisSub.psubscribe('presence:branch:*');
        console.log('✅ Presence: Redis enabled for clustered presence');
        this.initialized = true;
        return;
      } catch (error) {
        console.warn('⚠️ Presence: Redis disabled or not available - falling back to in-memory. Install ioredis and set REDIS_URL to enable cluster-safe presence.');
        this.useRedis = false;
      }
    }

    // in-memory fallback works out of the box
    this.initialized = true;
    console.log('✅ Presence: using in-memory presence store');
  }

  // helper: emit and publish (when redis enabled)
  async _announce(channel, event, data) {
    try {
      this.emit(event, data);
      if (this.useRedis && this.redis) {
        const payload = { event, data };
        await this.redis.publish(channel, JSON.stringify(payload));
      }
    } catch (e) {
      console.error('Presence announce failed', e?.message || e);
    }
  }

  // Add a socket under user->branch
  async addSocket({ branchId, userId, socketId, meta = {} }) {
    if (!this.initialized) await this.init();

    branchId = String(branchId);

    if (this.useRedis && this.redis) {
      // update Redis state
      const branchKey = `presence:branch:${branchId}:users`;
      const userSocketsKey = `presence:user:${userId}:sockets`;
      const userMetaKey = `presence:user:${userId}:meta`;

      // Add socket id to user's socket set
      await this.redis.sadd(userSocketsKey, socketId);
      // Ensure branch set contains the user
      await this.redis.sadd(branchKey, userId);
      // Set user meta hash
      await this.redis.hmset(userMetaKey, {
        id: userId,
        name: meta.name || meta.fullName || '',
        photoUrl: meta.photoUrl || meta.avatar || '',
        role: meta.role || '',
        branchId: branchId,
        lastActiveAt: new Date().toISOString()
      });

      // Check if this was first socket for user
      const count = await this.redis.scard(userSocketsKey);
      const firstConnection = count === 1;

      // build members snapshot
      const members = await this.getMembers(branchId);

      // publish
      if (firstConnection) {
        await this._announce(`presence:branch:${branchId}`, 'user-online', { id: userId, ...meta, branchId, connectedAt: new Date().toISOString() });
      }
      await this._announce(`presence:branch:${branchId}`, 'online-members', members);

      // store a mapping of socket->user in redis (for cross-instance removal). Keep as set for socket presence
      await this.redis.set(`presence:socket:${socketId}`, JSON.stringify({ userId, branchId, serverId: this.serverId }));

      return { firstConnection, members };
    }

    // In-memory mode
    if (!this.branches.has(branchId)) this.branches.set(branchId, new Map());
    const usersMap = this.branches.get(branchId);

    let userState = usersMap.get(userId);
    let firstConnection = false;

    if (!userState) {
      userState = { meta: { id: userId, ...meta, branchId }, sockets: new Set(), connectedAt: new Date().toISOString() };
      usersMap.set(userId, userState);
      firstConnection = true;
    }

    userState.sockets.add(socketId);
    this.socketToUser.set(socketId, { userId, branchId });

    const members = await this.getMembers(branchId);

    if (firstConnection) {
      await this._announce(`presence:branch:${branchId}`, 'user-online', { id: userId, ...userState.meta, connectedAt: new Date().toISOString() });
    }

    await this._announce(`presence:branch:${branchId}`, 'online-members', members);

    return { firstConnection, members };
  }

  // Remove a socket, and return whether user went offline
  async removeSocket(socketId) {
    if (!this.initialized) await this.init();

    if (this.useRedis && this.redis) {
      const socketKey = `presence:socket:${socketId}`;
      const val = await this.redis.get(socketKey);
      if (!val) return null;
      const { userId, branchId } = JSON.parse(val);
      const userSocketsKey = `presence:user:${userId}:sockets`;
      const branchKey = `presence:branch:${branchId}:users`;

      // remove socket id
      await this.redis.srem(userSocketsKey, socketId);
      // check remaining sockets
      const remaining = await this.redis.scard(userSocketsKey);
      let wentOffline = false;
      if (remaining === 0) {
        // remove user from branch set and delete meta
        await this.redis.srem(branchKey, userId);
        await this.redis.del(`presence:user:${userId}:meta`);
        wentOffline = true;
      }

      await this.redis.del(socketKey);

      const members = await this.getMembers(branchId);

      if (wentOffline) {
        await this._announce(`presence:branch:${branchId}`, 'user-offline', { id: userId, branchId, wentOfflineAt: new Date().toISOString() });
      }
      await this._announce(`presence:branch:${branchId}`, 'online-members', members);
      return { wentOffline, members };
    }

    // In-memory
    const mapping = this.socketToUser.get(socketId);
    if (!mapping) return null;
    const { userId, branchId } = mapping;
    const usersMap = this.branches.get(branchId);
    if (!usersMap) return null;
    const userState = usersMap.get(userId);
    if (!userState) return null;

    userState.sockets.delete(socketId);
    this.socketToUser.delete(socketId);

    let wentOffline = false;
    if (userState.sockets.size === 0) {
      usersMap.delete(userId);
      wentOffline = true;
    }

    const members = await this.getMembers(branchId);

    if (wentOffline) {
      await this._announce(`presence:branch:${branchId}`, 'user-offline', { id: userId, branchId, wentOfflineAt: new Date().toISOString() });
    }
    await this._announce(`presence:branch:${branchId}`, 'online-members', members);

    return { wentOffline, members };
  }

  // Return members list for branch
  async getMembers(branchId) {
    if (!this.initialized) await this.init();
    branchId = String(branchId);

    if (this.useRedis && this.redis) {
      const branchKey = `presence:branch:${branchId}:users`;
      const memberIds = await this.redis.smembers(branchKey);
      const res = [];
      for (const userId of memberIds) {
        const userMetaKey = `presence:user:${userId}:meta`;
        const meta = await this.redis.hgetall(userMetaKey);
        if (meta && Object.keys(meta).length > 0) {
          res.push({
            id: meta.id || userId,
            name: meta.name || '',
            photoUrl: meta.photoUrl || '',
            role: meta.role || '',
            branchId: meta.branchId || branchId,
            lastActiveAt: meta.lastActiveAt || null
          });
        }
      }
      return res;
    }

    const usersMap = this.branches.get(branchId);
    if (!usersMap) return [];

    const res = [];
    for (const [id, userState] of usersMap.entries()) {
      res.push({
        id,
        name: userState.meta.name || '',
        photoUrl: userState.meta.photoUrl || '',
        role: userState.meta.role || '',
        branchId: userState.meta.branchId || branchId,
        lastActiveAt: userState.connectedAt || null
      });
    }
    return res;
  }

  // Return online user ids across all branches (for debug/admin)
  async getAllOnline() {
    if (!this.initialized) await this.init();
    if (this.useRedis && this.redis) {
      // expensive in redis; not optimized, but for debug only
      const keys = await this.redis.keys('presence:branch:*:users');
      const result = {};
      for (const key of keys) {
        const branchId = key.split(':')[2];
        result[branchId] = await this.getMembers(branchId);
      }
      return result;
    }

    const out = {};
    for (const [branchId, usersMap] of this.branches.entries()) {
      out[branchId] = await this.getMembers(branchId);
    }
    return out;
  }
}

module.exports = new Presence();
