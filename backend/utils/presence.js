const EventEmitter = require('events');
const db = require('./../config/database');

class Presence extends EventEmitter {
  constructor() {
    super();
    this.useRedis = !!process.env.REDIS_URL;
    this.initialized = false;
    this.serverId = process.env.INSTANCE_ID || (Math.random() + '').slice(2, 10);

    // In-memory fallback structures
    this.branches = new Map(); // branchId -> Map(userId -> {meta, sockets:Set, connectedAt, isAway})
    this.socketToUser = new Map(); // socketId -> { userId, branchId }
    this.awayUsers = new Set(); // Set of userIds who are away (app minimized / tab unfocused)

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
  // Note: We only publish to Redis for cross-instance sync
  // Local socket.io events are handled directly in server.js to properly use socket.to()
  async _publish(channel, event, data) {
    try {
      if (this.useRedis && this.redis) {
        const payload = { event, data };
        await this.redis.publish(channel, JSON.stringify(payload));
      }
    } catch (e) {
      console.error('Presence publish failed', e?.message || e);
    }
  }

  // Add a socket under user->branch
  async addSocket({ branchId, userId, socketId, meta = {} }) {
    if (!this.initialized) await this.init();

    branchId = String(branchId);
    
    console.log(`\n🔷 [PRESENCE] addSocket called:`);
    console.log(`   branchId: ${branchId}`);
    console.log(`   userId: ${userId}`);
    console.log(`   socketId: ${socketId}`);
    console.log(`   meta:`, meta);
    console.log(`   useRedis: ${this.useRedis}`);

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
        await this._publish(`presence:branch:${branchId}`, 'user-online', { id: userId, ...meta, branchId, connectedAt: new Date().toISOString() });
      }
      await this._publish(`presence:branch:${branchId}`, 'online-members', members);

      // store a mapping of socket->user in redis (for cross-instance removal). Keep as set for socket presence
      await this.redis.set(`presence:socket:${socketId}`, JSON.stringify({ userId, branchId, serverId: this.serverId }));

      return { firstConnection, members };
    }

    // In-memory mode
    console.log(`   📝 Using IN-MEMORY mode`);
    if (!this.branches.has(branchId)) this.branches.set(branchId, new Map());
    const usersMap = this.branches.get(branchId);
    console.log(`   📊 Current users in branch ${branchId}:`, usersMap.size);

    let userState = usersMap.get(userId);
    let firstConnection = false;

    if (!userState) {
      console.log(`   ✨ NEW user - creating userState`);
      userState = { meta: { id: userId, ...meta, branchId }, sockets: new Set(), connectedAt: new Date().toISOString(), isAway: false };
      usersMap.set(userId, userState);
      firstConnection = true;
      // Remove from away set when newly connected
      this.awayUsers.delete(userId);
    } else {
      console.log(`   ♻️ EXISTING user - adding socket to existing userState`);
      // CRITICAL FIX: Clear away status when user reconnects!
      if (userState.isAway) {
        console.log(`   🔄 User was away - marking as BACK now`);
        userState.isAway = false;
        this.awayUsers.delete(userId);
      }
    }

    userState.sockets.add(socketId);
    this.socketToUser.set(socketId, { userId, branchId });
    console.log(`   🔌 User now has ${userState.sockets.size} socket(s)`);

    const members = await this.getMembers(branchId);
    console.log(`   👥 getMembers returned ${members.length} members:`, members.map(m => ({ id: m.id, name: m.name })));

    if (firstConnection) {
      await this._publish(`presence:branch:${branchId}`, 'user-online', { id: userId, ...userState.meta, connectedAt: new Date().toISOString() });
    }

    await this._publish(`presence:branch:${branchId}`, 'online-members', members);
    
    console.log(`   ✅ addSocket complete - returning { firstConnection: ${firstConnection}, members: ${members.length} }\n`);

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
        await this._publish(`presence:branch:${branchId}`, 'user-offline', { id: userId, branchId, wentOfflineAt: new Date().toISOString() });
      }
      await this._publish(`presence:branch:${branchId}`, 'online-members', members);
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
      await this._publish(`presence:branch:${branchId}`, 'user-offline', { id: userId, branchId, wentOfflineAt: new Date().toISOString() });
    }
    await this._publish(`presence:branch:${branchId}`, 'online-members', members);

    return { wentOffline, members };
  }

  // Return members list for branch (optionally excluding away users)
  async getMembers(branchId, excludeAway = true) {
    if (!this.initialized) await this.init();
    branchId = String(branchId);
    
    console.log(`\n🔍 [PRESENCE] getMembers called for branch: ${branchId}, excludeAway: ${excludeAway}`);

    if (this.useRedis && this.redis) {
      const branchKey = `presence:branch:${branchId}:users`;
      const memberIds = await this.redis.smembers(branchKey);
      const res = [];
      for (const userId of memberIds) {
        // Skip away users if excludeAway is true
        if (excludeAway) {
          const isAway = await this.redis.get(`presence:user:${userId}:away`);
          if (isAway === 'true') continue;
        }
        
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
    console.log(`   📊 branches.has(${branchId}): ${this.branches.has(branchId)}`);
    console.log(`   📊 usersMap size: ${usersMap ? usersMap.size : 0}`);
    
    if (!usersMap) {
      console.log(`   ⚠️ No usersMap for branch ${branchId} - returning empty array\n`);
      return [];
    }

    const res = [];
    for (const [id, userState] of usersMap.entries()) {
      console.log(`   👤 Checking user ${id}: isAway=${userState.isAway}, in awayUsers=${this.awayUsers.has(id)}`);
      
      // Skip away users if excludeAway is true
      if (excludeAway && (userState.isAway || this.awayUsers.has(id))) {
        console.log(`   ⏭️ Skipping away user ${id}`);
        continue;
      }
      
      res.push({
        id,
        name: userState.meta.name || '',
        photoUrl: userState.meta.photoUrl || '',
        role: userState.meta.role || '',
        branchId: userState.meta.branchId || branchId,
        lastActiveAt: userState.connectedAt || null
      });
    }
    console.log(`   ✅ getMembers returning ${res.length} members\n`);
    return res;
  }

  // Mark user as away (app minimized / tab unfocused)
  async setUserAway(userId, branchId, isAway = true) {
    if (!this.initialized) await this.init();
    branchId = String(branchId);

    if (this.useRedis && this.redis) {
      // Store away status in Redis
      if (isAway) {
        await this.redis.set(`presence:user:${userId}:away`, 'true');
      } else {
        await this.redis.del(`presence:user:${userId}:away`);
      }
      
      const members = await this.getMembers(branchId);
      await this._publish(`presence:branch:${branchId}`, 'online-members', members);
      return { members };
    }

    // In-memory mode
    if (isAway) {
      this.awayUsers.add(userId);
    } else {
      this.awayUsers.delete(userId);
    }

    // Also update user state if exists
    const usersMap = this.branches.get(branchId);
    if (usersMap) {
      const userState = usersMap.get(userId);
      if (userState) {
        userState.isAway = isAway;
      }
    }

    const members = await this.getMembers(branchId);
    await this._publish(`presence:branch:${branchId}`, 'online-members', members);
    
    return { members };
  }

  // Check if user is away
  async isUserAway(userId) {
    if (!this.initialized) await this.init();

    if (this.useRedis && this.redis) {
      const isAway = await this.redis.get(`presence:user:${userId}:away`);
      return isAway === 'true';
    }

    return this.awayUsers.has(userId);
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
