-- =====================================================
-- Unit of Measurement (UoM) System Migration for Supabase
-- =====================================================
-- Run this SQL in your Supabase SQL Editor
-- This adds package tracking capabilities to the items table
-- =====================================================

-- Step 1: Add new columns to items table
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS base_unit VARCHAR(50) DEFAULT 'piece',
ADD COLUMN IF NOT EXISTS packaging_unit VARCHAR(50),
ADD COLUMN IF NOT EXISTS units_per_package INTEGER,
ADD COLUMN IF NOT EXISTS enable_packaging BOOLEAN DEFAULT false;

-- Step 2: Add comments for documentation
COMMENT ON COLUMN items.base_unit IS 'The base unit for inventory tracking (piece, kg, gram, liter, ml)';
COMMENT ON COLUMN items.packaging_unit IS 'The packaging unit (box, carton, case, packet, bag, crate)';
COMMENT ON COLUMN items.units_per_package IS 'Number of base units per package (e.g., 20 pieces per box)';
COMMENT ON COLUMN items.enable_packaging IS 'Whether this item supports package-based tracking';

-- Step 3: Set default base_unit for existing items
UPDATE items 
SET base_unit = 'piece' 
WHERE base_unit IS NULL;

-- Step 4: Add check constraint to ensure units_per_package is positive when set
ALTER TABLE items 
ADD CONSTRAINT items_units_per_package_check 
CHECK (units_per_package IS NULL OR units_per_package > 0);

-- Step 5: Add check constraint for valid base units
ALTER TABLE items
ADD CONSTRAINT items_base_unit_check
CHECK (base_unit IN ('piece', 'kg', 'gram', 'liter', 'ml'));

-- Step 6: Add check constraint for valid packaging units
ALTER TABLE items
ADD CONSTRAINT items_packaging_unit_check
CHECK (packaging_unit IS NULL OR packaging_unit IN ('box', 'carton', 'case', 'packet', 'bag', 'crate'));

-- =====================================================
-- Verification Queries (run these to verify migration)
-- =====================================================

-- Check that columns were added
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'items' 
AND column_name IN ('base_unit', 'packaging_unit', 'units_per_package', 'enable_packaging')
ORDER BY ordinal_position;

-- Check that all existing items have base_unit set
SELECT COUNT(*) as total_items, 
       COUNT(base_unit) as items_with_base_unit,
       COUNT(CASE WHEN base_unit = 'piece' THEN 1 END) as items_with_piece_unit
FROM items;

-- View all constraints on items table
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'items'
ORDER BY constraint_name;

-- =====================================================
-- Example: Creating an item with packaging
-- =====================================================

-- Example 1: Avocado sold in boxes of 20 pieces
/*
INSERT INTO items (
    name, 
    category, 
    base_unit, 
    enable_packaging, 
    packaging_unit, 
    units_per_package,
    threshold_level,
    branch_id,
    created_by
) VALUES (
    'Avocado',
    'Gronsakshuset',
    'piece',
    true,
    'box',
    20,
    50,
    'your-branch-id-here',
    'your-user-id-here'
);
*/

-- Example 2: Olive Oil sold by liter in bottles
/*
INSERT INTO items (
    name,
    category,
    base_unit,
    enable_packaging,
    packaging_unit,
    units_per_package,
    threshold_level,
    branch_id,
    created_by
) VALUES (
    'Olive Oil',
    'Tingstad',
    'liter',
    true,
    'bottle',
    1,
    10,
    'your-branch-id-here',
    'your-user-id-here'
);
*/

-- =====================================================
-- Rollback (if needed - USE WITH CAUTION)
-- =====================================================
/*
-- Remove constraints
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_base_unit_check;
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_packaging_unit_check;
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_units_per_package_check;

-- Remove columns
ALTER TABLE items DROP COLUMN IF EXISTS enable_packaging;
ALTER TABLE items DROP COLUMN IF EXISTS units_per_package;
ALTER TABLE items DROP COLUMN IF EXISTS packaging_unit;
ALTER TABLE items DROP COLUMN IF EXISTS base_unit;
*/
