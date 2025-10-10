-- Soft Drinks Test Data for Stock Nexus
-- This file contains test data for the Soft Drinks Weekly Comparison Report
-- Import this into your Render PostgreSQL database

-- STEP 1: First, get your branch ID and user ID
-- Run these queries first to get your actual IDs:
-- SELECT id, name FROM branches LIMIT 1;
-- SELECT id FROM users WHERE is_active = true LIMIT 1;

-- STEP 2: Replace the UUIDs below with your actual IDs from step 1
-- Replace 'YOUR_BRANCH_ID_HERE' with your actual branch ID
-- Replace '377f87cc-a570-47f8-982a-9bb8a6ab04fa' with your actual user ID

-- Insert soft drink items
INSERT INTO items (id, name, category, threshold_level, branch_id, created_at, updated_at) VALUES
('6a7a2b07-d495-4249-b6ff-0008f9024793', 'Coca Cola 330ml', 'softdrinks', 50, '8f9f8967-1581-46f4-bc57-811ff3fdd6b5', NOW(), NOW()),
('cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'Pepsi 330ml', 'softdrinks', 40, '8f9f8967-1581-46f4-bc57-811ff3fdd6b5', NOW(), NOW()),
('1a81e832-8980-4742-b308-c83bca50478a', 'Sprite 330ml', 'softdrinks', 30, '8f9f8967-1581-46f4-bc57-811ff3fdd6b5', NOW(), NOW()),
('fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'Fanta Orange 330ml', 'softdrinks', 25, '8f9f8967-1581-46f4-bc57-811ff3fdd6b5', NOW(), NOW()),
('aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'Mountain Dew 330ml', 'softdrinks', 20, '8f9f8967-1581-46f4-bc57-811ff3fdd6b5', NOW(), NOW()),
('fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'Red Bull 250ml', 'softdrinks', 15, '8f9f8967-1581-46f4-bc57-811ff3fdd6b5', NOW(), NOW()),
('f9a657df-709e-46c8-b47f-1ed12e904fbd', 'Monster Energy 500ml', 'softdrinks', 10, '8f9f8967-1581-46f4-bc57-811ff3fdd6b5', NOW(), NOW()),
('6862eaf1-f8a5-4c74-a952-b09597362817', 'Gatorade Lemon 500ml', 'softdrinks', 20, '8f9f8967-1581-46f4-bc57-811ff3fdd6b5', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert stock movements for Coca Cola (Positive trend - gaining inventory)
-- Replace YOUR_USER_ID_HERE with actual user ID
INSERT INTO stock_movements (id, item_id, movement_type, quantity, reason, created_by, created_at) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 100, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '7 days'),
('b2c3d4e5-f6g7-8901-bcde-f12345678901', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 80, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '6 days'),
('c3d4e5f6-g7h8-9012-cdef-123456789012', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 60, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '5 days'),
('d4e5f6g7-h8i9-0123-def0-234567890123', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 120, 'Restock order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '3 days'),
('e5f6g7h8-i9j0-1234-ef01-345678901234', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 70, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '2 days'),
('f6g7h8i9-j0k1-2345-f012-456789012345', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 50, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '1 day'),
-- Historical data
('g7h8i9j0-k1l2-3456-0123-567890123456', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 80, 'Historical delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '14 days'),
('h8i9j0k1-l2m3-4567-1234-678901234567', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 70, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '13 days'),
('i9j0k1l2-m3n4-5678-2345-789012345678', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 60, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '12 days'),
('j0k1l2m3-n4o5-6789-3456-890123456789', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 90, 'Historical restock', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '10 days'),
('k1l2m3n4-o5p6-7890-4567-901234567890', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 65, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '9 days'),
('l2m3n4o5-p6q7-8901-5678-012345678901', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 55, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '8 days')
ON CONFLICT (id) DO NOTHING;

-- Insert stock movements for Pepsi (Negative trend - losing inventory)
INSERT INTO stock_movements (id, item_id, movement_type, quantity, reason, created_by, created_at) VALUES
('movement-pepsi-1', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'in', 60, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '7 days'),
('movement-pepsi-2', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'out', 80, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '6 days'),
('movement-pepsi-3', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'out', 70, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '5 days'),
('movement-pepsi-4', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'in', 50, 'Emergency restock', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '3 days'),
('movement-pepsi-5', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'out', 90, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '2 days'),
('movement-pepsi-6', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'out', 60, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '1 day'),
-- Historical data
('movement-pepsi-hist-1', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'in', 50, 'Historical delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '14 days'),
('movement-pepsi-hist-2', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'out', 70, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '13 days'),
('movement-pepsi-hist-3', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'out', 60, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '12 days'),
('movement-pepsi-hist-4', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'in', 40, 'Historical restock', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '10 days'),
('movement-pepsi-hist-5', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'out', 80, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '9 days'),
('movement-pepsi-hist-6', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'out', 50, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '8 days')
ON CONFLICT (id) DO NOTHING;

-- Insert stock movements for Sprite (Stable trend - balanced)
INSERT INTO stock_movements (id, item_id, movement_type, quantity, reason, created_by, created_at) VALUES
('movement-sprite-1', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 50, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '7 days'),
('movement-sprite-2', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 45, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '6 days'),
('movement-sprite-3', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 40, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '5 days'),
('movement-sprite-4', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 50, 'Regular restock', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '3 days'),
('movement-sprite-5', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 35, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '2 days'),
('movement-sprite-6', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 30, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Insert stock movements for Fanta (Critical trend - high consumption)
INSERT INTO stock_movements (id, item_id, movement_type, quantity, reason, created_by, created_at) VALUES
('movement-fanta-1', 'fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'in', 30, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '7 days'),
('movement-fanta-2', 'fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'out', 50, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '6 days'),
('movement-fanta-3', 'fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'out', 45, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '5 days'),
('movement-fanta-4', 'fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'in', 20, 'Small restock', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '3 days'),
('movement-fanta-5', 'fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'out', 40, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '2 days'),
('movement-fanta-6', 'fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'out', 35, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Insert stock movements for Mountain Dew (Growing trend)
INSERT INTO stock_movements (id, item_id, movement_type, quantity, reason, created_by, created_at) VALUES
('movement-mountaindew-1', 'aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'in', 40, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '7 days'),
('movement-mountaindew-2', 'aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'out', 25, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '6 days'),
('movement-mountaindew-3', 'aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'out', 20, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '5 days'),
('movement-mountaindew-4', 'aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'in', 60, 'Bulk order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '3 days'),
('movement-mountaindew-5', 'aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'out', 30, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '2 days'),
('movement-mountaindew-6', 'aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'out', 25, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Insert stock movements for Red Bull (Erratic pattern)
INSERT INTO stock_movements (id, item_id, movement_type, quantity, reason, created_by, created_at) VALUES
('movement-redbull-1', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'in', 20, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '7 days'),
('movement-redbull-2', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'out', 15, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '6 days'),
('movement-redbull-3', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'in', 30, 'Special order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '5 days'),
('movement-redbull-4', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'out', 25, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '4 days'),
('movement-redbull-5', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'out', 20, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '3 days'),
('movement-redbull-6', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'in', 10, 'Emergency restock', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '2 days'),
('movement-redbull-7', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'out', 15, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Insert stock movements for Monster Energy (Seasonal spike)
INSERT INTO stock_movements (id, item_id, movement_type, quantity, reason, created_by, created_at) VALUES
('movement-monster-1', 'f9a657df-709e-46c8-b47f-1ed12e904fbd', 'in', 15, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '7 days'),
('movement-monster-2', 'f9a657df-709e-46c8-b47f-1ed12e904fbd', 'out', 12, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '6 days'),
('movement-monster-3', 'f9a657df-709e-46c8-b47f-1ed12e904fbd', 'out', 10, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '5 days'),
('movement-monster-4', 'f9a657df-709e-46c8-b47f-1ed12e904fbd', 'in', 25, 'Weekend preparation', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '3 days'),
('movement-monster-5', 'f9a657df-709e-46c8-b47f-1ed12e904fbd', 'out', 20, 'Weekend sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '2 days'),
('movement-monster-6', 'f9a657df-709e-46c8-b47f-1ed12e904fbd', 'out', 18, 'Weekend sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Insert stock movements for Gatorade (Sports season pattern)
INSERT INTO stock_movements (id, item_id, movement_type, quantity, reason, created_by, created_at) VALUES
('movement-gatorade-1', '6862eaf1-f8a5-4c74-a952-b09597362817', 'in', 30, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '7 days'),
('movement-gatorade-2', '6862eaf1-f8a5-4c74-a952-b09597362817', 'out', 25, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '6 days'),
('movement-gatorade-3', '6862eaf1-f8a5-4c74-a952-b09597362817', 'out', 20, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '5 days'),
('movement-gatorade-4', '6862eaf1-f8a5-4c74-a952-b09597362817', 'in', 40, 'Sports season prep', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '3 days'),
('movement-gatorade-5', '6862eaf1-f8a5-4c74-a952-b09597362817', 'out', 35, 'Sports event sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '2 days'),
('movement-gatorade-6', '6862eaf1-f8a5-4c74-a952-b09597362817', 'out', 30, 'Sports event sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '1 day')
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
