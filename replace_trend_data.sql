-- Delete existing conflicting data and add positive trend data
-- This will ensure the new data is properly inserted

-- First, delete existing stock movements for Coca Cola and Sprite to avoid conflicts
DELETE FROM stock_movements 
WHERE item_id IN ('6a7a2b07-d495-4249-b6ff-0008f9024793', '1a81e832-8980-4742-b308-c83bca50478a');

-- Now insert positive trend data for Coca Cola (Stock Growing case)
INSERT INTO stock_movements (id, item_id, movement_type, quantity, reason, created_by, created_at) VALUES
-- Recent positive trend (last 2 weeks)
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 150, 'Large weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '1 day'),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 80, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '2 days'),
('c3d4e5f6-a7b8-9012-cdef-123456789012', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 120, 'Restock order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '3 days'),
('d4e5f6a7-b8c9-0123-def0-234567890123', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 60, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '4 days'),
('e5f6a7b8-c9d0-1234-ef01-345678901234', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 100, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '5 days'),
('f6a7b8c9-d0e1-2345-f012-456789012345', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 70, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '6 days'),

-- Week 2 positive trend
('a7b8c9d0-e1f2-3456-0123-567890123456', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 140, 'Large weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '8 days'),
('b8c9d0e1-f2a3-4567-1234-678901234567', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 75, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '9 days'),
('c9d0e1f2-a3b4-5678-2345-789012345678', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 110, 'Restock order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '10 days'),
('d0e1f2a3-b4c5-6789-3456-890123456789', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 65, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '11 days'),
('e1f2a3b4-c5d6-7890-4567-901234567890', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 130, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '12 days'),
('f2a3b4c5-d6e7-8901-5678-012345678901', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 85, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '13 days'),

-- Week 3 positive trend
('a3b4c5d6-e7f8-9012-6789-123456789012', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 160, 'Large weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '15 days'),
('b4c5d6e7-f8a9-0123-7890-234567890123', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 90, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '16 days'),
('c5d6e7f8-a9b0-1234-8901-345678901234', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 125, 'Restock order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '17 days'),
('d6e7f8a9-b0c1-2345-9012-456789012345', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 70, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '18 days'),
('e7f8a9b0-c1d2-3456-0123-567890123456', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 145, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '19 days'),
('f8a9b0c1-d2e3-4567-1234-678901234567', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 80, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '20 days'),

-- Week 4 positive trend
('a9b0c1d2-e3f4-5678-2345-789012345678', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 170, 'Large weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '22 days'),
('b0c1d2e3-f4a5-6789-3456-890123456789', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 95, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '23 days'),
('c1d2e3f4-a5b6-7890-4567-901234567890', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 135, 'Restock order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '24 days'),
('d2e3f4a5-b6c7-8901-5678-012345678901', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 75, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '25 days'),
('e3f4a5b6-c7d8-9012-6789-123456789012', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 155, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '26 days'),
('f4a5b6c7-d8e9-0123-7890-234567890123', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 85, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '27 days');

-- Insert stable trend data for Sprite (Balanced case)
INSERT INTO stock_movements (id, item_id, movement_type, quantity, reason, created_by, created_at) VALUES
-- Recent stable trend (last 2 weeks)
('a5b6c7d8-e9f0-1234-8901-345678901234', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 60, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '1 day'),
('b6c7d8e9-f0a1-2345-9012-456789012345', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 60, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '2 days'),
('c7d8e9f0-a1b2-3456-0123-567890123456', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 55, 'Restock order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '3 days'),
('d8e9f0a1-b2c3-4567-1234-678901234567', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 55, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '4 days'),
('e9f0a1b2-c3d4-5678-2345-789012345678', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 50, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '5 days'),
('f0a1b2c3-d4e5-6789-3456-890123456789', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 50, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '6 days'),

-- Week 2 stable trend
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 65, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '8 days'),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 65, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '9 days'),
('c3d4e5f6-a7b8-9012-cdef-123456789012', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 60, 'Restock order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '10 days'),
('d4e5f6a7-b8c9-0123-def0-234567890123', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 60, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '11 days'),
('e5f6a7b8-c9d0-1234-ef01-345678901234', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 55, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '12 days'),
('f6a7b8c9-d0e1-2345-f012-456789012345', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 55, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '13 days'),

-- Week 3 stable trend
('a7b8c9d0-e1f2-3456-0123-567890123456', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 70, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '15 days'),
('b8c9d0e1-f2a3-4567-1234-678901234567', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 70, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '16 days'),
('c9d0e1f2-a3b4-5678-2345-789012345678', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 65, 'Restock order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '17 days'),
('d0e1f2a3-b4c5-6789-3456-890123456789', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 65, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '18 days'),
('e1f2a3b4-c5d6-7890-4567-901234567890', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 60, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '19 days'),
('f2a3b4c5-d6e7-8901-5678-012345678901', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 60, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '20 days'),

-- Week 4 stable trend
('a3b4c5d6-e7f8-9012-6789-123456789012', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 75, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '22 days'),
('b4c5d6e7-f8a9-0123-7890-234567890123', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 75, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '23 days'),
('c5d6e7f8-a9b0-1234-8901-345678901234', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 70, 'Restock order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '24 days'),
('d6e7f8a9-b0c1-2345-9012-456789012345', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 70, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '25 days'),
('e7f8a9b0-c1d2-3456-0123-567890123456', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 65, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '26 days'),
('f8a9b0c1-d2e3-4567-1234-678901234567', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 65, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '27 days');

-- Summary of what this does:
-- 1. Deletes existing stock movements for Coca Cola and Sprite
-- 2. Inserts new positive trend data for Coca Cola (Stock Growing)
-- 3. Inserts new stable trend data for Sprite (Stock Stable)
-- This will give you good test cases for different trend scenarios
