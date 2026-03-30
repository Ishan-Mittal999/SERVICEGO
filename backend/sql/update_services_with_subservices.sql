-- Add sub_services column if it doesn't exist
ALTER TABLE services
ADD COLUMN IF NOT EXISTS sub_services jsonb DEFAULT '[]'::jsonb;

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
WHERE name IN ('AC', 'AC Service') AND is_active = true;

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
WHERE name = 'Washing Machine' AND is_active = true;

UPDATE services 
SET sub_services = jsonb_build_array(
  'RO Purifier Check-up',
  'RO Annual Care Plan (12 Months)',
  'Standard RO Service'
)
WHERE name IN ('RO', 'RO Service') AND is_active = true;

UPDATE services 
SET sub_services = jsonb_build_array(
  'Microwave Check-up',
  'Magnetron Replacement',
  'Microwave PCB Service'
)
WHERE name = 'Microwave' AND is_active = true;

UPDATE services 
SET sub_services = jsonb_build_array(
  'Geyser Installation',
  'Geyser Uninstallation',
  'Geyser Check-up & Diagnosis'
)
WHERE name = 'Geyser' AND is_active = true;

UPDATE services 
SET sub_services = jsonb_build_array(
  'Chimney Check-up',
  'Chimney Installation',
  'Chimney Uninstallation',
  'Chimney Normal Cleaning',
  'Chimney Deep Cleaning'
)
WHERE name = 'Chimney' AND is_active = true;

UPDATE services 
SET sub_services = jsonb_build_array(
  'Fridge Check-up & Diagnosis',
  'Single Door Fridge Gas Charging',
  'Double Door Fridge Gas Charging',
  'Side-by-Side (Almirah) Fridge Check-up'
)
WHERE name = 'Fridge' AND is_active = true;

UPDATE services 
SET sub_services = jsonb_build_array(
  'Air Cooler Check-up',
  'Cooler Pad Replacement'
)
WHERE name = 'Cooler' AND is_active = true;

-- Verify updates were successful
SELECT id, name, sub_services FROM services WHERE is_active = true ORDER BY name;
