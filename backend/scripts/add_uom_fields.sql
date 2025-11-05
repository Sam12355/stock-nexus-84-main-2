-- Add Unit of Measurement fields to items table
-- This allows tracking items in different units (pieces, kg, liters) 
-- and packaging (boxes, cartons, cases)

-- Add new columns
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS base_unit VARCHAR(50) DEFAULT 'piece',
ADD COLUMN IF NOT EXISTS packaging_unit VARCHAR(50),
ADD COLUMN IF NOT EXISTS units_per_package INTEGER,
ADD COLUMN IF NOT EXISTS enable_packaging BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN items.base_unit IS 'Base unit for counting items (piece, kg, liter, etc.)';
COMMENT ON COLUMN items.packaging_unit IS 'How items are packaged (box, carton, case, etc.)';
COMMENT ON COLUMN items.units_per_package IS 'Number of base units in one package';
COMMENT ON COLUMN items.enable_packaging IS 'Whether to track this item by packages';

-- Update existing items to have default values
UPDATE items 
SET base_unit = 'piece', 
    enable_packaging = false 
WHERE base_unit IS NULL;

-- Add check constraint for units_per_package
ALTER TABLE items 
ADD CONSTRAINT items_units_per_package_check 
CHECK (units_per_package IS NULL OR units_per_package > 0);

-- Print success message
SELECT 'Unit of Measurement fields added successfully!' as status;
