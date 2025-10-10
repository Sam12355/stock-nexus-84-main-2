-- Soft Drinks Test Data - Proper UUIDs
-- This file contains test data for soft drinks with valid UUID format

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
INSERT INTO stock_movements (id, item_id, movement_type, quantity, reason, created_by, created_at) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 100, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '7 days'),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 80, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '6 days'),
('c3d4e5f6-a7b8-9012-cdef-123456789012', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 60, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '5 days'),
('d4e5f6a7-b8c9-0123-def0-234567890123', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 120, 'Restock order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '3 days'),
('e5f6a7b8-c9d0-1234-ef01-345678901234', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 70, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '2 days'),
('f6a7b8c9-d0e1-2345-f012-456789012345', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 50, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '1 day'),
-- Historical data
('a7b8c9d0-e1f2-3456-0123-567890123456', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 80, 'Historical delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '14 days'),
('b8c9d0e1-f2a3-4567-1234-678901234567', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 70, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '13 days'),
('c9d0e1f2-a3b4-5678-2345-789012345678', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 60, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '12 days'),
('d0e1f2a3-b4c5-6789-3456-890123456789', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'in', 90, 'Historical restock', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '10 days'),
('e1f2a3b4-c5d6-7890-4567-901234567890', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 65, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '9 days'),
('f2a3b4c5-d6e7-8901-5678-012345678901', '6a7a2b07-d495-4249-b6ff-0008f9024793', 'out', 55, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '8 days')
ON CONFLICT (id) DO NOTHING;

-- Insert stock movements for Pepsi (Negative trend - losing inventory)
INSERT INTO stock_movements (id, item_id, movement_type, quantity, reason, created_by, created_at) VALUES
('a3b4c5d6-e7f8-9012-6789-123456789012', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'in', 60, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '7 days'),
('b4c5d6e7-f8a9-0123-7890-234567890123', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'out', 80, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '6 days'),
('c5d6e7f8-a9b0-1234-8901-345678901234', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'out', 70, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '5 days'),
('d6e7f8a9-b0c1-2345-9012-456789012345', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'in', 50, 'Emergency restock', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '3 days'),
('e7f8a9b0-c1d2-3456-0123-567890123456', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'out', 90, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '2 days'),
('f8a9b0c1-d2e3-4567-1234-678901234567', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'out', 60, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '1 day'),
-- Historical data
('a9b0c1d2-e3f4-5678-2345-789012345678', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'in', 50, 'Historical delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '14 days'),
('b0c1d2e3-f4a5-6789-3456-890123456789', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'out', 70, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '13 days'),
('c1d2e3f4-a5b6-7890-4567-901234567890', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'out', 60, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '12 days'),
('d2e3f4a5-b6c7-8901-5678-012345678901', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'in', 40, 'Historical restock', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '10 days'),
('e3f4a5b6-c7d8-9012-6789-123456789012', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'out', 80, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '9 days'),
('f4a5b6c7-d8e9-0123-7890-234567890123', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'out', 50, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '8 days')
ON CONFLICT (id) DO NOTHING;

-- Insert stock movements for Sprite (Stable trend - balanced)
INSERT INTO stock_movements (id, item_id, movement_type, quantity, reason, created_by, created_at) VALUES
('a5b6c7d8-e9f0-1234-8901-345678901234', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 50, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '7 days'),
('b6c7d8e9-f0a1-2345-9012-456789012345', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 50, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '6 days'),
('c7d8e9f0-a1b2-3456-0123-567890123456', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 45, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '5 days'),
('d8e9f0a1-b2c3-4567-1234-678901234567', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 55, 'Restock order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '3 days'),
('e9f0a1b2-c3d4-5678-2345-789012345678', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 55, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '2 days'),
('f0a1b2c3-d4e5-6789-3456-890123456789', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 50, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '1 day'),
-- Historical data
('a1b2c3d4-e5f6-7890-4567-901234567890', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 60, 'Historical delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '14 days'),
('b2c3d4e5-f6a7-8901-5678-012345678901', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 60, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '13 days'),
('c3d4e5f6-a7b8-9012-6789-123456789012', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 55, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '12 days'),
('d4e5f6a7-b8c9-0123-7890-234567890123', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 55, 'Historical restock', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '10 days'),
('e5f6a7b8-c9d0-1234-8901-345678901234', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 55, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '9 days'),
('f6a7b8c9-d0e1-2345-9012-456789012345', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 50, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '8 days')
ON CONFLICT (id) DO NOTHING;

-- Insert stock movements for Fanta Orange (Mixed trend)
INSERT INTO stock_movements (id, item_id, movement_type, quantity, reason, created_by, created_at) VALUES
('a7b8c9d0-e1f2-3456-0123-567890123456', 'fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'in', 40, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '7 days'),
('b8c9d0e1-f2a3-4567-1234-678901234567', 'fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'out', 35, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '6 days'),
('c9d0e1f2-a3b4-5678-2345-789012345678', 'fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'out', 30, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '5 days'),
('d0e1f2a3-b4c5-6789-3456-890123456789', 'fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'in', 45, 'Restock order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '3 days'),
('e1f2a3b4-c5d6-7890-4567-901234567890', 'fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'out', 40, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '2 days'),
('f2a3b4c5-d6e7-8901-5678-012345678901', 'fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'out', 35, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '1 day'),
-- Historical data
('a3b4c5d6-e7f8-9012-6789-123456789012', 'fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'in', 35, 'Historical delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '14 days'),
('b4c5d6e7-f8a9-0123-7890-234567890123', 'fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'out', 30, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '13 days'),
('c5d6e7f8-a9b0-1234-8901-345678901234', 'fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'out', 25, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '12 days'),
('d6e7f8a9-b0c1-2345-9012-456789012345', 'fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'in', 50, 'Historical restock', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '10 days'),
('e7f8a9b0-c1d2-3456-0123-567890123456', 'fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'out', 45, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '9 days'),
('f8a9b0c1-d2e3-4567-1234-678901234567', 'fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'out', 40, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '8 days')
ON CONFLICT (id) DO NOTHING;

-- Insert stock movements for Mountain Dew (High consumption)
INSERT INTO stock_movements (id, item_id, movement_type, quantity, reason, created_by, created_at) VALUES
('a9b0c1d2-e3f4-5678-2345-789012345678', 'aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'in', 30, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '7 days'),
('b0c1d2e3-f4a5-6789-3456-890123456789', 'aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'out', 35, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '6 days'),
('c1d2e3f4-a5b6-7890-4567-901234567890', 'aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'out', 40, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '5 days'),
('d2e3f4a5-b6c7-8901-5678-012345678901', 'aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'in', 25, 'Emergency restock', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '3 days'),
('e3f4a5b6-c7d8-9012-6789-123456789012', 'aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'out', 30, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '2 days'),
('f4a5b6c7-d8e9-0123-7890-234567890123', 'aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'out', 25, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '1 day'),
-- Historical data
('a5b6c7d8-e9f0-1234-8901-345678901234', 'aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'in', 35, 'Historical delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '14 days'),
('b6c7d8e9-f0a1-2345-9012-456789012345', 'aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'out', 40, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '13 days'),
('c7d8e9f0-a1b2-3456-0123-567890123456', 'aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'out', 35, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '12 days'),
('d8e9f0a1-b2c3-4567-1234-678901234567', 'aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'in', 30, 'Historical restock', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '10 days'),
('e9f0a1b2-c3d4-5678-2345-789012345678', 'aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'out', 45, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '9 days'),
('f0a1b2c3-d4e5-6789-3456-890123456789', 'aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'out', 30, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '8 days')
ON CONFLICT (id) DO NOTHING;

-- Insert stock movements for Red Bull (Premium product)
INSERT INTO stock_movements (id, item_id, movement_type, quantity, reason, created_by, created_at) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'in', 20, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '7 days'),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'out', 15, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '6 days'),
('c3d4e5f6-a7b8-9012-cdef-123456789012', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'out', 18, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '5 days'),
('d4e5f6a7-b8c9-0123-def0-234567890123', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'in', 25, 'Restock order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '3 days'),
('e5f6a7b8-c9d0-1234-ef01-345678901234', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'out', 20, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '2 days'),
('f6a7b8c9-d0e1-2345-f012-456789012345', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'out', 12, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '1 day'),
-- Historical data
('a7b8c9d0-e1f2-3456-0123-567890123456', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'in', 18, 'Historical delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '14 days'),
('b8c9d0e1-f2a3-4567-1234-678901234567', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'out', 16, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '13 days'),
('c9d0e1f2-a3b4-5678-2345-789012345678', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'out', 14, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '12 days'),
('d0e1f2a3-b4c5-6789-3456-890123456789', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'in', 22, 'Historical restock', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '10 days'),
('e1f2a3b4-c5d6-7890-4567-901234567890', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'out', 19, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '9 days'),
('f2a3b4c5-d6e7-8901-5678-012345678901', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'out', 17, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '8 days')
ON CONFLICT (id) DO NOTHING;

-- Insert stock movements for Monster Energy (High-end energy drink)
INSERT INTO stock_movements (id, item_id, movement_type, quantity, reason, created_by, created_at) VALUES
('a3b4c5d6-e7f8-9012-6789-123456789012', 'f9a657df-709e-46c8-b47f-1ed12e904fbd', 'in', 15, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '7 days'),
('b4c5d6e7-f8a9-0123-7890-234567890123', 'f9a657df-709e-46c8-b47f-1ed12e904fbd', 'out', 12, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '6 days'),
('c5d6e7f8-a9b0-1234-8901-345678901234', 'f9a657df-709e-46c8-b47f-1ed12e904fbd', 'out', 10, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '5 days'),
('d6e7f8a9-b0c1-2345-9012-456789012345', 'f9a657df-709e-46c8-b47f-1ed12e904fbd', 'in', 18, 'Restock order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '3 days'),
('e7f8a9b0-c1d2-3456-0123-567890123456', 'f9a657df-709e-46c8-b47f-1ed12e904fbd', 'out', 14, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '2 days'),
('f8a9b0c1-d2e3-4567-1234-678901234567', 'f9a657df-709e-46c8-b47f-1ed12e904fbd', 'out', 11, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '1 day'),
-- Historical data
('a9b0c1d2-e3f4-5678-2345-789012345678', 'f9a657df-709e-46c8-b47f-1ed12e904fbd', 'in', 12, 'Historical delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '14 days'),
('b0c1d2e3-f4a5-6789-3456-890123456789', 'f9a657df-709e-46c8-b47f-1ed12e904fbd', 'out', 13, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '13 days'),
('c1d2e3f4-a5b6-7890-4567-901234567890', 'f9a657df-709e-46c8-b47f-1ed12e904fbd', 'out', 9, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '12 days'),
('d2e3f4a5-b6c7-8901-5678-012345678901', 'f9a657df-709e-46c8-b47f-1ed12e904fbd', 'in', 16, 'Historical restock', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '10 days'),
('e3f4a5b6-c7d8-9012-6789-123456789012', 'f9a657df-709e-46c8-b47f-1ed12e904fbd', 'out', 15, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '9 days'),
('f4a5b6c7-d8e9-0123-7890-234567890123', 'f9a657df-709e-46c8-b47f-1ed12e904fbd', 'out', 8, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '8 days')
ON CONFLICT (id) DO NOTHING;

-- Insert stock movements for Gatorade Lemon (Sports drink)
INSERT INTO stock_movements (id, item_id, movement_type, quantity, reason, created_by, created_at) VALUES
('a5b6c7d8-e9f0-1234-8901-345678901234', '6862eaf1-f8a5-4c74-a952-b09597362817', 'in', 25, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '7 days'),
('b6c7d8e9-f0a1-2345-9012-456789012345', '6862eaf1-f8a5-4c74-a952-b09597362817', 'out', 20, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '6 days'),
('c7d8e9f0-a1b2-3456-0123-567890123456', '6862eaf1-f8a5-4c74-a952-b09597362817', 'out', 18, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '5 days'),
('d8e9f0a1-b2c3-4567-1234-678901234567', '6862eaf1-f8a5-4c74-a952-b09597362817', 'in', 30, 'Restock order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '3 days'),
('e9f0a1b2-c3d4-5678-2345-789012345678', '6862eaf1-f8a5-4c74-a952-b09597362817', 'out', 22, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '2 days'),
('f0a1b2c3-d4e5-6789-3456-890123456789', '6862eaf1-f8a5-4c74-a952-b09597362817', 'out', 15, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '1 day'),
-- Historical data
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '6862eaf1-f8a5-4c74-a952-b09597362817', 'in', 20, 'Historical delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '14 days'),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', '6862eaf1-f8a5-4c74-a952-b09597362817', 'out', 25, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '13 days'),
('c3d4e5f6-a7b8-9012-cdef-123456789012', '6862eaf1-f8a5-4c74-a952-b09597362817', 'out', 19, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '12 days'),
('d4e5f6a7-b8c9-0123-def0-234567890123', '6862eaf1-f8a5-4c74-a952-b09597362817', 'in', 28, 'Historical restock', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '10 days'),
('e5f6a7b8-c9d0-1234-ef01-345678901234', '6862eaf1-f8a5-4c74-a952-b09597362817', 'out', 24, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '9 days'),
('f6a7b8c9-d0e1-2345-f012-456789012345', '6862eaf1-f8a5-4c74-a952-b09597362817', 'out', 16, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '8 days')
ON CONFLICT (id) DO NOTHING;

-- Summary of test data:
-- Coca Cola: Positive trend (more stock-in than stock-out)
-- Pepsi: Negative trend (more stock-out than stock-in) 
-- Sprite: Stable trend (balanced stock-in and stock-out)
-- Fanta Orange: Mixed trend (varies by week)
-- Mountain Dew: High consumption trend
-- Red Bull: Premium product with steady sales
-- Monster Energy: High-end energy drink
-- Gatorade Lemon: Sports drink with seasonal patterns
