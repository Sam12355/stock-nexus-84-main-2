-- Check for softdrink trends data
-- Run this in pgAdmin to see if there's any softdrink data

-- 1. Check if there are any softdrink items
SELECT COUNT(*) as softdrink_items_count
FROM items 
WHERE category = 'softdrinks';

-- 2. Check if there are any stock movements for softdrinks
SELECT COUNT(*) as softdrink_movements_count
FROM stock_movements sm
JOIN items i ON sm.item_id = i.id
WHERE i.category = 'softdrinks';

-- 3. Check recent softdrink movements (last 2 weeks)
SELECT 
  i.name as item_name,
  sm.movement_type,
  sm.quantity,
  sm.created_at,
  DATE_TRUNC('week', sm.created_at) as week_start
FROM stock_movements sm
JOIN items i ON sm.item_id = i.id
WHERE i.category = 'softdrinks'
  AND sm.created_at >= NOW() - INTERVAL '2 weeks'
ORDER BY sm.created_at DESC;

-- 4. Check weekly softdrink trends (last 2 weeks)
WITH weekly_data AS (
  SELECT 
    i.name as item_name,
    DATE_TRUNC('week', sm.created_at) as week_start,
    SUM(CASE WHEN sm.movement_type = 'in' THEN sm.quantity ELSE 0 END) as stock_in,
    SUM(CASE WHEN sm.movement_type = 'out' THEN sm.quantity ELSE 0 END) as stock_out,
    SUM(CASE WHEN sm.movement_type = 'in' THEN sm.quantity ELSE -sm.quantity END) as net_change
  FROM stock_movements sm
  JOIN items i ON sm.item_id = i.id
  WHERE i.category = 'softdrinks'
    AND sm.created_at >= NOW() - INTERVAL '2 weeks'
  GROUP BY i.name, DATE_TRUNC('week', sm.created_at)
)
SELECT 
  item_name,
  week_start,
  stock_in,
  stock_out,
  net_change,
  CASE 
    WHEN net_change < 0 THEN 'declining'
    WHEN net_change = 0 THEN 'stable'
    ELSE 'growing'
  END as trend
FROM weekly_data
ORDER BY net_change ASC;
