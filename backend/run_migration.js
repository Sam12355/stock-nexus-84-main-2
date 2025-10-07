const { query } = require('./config/database');

async function runMigration() {
  try {
    console.log('🔄 Starting category migration...');
    
    // Drop the existing constraint
    console.log('📝 Dropping existing category constraint...');
    await query(`
      ALTER TABLE items DROP CONSTRAINT IF EXISTS items_category_check
    `);

    // Add the new constraint with updated categories
    console.log('📝 Adding new category constraint...');
    await query(`
      ALTER TABLE items ADD CONSTRAINT items_category_check 
      CHECK (category IN (
        'fish_frozen',
        'vegetables', 
        'other_frozen_food',
        'meat_frozen',
        'kitchen_supplies',
        'grains',
        'fruits',
        'flour',
        'cleaning_supplies',
        'canned_prepared_food',
        'beer_non_alc',
        'sy_product_recipes',
        'packaging',
        'sauce',
        'softdrinks',
        'spices',
        'other'
      ))
    `);

    // Update existing items to use new categories
    console.log('📝 Updating existing items...');
    await query(`
      UPDATE items SET category = 'other_frozen_food' WHERE category = 'frozen_items'
    `);

    await query(`
      UPDATE items SET category = 'grains' WHERE category = 'dry_goods'
    `);

    await query(`
      UPDATE items SET category = 'other' WHERE category = 'misc'
    `);

    console.log('✅ Category migration completed successfully!');
    console.log('🎉 You can now create items with the new categories!');

  } catch (error) {
    console.error('❌ Error during category migration:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();




