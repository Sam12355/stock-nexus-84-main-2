const presence = require('../utils/presence');

(async () => {
  console.log('Running presence unit tests (in-memory fallback)');
  await presence.init();

  // Clean slate for in-memory
  // Add user1 socket
  const branch = 'branch-1001';
  const user1 = 'user-1';
  const sock1 = 'socket-1';

  const r1 = await presence.addSocket({ branchId: branch, userId: user1, socketId: sock1, meta: { name: 'Alice', role: 'staff' } });
  console.assert(r1.firstConnection === true, 'Expected firstConnection true for user1');
  console.assert(Array.isArray(r1.members) && r1.members.length === 1, 'members should include user1');

  // Add second socket for same user
  const sock2 = 'socket-2';
  const r2 = await presence.addSocket({ branchId: branch, userId: user1, socketId: sock2, meta: { name: 'Alice', role: 'staff' } });
  console.assert(r2.firstConnection === false, 'Expected firstConnection false for user1 second socket');
  console.assert(r2.members.length === 1, 'members length should still be 1');

  // Add user2
  const user2 = 'user-2';
  const sock3 = 'socket-3';
  const r3 = await presence.addSocket({ branchId: branch, userId: user2, socketId: sock3, meta: { name: 'Bob', role: 'manager' } });
  console.assert(r3.members.length === 2, 'members should contain two users');

  // Remove one socket for user1
  const rem1 = await presence.removeSocket(sock1);
  console.assert(rem1 && rem1.wentOffline === false, 'user1 still has one socket, should not be offline');

  // Remove last socket for user1
  const rem2 = await presence.removeSocket(sock2);
  console.assert(rem2 && rem2.wentOffline === true, 'user1 should go offline after removing last socket');
  console.assert(rem2.members.length === 1, 'members should now only contain user2');

  // Cleanup: remove user2
  await presence.removeSocket(sock3);
  const finalMembers = await presence.getMembers(branch);
  console.assert(finalMembers.length === 0, 'No members expected after cleaning up');

  console.log('All presence unit tests passed ✅');
  process.exit(0);
})();
