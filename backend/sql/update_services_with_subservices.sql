-- Update services with accurate sub_services arrays
-- This migration populates each service with its precise subservice offerings

UPDATE services 
SET sub_services = jsonb_build_array(
  'AC Foam Jet Service',
  'General AC Service',
  'Gas Refilling Service',
  'AC Check-up & Diagnosis',
  'AC Installation',
  'AC Uninstallation'
)
WHERE LOWER(TRIM(name)) = 'ac' AND is_active = true;

UPDATE services 
SET sub_services = jsonb_build_array(
  'Semi-Auto WM Check-up',
  'Top Load WM Check-up',
  'Front Load WM Check-up',
  'Top Load Normal Cleaning',
  'Top Load Deep Cleaning',
  'Front Load Normal Cleaning',
  'Front Load Deep Cleaning'
)
WHERE LOWER(TRIM(name)) LIKE '%washing%machine%' AND is_active = true;

UPDATE services 
SET sub_services = jsonb_build_array(
  'RO Purifier Check-up',
  'RO Annual Care Plan (12 Months)',
  'Standard RO Service'
)
WHERE LOWER(TRIM(name)) IN ('ro', 'ro service', 'water purifier') AND is_active = true;

UPDATE services 
SET sub_services = jsonb_build_array(
  'Microwave Check-up',
  'Magnetron Replacement',
  'Microwave PCB Service'
)
WHERE LOWER(TRIM(name)) LIKE '%microwave%' AND is_active = true;

UPDATE services 
SET sub_services = jsonb_build_array(
  'Geyser Installation',
  'Geyser Uninstallation',
  'Geyser Check-up & Diagnosis'
)
WHERE LOWER(TRIM(name)) LIKE '%geyser%' AND is_active = true;

UPDATE services 
SET sub_services = jsonb_build_array(
  'Chimney Check-up',
  'Chimney Installation',
  'Chimney Uninstallation',
  'Chimney Normal Cleaning',
  'Chimney Deep Cleaning'
)
WHERE LOWER(TRIM(name)) LIKE '%chimney%' AND is_active = true;

UPDATE services 
SET sub_services = jsonb_build_array(
  'Fridge Check-up & Diagnosis',
  'Single Door Fridge Gas Charging',
  'Double Door Fridge Gas Charging',
  'Side-by-Side (Almirah) Fridge Check-up'
)
WHERE LOWER(TRIM(name)) IN ('fridge', 'refrigerator') AND is_active = true;

UPDATE services 
SET sub_services = jsonb_build_array(
  'Air Cooler Check-up',
  'Cooler Pad Replacement'
)
WHERE LOWER(TRIM(name)) LIKE '%cooler%' AND is_active = true;

-- Verify updates were successful
SELECT id, name, sub_services FROM services WHERE is_active = true ORDER BY name;
