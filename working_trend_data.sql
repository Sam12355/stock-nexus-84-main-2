-- Delete existing conflicting data and add positive trend data with proper UUIDs
-- This will ensure no UUID conflicts occur

-- First, delete existing stock movements for Coca Cola and Sprite to avoid conflicts
DELETE FROM stock_movements 
WHERE item_id IN ('6a7a2b07-d495-4249-b6ff-0008f9024793', '1a81e832-8980-4742-b308-c83bca50478a');

-- Now insert positive trend data for Coca Cola (Stock Growing case) with proper UUIDs
INSERT INTO stock_movements (id, item_id, movement_type, quantity, reason, created_by, created_at) VALUES
-- Recent positive trend (last 2 weeks)
('11111111-1111-1111-1111-111111111111', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 150, 'Large weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '1 day'),
('22222222-2222-2222-2222-222222222222', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 80, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '2 days'),
('33333333-3333-3333-3333-333333333333', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 120, 'Restock order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '3 days'),
('44444444-4444-4444-4444-444444444444', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 60, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '4 days'),
('55555555-5555-5555-5555-555555555555', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 100, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '5 days'),
('66666666-6666-6666-6666-666666666666', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 70, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '6 days'),

-- Week 2 positive trend
('77777777-7777-7777-7777-777777777777', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 140, 'Large weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '8 days'),
('88888888-8888-8888-8888-888888888888', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 75, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '9 days'),
('99999999-9999-9999-9999-999999999999', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 110, 'Restock order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '10 days'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 65, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '11 days'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 130, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '12 days'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 85, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '13 days'),

-- Week 3 positive trend
('dddddddd-dddd-dddd-dddd-dddddddddddd', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 160, 'Large weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '15 days'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 90, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '16 days'),
('ffffffff-ffff-ffff-ffff-ffffffffffff', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 125, 'Restock order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '17 days'),
('00000000-0000-0000-0000-000000000001', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 70, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '18 days'),
('00000000-0000-0000-0000-000000000002', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 145, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '19 days'),
('00000000-0000-0000-0000-000000000003', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 80, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '20 days'),

-- Week 4 positive trend
('00000000-0000-0000-0000-000000000004', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 170, 'Large weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '22 days'),
('00000000-0000-0000-0000-000000000005', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 95, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '23 days'),
('00000000-0000-0000-0000-000000000006', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 135, 'Restock order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '24 days'),
('00000000-0000-0000-0000-000000000007', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 75, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '25 days'),
('00000000-0000-0000-0000-000000000008', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 155, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '26 days'),
('00000000-0000-0000-0000-000000000009', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 85, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '27 days');

-- Insert stable trend data for Sprite (Balanced case) with proper UUIDs
INSERT INTO stock_movements (id, item_id, movement_type, quantity, reason, created_by, created_at) VALUES
-- Recent stable trend (last 2 weeks)
('00000000-0000-0000-0000-000000000010', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 60, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '1 day'),
('00000000-0000-0000-0000-000000000011', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 60, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '2 days'),
('00000000-0000-0000-0000-000000000012', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 55, 'Restock order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '3 days'),
('00000000-0000-0000-0000-000000000013', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 55, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '4 days'),
('00000000-0000-0000-0000-000000000014', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 50, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '5 days'),
('00000000-0000-0000-0000-000000000015', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 50, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '6 days'),

-- Week 2 stable trend
('00000000-0000-0000-0000-000000000016', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 65, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '8 days'),
('00000000-0000-0000-0000-000000000017', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 65, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '9 days'),
('00000000-0000-0000-0000-000000000018', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 60, 'Restock order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '10 days'),
('00000000-0000-0000-0000-000000000019', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 60, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '11 days'),
('00000000-0000-0000-0000-000000000020', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 55, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '12 days'),
('00000000-0000-0000-0000-000000000021', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 55, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '13 days'),

-- Week 3 stable trend
('00000000-0000-0000-0000-000000000022', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 70, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '15 days'),
('00000000-0000-0000-0000-000000000023', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 70, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '16 days'),
('00000000-0000-0000-0000-000000000024', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 65, 'Restock order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '17 days'),
('00000000-0000-0000-0000-000000000025', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 65, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '18 days'),
('00000000-0000-0000-0000-000000000026', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 60, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '19 days'),
('00000000-0000-0000-0000-000000000027', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 60, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '20 days'),

-- Week 4 stable trend
('00000000-0000-0000-0000-000000000028', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 75, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '22 days'),
('00000000-0000-0000-0000-000000000029', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 75, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '23 days'),
('00000000-0000-0000-0000-000000000030', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 70, 'Restock order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '24 days'),
('00000000-0000-0000-0000-000000000031', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 70, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '25 days'),
('00000000-0000-0000-0000-000000000032', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 65, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '26 days'),
('00000000-0000-0000-0000-000000000033', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 65, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '27 days');

-- Summary of what this does:
-- 1. Deletes existing stock movements for Coca Cola and Sprite
-- 2. Inserts new positive trend data for Coca Cola (Stock Growing) with proper UUIDs
-- 3. Inserts new stable trend data for Sprite (Stock Stable) with proper UUIDs
-- This will give you good test cases for different trend scenarios
