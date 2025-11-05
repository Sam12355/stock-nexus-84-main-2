-- Add UoM fields to stock_movements table to track original unit and quantity

ALTER TABLE stock_movements
ADD COLUMN IF NOT EXISTS unit_type VARCHAR(20) DEFAULT 'base',
ADD COLUMN IF NOT EXISTS original_quantity INTEGER,
ADD COLUMN IF NOT EXISTS unit_label VARCHAR(50);

-- Add comments
COMMENT ON COLUMN stock_movements.unit_type IS 'Type of unit used for the movement: base or packaging';
COMMENT ON COLUMN stock_movements.original_quantity IS 'The original quantity entered by user (e.g., 2 cartons)';
COMMENT ON COLUMN stock_movements.unit_label IS 'The unit label used (e.g., piece, carton, box)';

-- Update existing records to have default values
UPDATE stock_movements 
SET unit_type = 'base',
    original_quantity = quantity,
    unit_label = 'piece'
WHERE unit_type IS NULL;
