-- Update item categories to new list
-- This script updates the category constraint in the items table

-- First, drop the existing constraint
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_category_check;

-- Add the new constraint with the updated categories
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
));

-- Update existing items to use new categories
-- Map old categories to new ones
UPDATE items SET category = 'other_frozen_food' WHERE category = 'frozen_items';
UPDATE items SET category = 'grains' WHERE category = 'dry_goods';
UPDATE items SET category = 'other' WHERE category = 'misc';

-- Note: 'packaging' and 'cleaning_supplies' remain the same




