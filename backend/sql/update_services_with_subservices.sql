-- Add sub_services column if it doesn't exist
ALTER TABLE services
ADD COLUMN IF NOT EXISTS sub_services jsonb DEFAULT '[]'::jsonb;

-- Step 1: Rename AC Repair to AC Service
UPDATE services 
SET name = 'AC Service'
WHERE name = 'AC Repair' AND is_active = true;

-- Step 2: Deactivate services that are not in the new list
UPDATE services 
SET is_active = false
WHERE name IN ('Carpenter', 'Cleaning', 'Electrical', 'Plumbing') AND is_active = true;

-- Step 3: Create missing services if they don't exist
INSERT INTO services (name, description, is_active, sub_services)
SELECT * FROM (VALUES
  ('Washing Machine', 'Washing Machine Services', true, '[]'::jsonb),
  ('RO Service', 'RO Water Purifier Services', true, '[]'::jsonb),
  ('Microwave', 'Microwave Services', true, '[]'::jsonb),
  ('Geyser', 'Geyser/Water Heater Services', true, '[]'::jsonb),
  ('Chimney', 'Chimney Services', true, '[]'::jsonb),
  ('Fridge', 'Refrigerator Services', true, '[]'::jsonb),
  ('Cooler', 'Air Cooler Services', true, '[]'::jsonb)
) as new_services(name, description, is_active, sub_services)
WHERE NOT EXISTS (SELECT 1 FROM services WHERE services.name = new_services.name);

-- Step 4: Populate all services with their subservices

UPDATE services 
SET sub_services = jsonb_build_array(
  'AC Foam Jet Service',
  'General AC Service',
  'Gas Refilling Service',
  'AC Check-up & Diagnosis',
  'AC Installation',
  'AC Uninstallation'
)
WHERE name = 'AC Service' AND is_active = true;

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
WHERE name = 'RO Service' AND is_active = true;

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

-- Verify: Show all active services with their subservices
SELECT 'ACTIVE SERVICES' as status;
SELECT id, name, jsonb_array_length(sub_services) as subservice_count, sub_services FROM services WHERE is_active = true ORDER BY name;

-- Verify: Show deactivated services
SELECT 'DEACTIVATED SERVICES' as status;
SELECT id, name FROM services WHERE is_active = false;
