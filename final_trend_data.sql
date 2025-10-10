-- Delete existing conflicting data and add positive trend data with unique UUIDs
-- This will ensure no UUID conflicts occur

-- First, delete existing stock movements for Coca Cola and Sprite to avoid conflicts
DELETE FROM stock_movements 
WHERE item_id IN ('6a7a2b07-d495-4249-b6ff-0008f9024793', '1a81e832-8980-4742-b308-c83bca50478a');

-- Now insert positive trend data for Coca Cola (Stock Growing case) with unique UUIDs
INSERT INTO stock_movements (id, item_id, movement_type, quantity, reason, created_by, created_at) VALUES
-- Recent positive trend (last 2 weeks)
('coca-pos-001', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 150, 'Large weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '1 day'),
('coca-pos-002', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 80, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '2 days'),
('coca-pos-003', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 120, 'Restock order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '3 days'),
('coca-pos-004', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 60, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '4 days'),
('coca-pos-005', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 100, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '5 days'),
('coca-pos-006', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 70, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '6 days'),

-- Week 2 positive trend
('coca-pos-007', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 140, 'Large weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '8 days'),
('coca-pos-008', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 75, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '9 days'),
('coca-pos-009', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 110, 'Restock order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '10 days'),
('coca-pos-010', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 65, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '11 days'),
('coca-pos-011', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 130, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '12 days'),
('coca-pos-012', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 85, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '13 days'),

-- Week 3 positive trend
('coca-pos-013', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 160, 'Large weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '15 days'),
('coca-pos-014', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 90, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '16 days'),
('coca-pos-015', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 125, 'Restock order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '17 days'),
('coca-pos-016', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 70, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '18 days'),
('coca-pos-017', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 145, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '19 days'),
('coca-pos-018', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 80, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '20 days'),

-- Week 4 positive trend
('coca-pos-019', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 170, 'Large weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '22 days'),
('coca-pos-020', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 95, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '23 days'),
('coca-pos-021', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 135, 'Restock order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '24 days'),
('coca-pos-022', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 75, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '25 days'),
('coca-pos-023', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 155, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '26 days'),
('coca-pos-024', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 85, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '27 days');

-- Insert stable trend data for Sprite (Balanced case) with unique UUIDs
INSERT INTO stock_movements (id, item_id, movement_type, quantity, reason, created_by, created_at) VALUES
-- Recent stable trend (last 2 weeks)
('sprite-stable-001', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 60, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '1 day'),
('sprite-stable-002', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 60, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '2 days'),
('sprite-stable-003', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 55, 'Restock order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '3 days'),
('sprite-stable-004', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 55, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '4 days'),
('sprite-stable-005', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 50, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '5 days'),
('sprite-stable-006', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 50, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '6 days'),

-- Week 2 stable trend
('sprite-stable-007', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 65, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '8 days'),
('sprite-stable-008', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 65, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '9 days'),
('sprite-stable-009', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 60, 'Restock order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '10 days'),
('sprite-stable-010', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 60, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '11 days'),
('sprite-stable-011', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 55, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '12 days'),
('sprite-stable-012', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 55, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '13 days'),

-- Week 3 stable trend
('sprite-stable-013', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 70, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '15 days'),
('sprite-stable-014', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 70, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '16 days'),
('sprite-stable-015', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 65, 'Restock order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '17 days'),
('sprite-stable-016', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 65, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '18 days'),
('sprite-stable-017', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 60, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '19 days'),
('sprite-stable-018', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 60, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '20 days'),

-- Week 4 stable trend
('sprite-stable-019', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 75, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '22 days'),
('sprite-stable-020', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 75, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '23 days'),
('sprite-stable-021', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 70, 'Restock order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '24 days'),
('sprite-stable-022', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 70, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '25 days'),
('sprite-stable-023', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 65, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '26 days'),
('sprite-stable-024', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 65, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '27 days');

-- Summary of what this does:
-- 1. Deletes existing stock movements for Coca Cola and Sprite
-- 2. Inserts new positive trend data for Coca Cola (Stock Growing) with unique IDs
-- 3. Inserts new stable trend data for Sprite (Stock Stable) with unique IDs
-- This will give you good test cases for different trend scenarios
