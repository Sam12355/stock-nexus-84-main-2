-- Update event_alerts alert_time default to 19:05 and migrate existing rows
ALTER TABLE public.event_alerts
  ALTER COLUMN alert_time SET DEFAULT '24:00:00';

UPDATE public.event_alerts
SET alert_time = '24:00:00'
WHERE alert_time IN ('08:00:00', '19:00:00', '19:05:00', '19:10:00', '24:00:00');
