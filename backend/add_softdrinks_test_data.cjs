const { query, getClient } = require('./config/database');

async function addTestData() {
  try {
    console.log('🍹 Adding Soft Drinks Test Data...');
    
    // First, let's check if we have any branches
    const branchesResult = await query('SELECT id, name FROM branches LIMIT 1');
    if (branchesResult.rows.length === 0) {
      console.log('❌ No branches found. Please create a branch first.');
      return;
    }
    
    const branchId = branchesResult.rows[0].id;
    console.log(`📍 Using branch: ${branchesResult.rows[0].name} (${branchId})`);
    
    // Add soft drink items
    const softDrinkItems = [
      { name: 'Coca Cola 330ml', threshold_level: 50 },
      { name: 'Pepsi 330ml', threshold_level: 40 },
      { name: 'Sprite 330ml', threshold_level: 30 },
      { name: 'Fanta Orange 330ml', threshold_level: 25 },
      { name: 'Mountain Dew 330ml', threshold_level: 20 },
      { name: 'Red Bull 250ml', threshold_level: 15 },
      { name: 'Monster Energy 500ml', threshold_level: 10 },
      { name: 'Gatorade Lemon 500ml', threshold_level: 20 }
    ];
    
    console.log('📦 Adding soft drink items...');
    const itemIds = [];
    
    for (const item of softDrinkItems) {
      const result = await query(
        'INSERT INTO items (name, category, threshold_level, branch_id) VALUES ($1, $2, $3, $4) RETURNING id',
        [item.name, 'softdrinks', item.threshold_level, branchId]
      );
      itemIds.push(result.rows[0].id);
      console.log(`✅ Added: ${item.name}`);
    }
    
    // Get a user for creating movements
    const userResult = await query('SELECT id FROM users WHERE is_active = true LIMIT 1');
    if (userResult.rows.length === 0) {
      console.log('❌ No active users found. Please create a user first.');
      return;
    }
    const userId = userResult.rows[0].id;
    
    // Add stock movements for different scenarios
    console.log('📊 Adding stock movements for different scenarios...');
    
    // Scenario 1: Coca Cola - Positive trend (more stock in than out)
    await addMovements(itemIds[0], userId, [
      { type: 'in', quantity: 100, days_ago: 7, reason: 'Weekly delivery' },
      { type: 'out', quantity: 80, days_ago: 6, reason: 'Customer sales' },
      { type: 'out', quantity: 60, days_ago: 5, reason: 'Customer sales' },
      { type: 'in', quantity: 120, days_ago: 3, reason: 'Restock order' },
      { type: 'out', quantity: 70, days_ago: 2, reason: 'Customer sales' },
      { type: 'out', quantity: 50, days_ago: 1, reason: 'Customer sales' }
    ]);
    
    // Scenario 2: Pepsi - Negative trend (more stock out than in)
    await addMovements(itemIds[1], userId, [
      { type: 'in', quantity: 60, days_ago: 7, reason: 'Weekly delivery' },
      { type: 'out', quantity: 80, days_ago: 6, reason: 'Customer sales' },
      { type: 'out', quantity: 70, days_ago: 5, reason: 'Customer sales' },
      { type: 'in', quantity: 50, days_ago: 3, reason: 'Emergency restock' },
      { type: 'out', quantity: 90, days_ago: 2, reason: 'Customer sales' },
      { type: 'out', quantity: 60, days_ago: 1, reason: 'Customer sales' }
    ]);
    
    // Scenario 3: Sprite - Stable trend (balanced in/out)
    await addMovements(itemIds[2], userId, [
      { type: 'in', quantity: 50, days_ago: 7, reason: 'Weekly delivery' },
      { type: 'out', quantity: 45, days_ago: 6, reason: 'Customer sales' },
      { type: 'out', quantity: 40, days_ago: 5, reason: 'Customer sales' },
      { type: 'in', quantity: 50, days_ago: 3, reason: 'Regular restock' },
      { type: 'out', quantity: 35, days_ago: 2, reason: 'Customer sales' },
      { type: 'out', quantity: 30, days_ago: 1, reason: 'Customer sales' }
    ]);
    
    // Scenario 4: Fanta - High consumption (critical trend)
    await addMovements(itemIds[3], userId, [
      { type: 'in', quantity: 30, days_ago: 7, reason: 'Weekly delivery' },
      { type: 'out', quantity: 50, days_ago: 6, reason: 'Customer sales' },
      { type: 'out', quantity: 45, days_ago: 5, reason: 'Customer sales' },
      { type: 'in', quantity: 20, days_ago: 3, reason: 'Small restock' },
      { type: 'out', quantity: 40, days_ago: 2, reason: 'Customer sales' },
      { type: 'out', quantity: 35, days_ago: 1, reason: 'Customer sales' }
    ]);
    
    // Scenario 5: Mountain Dew - Growing trend
    await addMovements(itemIds[4], userId, [
      { type: 'in', quantity: 40, days_ago: 7, reason: 'Weekly delivery' },
      { type: 'out', quantity: 25, days_ago: 6, reason: 'Customer sales' },
      { type: 'out', quantity: 20, days_ago: 5, reason: 'Customer sales' },
      { type: 'in', quantity: 60, days_ago: 3, reason: 'Bulk order' },
      { type: 'out', quantity: 30, days_ago: 2, reason: 'Customer sales' },
      { type: 'out', quantity: 25, days_ago: 1, reason: 'Customer sales' }
    ]);
    
    // Scenario 6: Red Bull - Erratic pattern
    await addMovements(itemIds[5], userId, [
      { type: 'in', quantity: 20, days_ago: 7, reason: 'Weekly delivery' },
      { type: 'out', quantity: 15, days_ago: 6, reason: 'Customer sales' },
      { type: 'in', quantity: 30, days_ago: 5, reason: 'Special order' },
      { type: 'out', quantity: 25, days_ago: 4, reason: 'Customer sales' },
      { type: 'out', quantity: 20, days_ago: 3, reason: 'Customer sales' },
      { type: 'in', quantity: 10, days_ago: 2, reason: 'Emergency restock' },
      { type: 'out', quantity: 15, days_ago: 1, reason: 'Customer sales' }
    ]);
    
    // Scenario 7: Monster Energy - Seasonal spike
    await addMovements(itemIds[6], userId, [
      { type: 'in', quantity: 15, days_ago: 7, reason: 'Weekly delivery' },
      { type: 'out', quantity: 12, days_ago: 6, reason: 'Customer sales' },
      { type: 'out', quantity: 10, days_ago: 5, reason: 'Customer sales' },
      { type: 'in', quantity: 25, days_ago: 3, reason: 'Weekend preparation' },
      { type: 'out', quantity: 20, days_ago: 2, reason: 'Weekend sales' },
      { type: 'out', quantity: 18, days_ago: 1, reason: 'Weekend sales' }
    ]);
    
    // Scenario 8: Gatorade - Sports season pattern
    await addMovements(itemIds[7], userId, [
      { type: 'in', quantity: 30, days_ago: 7, reason: 'Weekly delivery' },
      { type: 'out', quantity: 25, days_ago: 6, reason: 'Customer sales' },
      { type: 'out', quantity: 20, days_ago: 5, reason: 'Customer sales' },
      { type: 'in', quantity: 40, days_ago: 3, reason: 'Sports season prep' },
      { type: 'out', quantity: 35, days_ago: 2, reason: 'Sports event sales' },
      { type: 'out', quantity: 30, days_ago: 1, reason: 'Sports event sales' }
    ]);
    
    // Add some historical data (2-3 weeks ago) for better trend analysis
    console.log('📅 Adding historical data (2-3 weeks ago)...');
    
    // Historical Coca Cola data
    await addMovements(itemIds[0], userId, [
      { type: 'in', quantity: 80, days_ago: 14, reason: 'Historical delivery' },
      { type: 'out', quantity: 70, days_ago: 13, reason: 'Historical sales' },
      { type: 'out', quantity: 60, days_ago: 12, reason: 'Historical sales' },
      { type: 'in', quantity: 90, days_ago: 10, reason: 'Historical restock' },
      { type: 'out', quantity: 65, days_ago: 9, reason: 'Historical sales' },
      { type: 'out', quantity: 55, days_ago: 8, reason: 'Historical sales' }
    ]);
    
    // Historical Pepsi data
    await addMovements(itemIds[1], userId, [
      { type: 'in', quantity: 50, days_ago: 14, reason: 'Historical delivery' },
      { type: 'out', quantity: 70, days_ago: 13, reason: 'Historical sales' },
      { type: 'out', quantity: 60, days_ago: 12, reason: 'Historical sales' },
      { type: 'in', quantity: 40, days_ago: 10, reason: 'Historical restock' },
      { type: 'out', quantity: 80, days_ago: 9, reason: 'Historical sales' },
      { type: 'out', quantity: 50, days_ago: 8, reason: 'Historical sales' }
    ]);
    
    console.log('✅ Soft drinks test data added successfully!');
    console.log('\n📊 Test Scenarios Created:');
    console.log('1. Coca Cola - Positive trend (gaining inventory)');
    console.log('2. Pepsi - Negative trend (losing inventory)');
    console.log('3. Sprite - Stable trend (balanced)');
    console.log('4. Fanta - Critical trend (high consumption)');
    console.log('5. Mountain Dew - Growing trend (bulk orders)');
    console.log('6. Red Bull - Erratic pattern (irregular)');
    console.log('7. Monster Energy - Seasonal spike (weekend pattern)');
    console.log('8. Gatorade - Sports season pattern');
    console.log('\n🎯 Now you can test the Soft Drinks Weekly Comparison Report!');
    
  } catch (error) {
    console.error('❌ Error adding test data:', error);
  }
}

async function addMovements(itemId, userId, movements) {
  for (const movement of movements) {
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - movement.days_ago);
    
    await query(
      'INSERT INTO stock_movements (item_id, movement_type, quantity, reason, created_by, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [itemId, movement.type, movement.quantity, movement.reason, userId, createdAt]
    );
  }
}

// Run the script
addTestData().catch(console.error);
