-- Soft Drinks Test Data for Stock Nexus
-- This file contains test data for the Soft Drinks Weekly Comparison Report
-- Import this into your Render PostgreSQL database

-- First, let's get the branch ID (assuming Main Branch exists)
-- You may need to adjust the branch_id based on your actual branch
-- Replace 'YOUR_BRANCH_ID_HERE' with your actual branch ID from the branches table

-- Get branch ID (run this query first to get your branch ID)
-- SELECT id, name FROM branches LIMIT 1;

-- Replace this UUID with your actual branch ID
-- For now, using a placeholder - you'll need to update this
SET @branch_id = 'YOUR_BRANCH_ID_HERE';

-- Get user ID (run this query first to get your user ID)
-- SELECT id FROM users WHERE is_active = true LIMIT 1;

-- Replace this UUID with your actual user ID
-- For now, using a placeholder - you'll need to update this
SET @user_id = 'YOUR_USER_ID_HERE';

-- Insert soft drink items
INSERT INTO items (id, name, category, threshold_level, branch_id, created_at, updated_at) VALUES
('6a7a2b07-d495-4249-b6ff-0008f9024793', 'Coca Cola 330ml', 'softdrinks', 50, @branch_id, NOW(), NOW()),
('cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'Pepsi 330ml', 'softdrinks', 40, @branch_id, NOW(), NOW()),
('1a81e832-8980-4742-b308-c83bca50478a', 'Sprite 330ml', 'softdrinks', 30, @branch_id, NOW(), NOW()),
('fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'Fanta Orange 330ml', 'softdrinks', 25, @branch_id, NOW(), NOW()),
('aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'Mountain Dew 330ml', 'softdrinks', 20, @branch_id, NOW(), NOW()),
('fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'Red Bull 250ml', 'softdrinks', 15, @branch_id, NOW(), NOW()),
('f9a657df-709e-46c8-b47f-1ed12e904fbd', 'Monster Energy 500ml', 'softdrinks', 10, @branch_id, NOW(), NOW()),
('6862eaf1-f8a5-4c74-a952-b09597362817', 'Gatorade Lemon 500ml', 'softdrinks', 20, @branch_id, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert stock movements for Coca Cola (Positive trend - gaining inventory)
INSERT INTO stock_movements (id, item_id, movement_type, quantity, reason, created_by, created_at) VALUES
('movement-coca-1', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 100, 'Weekly delivery', @user_id, NOW() - INTERVAL '7 days'),
('movement-coca-2', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 80, 'Customer sales', @user_id, NOW() - INTERVAL '6 days'),
('movement-coca-3', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 60, 'Customer sales', @user_id, NOW() - INTERVAL '5 days'),
('movement-coca-4', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 120, 'Restock order', @user_id, NOW() - INTERVAL '3 days'),
('movement-coca-5', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 70, 'Customer sales', @user_id, NOW() - INTERVAL '2 days'),
('movement-coca-6', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 50, 'Customer sales', @user_id, NOW() - INTERVAL '1 day'),
-- Historical data
('movement-coca-hist-1', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 80, 'Historical delivery', @user_id, NOW() - INTERVAL '14 days'),
('movement-coca-hist-2', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 70, 'Historical sales', @user_id, NOW() - INTERVAL '13 days'),
('movement-coca-hist-3', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 60, 'Historical sales', @user_id, NOW() - INTERVAL '12 days'),
('movement-coca-hist-4', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 90, 'Historical restock', @user_id, NOW() - INTERVAL '10 days'),
('movement-coca-hist-5', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 65, 'Historical sales', @user_id, NOW() - INTERVAL '9 days'),
('movement-coca-hist-6', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 55, 'Historical sales', @user_id, NOW() - INTERVAL '8 days')
ON CONFLICT (id) DO NOTHING;

-- Insert stock movements for Pepsi (Negative trend - losing inventory)
INSERT INTO stock_movements (id, item_id, movement_type, quantity, reason, created_by, created_at) VALUES
('movement-pepsi-1', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'in', 60, 'Weekly delivery', @user_id, NOW() - INTERVAL '7 days'),
('movement-pepsi-2', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'out', 80, 'Customer sales', @user_id, NOW() - INTERVAL '6 days'),
('movement-pepsi-3', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'out', 70, 'Customer sales', @user_id, NOW() - INTERVAL '5 days'),
('movement-pepsi-4', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'in', 50, 'Emergency restock', @user_id, NOW() - INTERVAL '3 days'),
('movement-pepsi-5', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'out', 90, 'Customer sales', @user_id, NOW() - INTERVAL '2 days'),
('movement-pepsi-6', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'out', 60, 'Customer sales', @user_id, NOW() - INTERVAL '1 day'),
-- Historical data
('movement-pepsi-hist-1', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'in', 50, 'Historical delivery', @user_id, NOW() - INTERVAL '14 days'),
('movement-pepsi-hist-2', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'out', 70, 'Historical sales', @user_id, NOW() - INTERVAL '13 days'),
('movement-pepsi-hist-3', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'out', 60, 'Historical sales', @user_id, NOW() - INTERVAL '12 days'),
('movement-pepsi-hist-4', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'in', 40, 'Historical restock', @user_id, NOW() - INTERVAL '10 days'),
('movement-pepsi-hist-5', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'out', 80, 'Historical sales', @user_id, NOW() - INTERVAL '9 days'),
('movement-pepsi-hist-6', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'out', 50, 'Historical sales', @user_id, NOW() - INTERVAL '8 days')
ON CONFLICT (id) DO NOTHING;

-- Insert stock movements for Sprite (Stable trend - balanced)
INSERT INTO stock_movements (id, item_id, movement_type, quantity, reason, created_by, created_at) VALUES
('movement-sprite-1', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 50, 'Weekly delivery', @user_id, NOW() - INTERVAL '7 days'),
('movement-sprite-2', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 45, 'Customer sales', @user_id, NOW() - INTERVAL '6 days'),
('movement-sprite-3', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 40, 'Customer sales', @user_id, NOW() - INTERVAL '5 days'),
('movement-sprite-4', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 50, 'Regular restock', @user_id, NOW() - INTERVAL '3 days'),
('movement-sprite-5', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 35, 'Customer sales', @user_id, NOW() - INTERVAL '2 days'),
('movement-sprite-6', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 30, 'Customer sales', @user_id, NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Insert stock movements for Fanta (Critical trend - high consumption)
INSERT INTO stock_movements (id, item_id, movement_type, quantity, reason, created_by, created_at) VALUES
('movement-fanta-1', 'fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'in', 30, 'Weekly delivery', @user_id, NOW() - INTERVAL '7 days'),
('movement-fanta-2', 'fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'out', 50, 'Customer sales', @user_id, NOW() - INTERVAL '6 days'),
('movement-fanta-3', 'fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'out', 45, 'Customer sales', @user_id, NOW() - INTERVAL '5 days'),
('movement-fanta-4', 'fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'in', 20, 'Small restock', @user_id, NOW() - INTERVAL '3 days'),
('movement-fanta-5', 'fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'out', 40, 'Customer sales', @user_id, NOW() - INTERVAL '2 days'),
('movement-fanta-6', 'fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'out', 35, 'Customer sales', @user_id, NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Insert stock movements for Mountain Dew (Growing trend)
INSERT INTO stock_movements (id, item_id, movement_type, quantity, reason, created_by, created_at) VALUES
('movement-mountaindew-1', 'aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'in', 40, 'Weekly delivery', @user_id, NOW() - INTERVAL '7 days'),
('movement-mountaindew-2', 'aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'out', 25, 'Customer sales', @user_id, NOW() - INTERVAL '6 days'),
('movement-mountaindew-3', 'aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'out', 20, 'Customer sales', @user_id, NOW() - INTERVAL '5 days'),
('movement-mountaindew-4', 'aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'in', 60, 'Bulk order', @user_id, NOW() - INTERVAL '3 days'),
('movement-mountaindew-5', 'aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'out', 30, 'Customer sales', @user_id, NOW() - INTERVAL '2 days'),
('movement-mountaindew-6', 'aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'out', 25, 'Customer sales', @user_id, NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Insert stock movements for Red Bull (Erratic pattern)
INSERT INTO stock_movements (id, item_id, movement_type, quantity, reason, created_by, created_at) VALUES
('movement-redbull-1', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'in', 20, 'Weekly delivery', @user_id, NOW() - INTERVAL '7 days'),
('movement-redbull-2', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'out', 15, 'Customer sales', @user_id, NOW() - INTERVAL '6 days'),
('movement-redbull-3', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'in', 30, 'Special order', @user_id, NOW() - INTERVAL '5 days'),
('movement-redbull-4', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'out', 25, 'Customer sales', @user_id, NOW() - INTERVAL '4 days'),
('movement-redbull-5', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'out', 20, 'Customer sales', @user_id, NOW() - INTERVAL '3 days'),
('movement-redbull-6', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'in', 10, 'Emergency restock', @user_id, NOW() - INTERVAL '2 days'),
('movement-redbull-7', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'out', 15, 'Customer sales', @user_id, NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Insert stock movements for Monster Energy (Seasonal spike)
INSERT INTO stock_movements (id, item_id, movement_type, quantity, reason, created_by, created_at) VALUES
('movement-monster-1', 'f9a657df-709e-46c8-b47f-1ed12e904fbd', 'in', 15, 'Weekly delivery', @user_id, NOW() - INTERVAL '7 days'),
('movement-monster-2', 'f9a657df-709e-46c8-b47f-1ed12e904fbd', 'out', 12, 'Customer sales', @user_id, NOW() - INTERVAL '6 days'),
('movement-monster-3', 'f9a657df-709e-46c8-b47f-1ed12e904fbd', 'out', 10, 'Customer sales', @user_id, NOW() - INTERVAL '5 days'),
('movement-monster-4', 'f9a657df-709e-46c8-b47f-1ed12e904fbd', 'in', 25, 'Weekend preparation', @user_id, NOW() - INTERVAL '3 days'),
('movement-monster-5', 'f9a657df-709e-46c8-b47f-1ed12e904fbd', 'out', 20, 'Weekend sales', @user_id, NOW() - INTERVAL '2 days'),
('movement-monster-6', 'f9a657df-709e-46c8-b47f-1ed12e904fbd', 'out', 18, 'Weekend sales', @user_id, NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Insert stock movements for Gatorade (Sports season pattern)
INSERT INTO stock_movements (id, item_id, movement_type, quantity, reason, created_by, created_at) VALUES
('movement-gatorade-1', '6862eaf1-f8a5-4c74-a952-b09597362817', 'in', 30, 'Weekly delivery', @user_id, NOW() - INTERVAL '7 days'),
('movement-gatorade-2', '6862eaf1-f8a5-4c74-a952-b09597362817', 'out', 25, 'Customer sales', @user_id, NOW() - INTERVAL '6 days'),
('movement-gatorade-3', '6862eaf1-f8a5-4c74-a952-b09597362817', 'out', 20, 'Customer sales', @user_id, NOW() - INTERVAL '5 days'),
('movement-gatorade-4', '6862eaf1-f8a5-4c74-a952-b09597362817', 'in', 40, 'Sports season prep', @user_id, NOW() - INTERVAL '3 days'),
('movement-gatorade-5', '6862eaf1-f8a5-4c74-a952-b09597362817', 'out', 35, 'Sports event sales', @user_id, NOW() - INTERVAL '2 days'),
('movement-gatorade-6', '6862eaf1-f8a5-4c74-a952-b09597362817', 'out', 30, 'Sports event sales', @user_id, NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Verify the data was inserted
SELECT 'Items inserted:' as status, COUNT(*) as count FROM items WHERE category = 'softdrinks';
SELECT 'Stock movements inserted:' as status, COUNT(*) as count FROM stock_movements WHERE item_id IN (
    SELECT id FROM items WHERE category = 'softdrinks'
);

-- Show sample data
SELECT 
    i.name,
    sm.movement_type,
    sm.quantity,
    sm.reason,
    sm.created_at
FROM stock_movements sm
JOIN items i ON sm.item_id = i.id
WHERE i.category = 'softdrinks'
ORDER BY sm.created_at DESC
LIMIT 10;
