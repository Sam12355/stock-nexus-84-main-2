-- Soft Drinks Test Data - Fixed UUIDs
-- This file contains test data for soft drinks with proper UUID format

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
('m3n4o5p6-q7r8-9012-6789-123456789012', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'in', 60, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '7 days'),
('n4o5p6q7-r8s9-0123-7890-234567890123', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'out', 80, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '6 days'),
('o5p6q7r8-s9t0-1234-8901-345678901234', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'out', 70, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '5 days'),
('p6q7r8s9-t0u1-2345-9012-456789012345', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'in', 50, 'Emergency restock', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '3 days'),
('q7r8s9t0-u1v2-3456-0123-567890123456', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'out', 90, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '2 days'),
('r8s9t0u1-v2w3-4567-1234-678901234567', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'out', 60, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '1 day'),
-- Historical data
('s9t0u1v2-w3x4-5678-2345-789012345678', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'in', 50, 'Historical delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '14 days'),
('t0u1v2w3-x4y5-6789-3456-890123456789', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'out', 70, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '13 days'),
('u1v2w3x4-y5z6-7890-4567-901234567890', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'out', 60, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '12 days'),
('v2w3x4y5-z6a7-8901-5678-012345678901', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'in', 40, 'Historical restock', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '10 days'),
('w3x4y5z6-a7b8-9012-6789-123456789012', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'out', 80, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '9 days'),
('x4y5z6a7-b8c9-0123-7890-234567890123', 'cb10d12b-f248-433d-bf3a-4e658dc02b4f', 'out', 50, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '8 days')
ON CONFLICT (id) DO NOTHING;

-- Insert stock movements for Sprite (Stable trend - balanced)
INSERT INTO stock_movements (id, item_id, movement_type, quantity, reason, created_by, created_at) VALUES
('y5z6a7b8-c9d0-1234-8901-345678901234', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 50, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '7 days'),
('z6a7b8c9-d0e1-2345-9012-456789012345', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 50, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '6 days'),
('a7b8c9d0-e1f2-3456-0123-567890123456', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 45, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '5 days'),
('b8c9d0e1-f2g3-4567-1234-678901234567', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 55, 'Restock order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '3 days'),
('c9d0e1f2-g3h4-5678-2345-789012345678', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 55, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '2 days'),
('d0e1f2g3-h4i5-6789-3456-890123456789', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 50, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '1 day'),
-- Historical data
('e1f2g3h4-i5j6-7890-4567-901234567890', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 60, 'Historical delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '14 days'),
('f2g3h4i5-j6k7-8901-5678-012345678901', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 60, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '13 days'),
('g3h4i5j6-k7l8-9012-6789-123456789012', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 55, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '12 days'),
('h4i5j6k7-l8m9-0123-7890-234567890123', '1a81e832-8980-4742-b308-c83bca50478a', 'in', 55, 'Historical restock', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '10 days'),
('i5j6k7l8-m9n0-1234-8901-345678901234', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 55, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '9 days'),
('j6k7l8m9-n0o1-2345-9012-456789012345', '1a81e832-8980-4742-b308-c83bca50478a', 'out', 50, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '8 days')
ON CONFLICT (id) DO NOTHING;

-- Insert stock movements for Fanta Orange (Mixed trend)
INSERT INTO stock_movements (id, item_id, movement_type, quantity, reason, created_by, created_at) VALUES
('k7l8m9n0-o1p2-3456-0123-567890123456', 'fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'in', 40, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '7 days'),
('l8m9n0o1-p2q3-4567-1234-678901234567', 'fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'out', 35, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '6 days'),
('m9n0o1p2-q3r4-5678-2345-789012345678', 'fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'out', 30, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '5 days'),
('n0o1p2q3-r4s5-6789-3456-890123456789', 'fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'in', 45, 'Restock order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '3 days'),
('o1p2q3r4-s5t6-7890-4567-901234567890', 'fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'out', 40, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '2 days'),
('p2q3r4s5-t6u7-8901-5678-012345678901', 'fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'out', 35, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '1 day'),
-- Historical data
('q3r4s5t6-u7v8-9012-6789-123456789012', 'fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'in', 35, 'Historical delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '14 days'),
('r4s5t6u7-v8w9-0123-7890-234567890123', 'fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'out', 30, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '13 days'),
('s5t6u7v8-w9x0-1234-8901-345678901234', 'fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'out', 25, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '12 days'),
('t6u7v8w9-x0y1-2345-9012-456789012345', 'fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'in', 50, 'Historical restock', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '10 days'),
('u7v8w9x0-y1z2-3456-0123-567890123456', 'fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'out', 45, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '9 days'),
('v8w9x0y1-z2a3-4567-1234-678901234567', 'fe8f98c4-3ba6-4ddf-8736-df1d1fde3e04', 'out', 40, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '8 days')
ON CONFLICT (id) DO NOTHING;

-- Insert stock movements for Mountain Dew (High consumption)
INSERT INTO stock_movements (id, item_id, movement_type, quantity, reason, created_by, created_at) VALUES
('w9x0y1z2-a3b4-5678-2345-789012345678', 'aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'in', 30, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '7 days'),
('x0y1z2a3-b4c5-6789-3456-890123456789', 'aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'out', 35, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '6 days'),
('y1z2a3b4-c5d6-7890-4567-901234567890', 'aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'out', 40, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '5 days'),
('z2a3b4c5-d6e7-8901-5678-012345678901', 'aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'in', 25, 'Emergency restock', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '3 days'),
('a3b4c5d6-e7f8-9012-6789-123456789012', 'aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'out', 30, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '2 days'),
('b4c5d6e7-f8g9-0123-7890-234567890123', 'aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'out', 25, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '1 day'),
-- Historical data
('c5d6e7f8-g9h0-1234-8901-345678901234', 'aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'in', 35, 'Historical delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '14 days'),
('d6e7f8g9-h0i1-2345-9012-456789012345', 'aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'out', 40, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '13 days'),
('e7f8g9h0-i1j2-3456-0123-567890123456', 'aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'out', 35, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '12 days'),
('f8g9h0i1-j2k3-4567-1234-678901234567', 'aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'in', 30, 'Historical restock', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '10 days'),
('g9h0i1j2-k3l4-5678-2345-789012345678', 'aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'out', 45, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '9 days'),
('h0i1j2k3-l4m5-6789-3456-890123456789', 'aef8715a-a6b6-44ba-9bbb-6bf4077401e9', 'out', 30, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '8 days')
ON CONFLICT (id) DO NOTHING;

-- Insert stock movements for Red Bull (Premium product)
INSERT INTO stock_movements (id, item_id, movement_type, quantity, reason, created_by, created_at) VALUES
('i1j2k3l4-m5n6-7890-4567-901234567890', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'in', 20, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '7 days'),
('j2k3l4m5-n6o7-8901-5678-012345678901', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'out', 15, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '6 days'),
('k3l4m5n6-o7p8-9012-6789-123456789012', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'out', 18, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '5 days'),
('l4m5n6o7-p8q9-0123-7890-234567890123', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'in', 25, 'Restock order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '3 days'),
('m5n6o7p8-q9r0-1234-8901-345678901234', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'out', 20, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '2 days'),
('n6o7p8q9-r0s1-2345-9012-456789012345', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'out', 12, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '1 day'),
-- Historical data
('o7p8q9r0-s1t2-3456-0123-567890123456', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'in', 18, 'Historical delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '14 days'),
('p8q9r0s1-t2u3-4567-1234-678901234567', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'out', 16, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '13 days'),
('q9r0s1t2-u3v4-5678-2345-789012345678', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'out', 14, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '12 days'),
('r0s1t2u3-v4w5-6789-3456-890123456789', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'in', 22, 'Historical restock', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '10 days'),
('s1t2u3v4-w5x6-7890-4567-901234567890', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'out', 19, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '9 days'),
('t2u3v4w5-x6y7-8901-5678-012345678901', 'fc7fa9e6-6758-43f7-8a4f-532bb012f64d', 'out', 17, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '8 days')
ON CONFLICT (id) DO NOTHING;

-- Insert stock movements for Monster Energy (High-end energy drink)
INSERT INTO stock_movements (id, item_id, movement_type, quantity, reason, created_by, created_at) VALUES
('u3v4w5x6-y7z8-9012-6789-123456789012', 'f9a657df-709e-46c8-b47f-1ed12e904fbd', 'in', 15, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '7 days'),
('v4w5x6y7-z8a9-0123-7890-234567890123', 'f9a657df-709e-46c8-b47f-1ed12e904fbd', 'out', 12, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '6 days'),
('w5x6y7z8-a9b0-1234-8901-345678901234', 'f9a657df-709e-46c8-b47f-1ed12e904fbd', 'out', 10, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '5 days'),
('x6y7z8a9-b0c1-2345-9012-456789012345', 'f9a657df-709e-46c8-b47f-1ed12e904fbd', 'in', 18, 'Restock order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '3 days'),
('y7z8a9b0-c1d2-3456-0123-567890123456', 'f9a657df-709e-46c8-b47f-1ed12e904fbd', 'out', 14, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '2 days'),
('z8a9b0c1-d2e3-4567-1234-678901234567', 'f9a657df-709e-46c8-b47f-1ed12e904fbd', 'out', 11, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '1 day'),
-- Historical data
('a9b0c1d2-e3f4-5678-2345-789012345678', 'f9a657df-709e-46c8-b47f-1ed12e904fbd', 'in', 12, 'Historical delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '14 days'),
('b0c1d2e3-f4g5-6789-3456-890123456789', 'f9a657df-709e-46c8-b47f-1ed12e904fbd', 'out', 13, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '13 days'),
('c1d2e3f4-g5h6-7890-4567-901234567890', 'f9a657df-709e-46c8-b47f-1ed12e904fbd', 'out', 9, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '12 days'),
('d2e3f4g5-h6i7-8901-5678-012345678901', 'f9a657df-709e-46c8-b47f-1ed12e904fbd', 'in', 16, 'Historical restock', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '10 days'),
('e3f4g5h6-i7j8-9012-6789-123456789012', 'f9a657df-709e-46c8-b47f-1ed12e904fbd', 'out', 15, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '9 days'),
('f4g5h6i7-j8k9-0123-7890-234567890123', 'f9a657df-709e-46c8-b47f-1ed12e904fbd', 'out', 8, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '8 days')
ON CONFLICT (id) DO NOTHING;

-- Insert stock movements for Gatorade Lemon (Sports drink)
INSERT INTO stock_movements (id, item_id, movement_type, quantity, reason, created_by, created_at) VALUES
('g5h6i7j8-k9l0-1234-8901-345678901234', '6862eaf1-f8a5-4c74-a952-b09597362817', 'in', 25, 'Weekly delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '7 days'),
('h6i7j8k9-l0m1-2345-9012-456789012345', '6862eaf1-f8a5-4c74-a952-b09597362817', 'out', 20, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '6 days'),
('i7j8k9l0-m1n2-3456-0123-567890123456', '6862eaf1-f8a5-4c74-a952-b09597362817', 'out', 18, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '5 days'),
('j8k9l0m1-n2o3-4567-1234-678901234567', '6862eaf1-f8a5-4c74-a952-b09597362817', 'in', 30, 'Restock order', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '3 days'),
('k9l0m1n2-o3p4-5678-2345-789012345678', '6862eaf1-f8a5-4c74-a952-b09597362817', 'out', 22, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '2 days'),
('l0m1n2o3-p4q5-6789-3456-890123456789', '6862eaf1-f8a5-4c74-a952-b09597362817', 'out', 15, 'Customer sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '1 day'),
-- Historical data
('m1n2o3p4-q5r6-7890-4567-901234567890', '6862eaf1-f8a5-4c74-a952-b09597362817', 'in', 20, 'Historical delivery', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '14 days'),
('n2o3p4q5-r6s7-8901-5678-012345678901', '6862eaf1-f8a5-4c74-a952-b09597362817', 'out', 25, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '13 days'),
('o3p4q5r6-s7t8-9012-6789-123456789012', '6862eaf1-f8a5-4c74-a952-b09597362817', 'out', 19, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '12 days'),
('p4q5r6s7-t8u9-0123-7890-234567890123', '6862eaf1-f8a5-4c74-a952-b09597362817', 'in', 28, 'Historical restock', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '10 days'),
('q5r6s7t8-u9v0-1234-8901-345678901234', '6862eaf1-f8a5-4c74-a952-b09597362817', 'out', 24, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '9 days'),
('r6s7t8u9-v0w1-2345-9012-456789012345', '6862eaf1-f8a5-4c74-a952-b09597362817', 'out', 16, 'Historical sales', '377f87cc-a570-47f8-982a-9bb8a6ab04fa', NOW() - INTERVAL '8 days')
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
