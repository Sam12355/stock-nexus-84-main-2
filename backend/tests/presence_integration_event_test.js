const presence = require('../utils/presence');

(async () => {
  console.log('Running presence integration event tests');
  await presence.init();

  let onlineCount = 0;
  let offlineCount = 0;
  let membersUpdates = 0;

  presence.on('user-online', () => { onlineCount++; });
  presence.on('user-offline', () => { offlineCount++; });
  presence.on('online-members', () => { membersUpdates++; });

  const branch = 'branch-777';
  const userA = 'uA';
  const sA1 = 'sA1';
  const sA2 = 'sA2';

  // Add first socket -> should trigger user-online once and online-members
  await presence.addSocket({ branchId: branch, userId: userA, socketId: sA1, meta: { name: 'A' } });
  await new Promise(r => setTimeout(r, 50));

  // Add second socket for same user -> no additional user-online, but online-members might be emitted
  await presence.addSocket({ branchId: branch, userId: userA, socketId: sA2, meta: { name: 'A' } });
  await new Promise(r => setTimeout(r, 50));

  // Remove first socket -> still online
  await presence.removeSocket(sA1);
  await new Promise(r => setTimeout(r, 50));

  // Remove second socket -> user-offline should be triggered
  await presence.removeSocket(sA2);
  await new Promise(r => setTimeout(r, 50));

  console.assert(onlineCount === 1, `Expected onlineCount 1, got ${onlineCount}`);
  console.assert(offlineCount === 1, `Expected offlineCount 1, got ${offlineCount}`);
  console.assert(membersUpdates >= 3, `Expected at least 3 members updates, got ${membersUpdates}`);

  console.log('Presence integration events test passed ✅');
  process.exit(0);
})();
