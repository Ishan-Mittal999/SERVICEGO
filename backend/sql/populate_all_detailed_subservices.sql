-- Complete Detailed Subservices Migration
-- Stores all service details: What's Included, What's NOT Included, Notes

-- AC Service - Already partially in previous file, here's the complete version
UPDATE services 
SET sub_services = jsonb_build_array(
  jsonb_build_object('name', 'AC Foam Jet Service', 'included', '["Deep Foam Wash","High-Pressure Jet Cleaning","Filter & Grill Sanitation","Drainage Clearance","Performance Check"]'::jsonb, 'notIncluded', '["Spare Part Replacements","Gas Charging","Major Leakage Repair","Structural Masonry Work","Scaffolding"]'::jsonb, 'note', 'Ensure working power connection and water supply available'),
  jsonb_build_object('name', 'General AC Service', 'included', '["Air Filter & Mesh Cleaning","Cooling Coil Brushing","Outdoor Unit Cleaning","Drain Tray & Pipe Check","Complete System Diagnostic"]'::jsonb, 'notIncluded', '["Chemical/Foam Treatment","Gas Leakage Repair","PCB or Remote Repair","Wall/Paint Restoration","Duct Cleaning"]'::jsonb, 'note', 'For units 6+ months old, recommend Foam Jet Service'),
  jsonb_build_object('name', 'Gas Refilling Service', 'included', '["Complete Pressure Check","Leakage Detection","System Vacuuming","Full Gas Recharge","Current/Amperage Monitoring"]'::jsonb, 'notIncluded', '["Replacement of Copper Pipes","Compressor Replacement","Condenser/Evaporator Coil Replacement","Indoor Unit Deep Cleaning","Electrical Stabilizer Repair"]'::jsonb, 'note', '30-day cooling guarantee on full gas refilling services'),
  jsonb_build_object('name', 'AC Check-up & Diagnosis', 'included', '["Complete System Audit","Gas Pressure Measurement","Electrical Health Check","Amperage & Voltage Test","Repair Estimation"]'::jsonb, 'notIncluded', '["Repair or Part Replacement","Free Gas Topping","Cleaning or Washing","Tool/Ladder Provision","Follow-up Visits"]'::jsonb, 'note', 'Diagnosis Fee Waiver if you proceed with repair same visit'),
  jsonb_build_object('name', 'AC Installation', 'included', '["Indoor Unit Mounting","Outdoor Unit Placement","Standard Pipe Connection (3m)","Flare Nut Tightening","Vacuuming & Commissioning","Instructional Demo"]'::jsonb, 'notIncluded', '["Extra Copper Pipe Cost","Outdoor Wall Brackets","Core Drilling","Drain Pipe Extension","Power Point Installation","Old AC Uninstallation"]'::jsonb, 'note', 'Ensure building permissions for outdoor unit placement obtained'),
  jsonb_build_object('name', 'AC Uninstallation', 'included', '["Gas Pump Down","Indoor & Outdoor Unit Removal","Pipe & Wire Management","Flare Nut Protection","Bracket Removal"]'::jsonb, 'notIncluded', '["Transportation","Packing Materials","Wall Patching","Old Material Disposal","High-Altitude Reach"]'::jsonb, 'note', 'Ensure AC working before Gas Pump Down to avoid gas loss')
)
WHERE name = 'AC Service' AND is_active = true;

-- Washing Machine Services
UPDATE services 
SET sub_services = jsonb_build_array(
  jsonb_build_object('name', 'Semi-Auto WM Check-up', 'included', '["Dual-Motor Performance Test","Mechanical Timer Audit","Belt & Pulley Tension Check","Capacitor Health Check","Drainage System Inspection","Wiring & Rodent Damage Scan"]'::jsonb, 'notIncluded', '["Actual Repair Work","Spare Parts Cost","Washing Machine Cleaning","Lifting/Moving Machine","Rat-Proofing Mesh"]'::jsonb, 'note', 'Check-up fee waived if you choose repair through ServiceGo immediately'),
  jsonb_build_object('name', 'Top Load WM Check-up', 'included', '["Digital Controller Audit","Sensor Calibration Check","Inlet & Drain Valve Test","Drum Balance & Suspension Scan","Motor & Capacitor Health","Agitator/Pulsator Inspection"]'::jsonb, 'notIncluded', '["Repair or Part Replacement","PCB Repair/Recoding","Internal Tub Descaling","Rat-Mesh Installation","Plumbing/Tap Fixes"]'::jsonb, 'note', 'Top Load error codes (E1, dE, PE) decoded and explained'),
  jsonb_build_object('name', 'Front Load WM Check-up', 'included', '["Error Code Diagnosis","Inverter Motor & Carbon Brush Check","Door Bellow Inspection","Heating Element & NTC Test","Suspension & Bearing Audit","Drain Pump & Filter Scan"]'::jsonb, 'notIncluded', '["Actual Repair or Part Cost","Drum/Bearing Replacement","PCB Motherboard Repair","Door Gasket Replacement","Internal Descaling"]'::jsonb, 'note', 'Expert verifies machine leveling to prevent future vibration damage'),
  jsonb_build_object('name', 'Top Load Normal Cleaning', 'included', '["Lint Filter Deep Clean","Detergent Drawer Sanitization","Pulsator Surface Cleaning","Inner Drum Scrubbing","Eco-Tub Wash Cycle","Outer Body Wipe-down"]'::jsonb, 'notIncluded', '["Full Drum Dismantling","Repair of Mechanical Parts","Inlet/Drain Pipe Replacement","Rat-Mesh Installation","Major Descaling"]'::jsonb, 'note', 'Single normal cleaning may not remove 100% crust if heavily scaled'),
  jsonb_build_object('name', 'Top Load Deep Cleaning', 'included', '["Full Drum Dismantling","High-Pressure Jet Wash","Pulsator Deep Scrub","Tub-in-Tub Sanitization","Drain Pump & Filter Clear-out","Re-balancing & Calibration"]'::jsonb, 'notIncluded', '["Mechanical Repairs","Replacement of Rusted Parts","Inlet/Outlet Pipe Material","Body Dent/Paint Repair","Rat-Mesh Installation"]'::jsonb, 'note', 'Takes 90-120 minutes. Ensure continuous water supply and floor drain'),
  jsonb_build_object('name', 'Front Load Normal Cleaning', 'included', '["Rubber Gasket Sanitization","Drain Pump Filter Clear-out","Detergent Drawer Deep Clean","Inner Drum Surface Polish","High-Temp Descaling Cycle","Glass Door & Panel Wipe"]'::jsonb, 'notIncluded', '["Full Drum Extraction","Gasket/Seal Replacement","Bearing or Motor Repair","Inlet Water Filter Cleaning","Plumbing/Drainage Fixes"]'::jsonb, 'note', 'Does not involve pulling heavy drum out of machine'),
  jsonb_build_object('name', 'Front Load Deep Cleaning', 'included', '["Major Teardown Service","Complete Drum Extraction","High-Pressure Chemical Wash","Bellow Deep Scrub","Drain Pump & Manifold Cleaning","Re-assembly & Leveling"]'::jsonb, 'notIncluded', '["Bearing or Spider Replacement","Repair of Mechanical/Electronic Faults","Gasket/Seal Replacement","Body Rust/Paint Restoration","Plumbing/Tap Fixes"]'::jsonb, 'note', 'Takes 2-3 hours. Ensure dedicated workspace and water supply')
)
WHERE name = 'Washing Machine' AND is_active = true;

-- RO Services
UPDATE services 
SET sub_services = jsonb_build_array(
  jsonb_build_object('name', 'RO Purifier Check-up', 'included', '["TDS Level Testing","Filter Health Audit","Membrane Performance Check","Pump & Adapter Inspection","Auto-Shutoff & Float Valve Test","Leakage & Internal Pipe Scan"]'::jsonb, 'notIncluded', '["Filter or Membrane Replacement","Tank Internal Sanitization","External Pre-Filter Housing","Plumbing/Tap Modification","UV/UF Bulb Replacement"]'::jsonb, 'note', 'Professional TDS testing ensures water safety'),
  jsonb_build_object('name', 'RO Annual Care Plan (12 Months)', 'included', '["Unlimited breakdown support","2x Full Internal Filter Service","4x External Pre-Filter Changes","TDS & Water Quality Monitoring","Booster Pump & SMPS Check","Tank Sanitization"]'::jsonb, 'notIncluded', '["RO Membrane Replacement","Physical Damage to Body","Relocation Service","UV Lamp/UF Membrane","External Pressure Pump"]'::jsonb, 'note', 'Comprehensive 12-month coverage for continuous protection'),
  jsonb_build_object('name', 'Standard RO Service', 'included', '["Digital TDS Calibration","External Pre-Filter Replacement","Pre-Filter Housing Cleaning","System Leakage Test","Flow Rate Verification"]'::jsonb, 'notIncluded', '["Internal Filter Replacement","RO Membrane Change","Electrical Part Replacement","Tank Deep Cleaning","Relocation/Uninstallation"]'::jsonb, 'note', 'External filter service with basic system check')
)
WHERE name = 'RO Service' AND is_active = true;

-- Microwave Services
UPDATE services 
SET sub_services = jsonb_build_array(
  jsonb_build_object('name', 'Microwave Check-up', 'included', '["Heating Efficiency Test","Turntable & Motor Audit","Door Lock & Sensor Scan","Keypad & Display Diagnostic","Cooling Fan & Vent Inspection","Sparking & Arcing Analysis"]'::jsonb, 'notIncluded', '["Repair or Part Replacement","Magnetron or Transformer Replacement","Internal Deep Cleaning","Glass Plate Replacement","Body/Cabinet Painting"]'::jsonb, 'note', 'Microwaves hold high voltage even unplugged. Expert handles safely'),
  jsonb_build_object('name', 'Magnetron Replacement', 'included', '["High-Voltage Discharge","Magnetron Diagnosis","Genuine Part Installation","Mica Sheet Inspection","Post-Installation Heating Test","Safety Leakage Test"]'::jsonb, 'notIncluded', '["Cost of Magnetron","High-Voltage Transformer Repair","Turntable Motor Fix","Touchpad/PCB Repair","Cavity Rust Treatment"]'::jsonb, 'note', 'Only Brand-Authorized or High-Grade compatible magnetrons used'),
  jsonb_build_object('name', 'Microwave PCB Service', 'included', '["Circuit Diagnosis","Component-Level Repair","Micro-switch & Sensor Integration","Touchpad Connectivity Check","Voltage Stability Test","Post-Repair Calibration"]'::jsonb, 'notIncluded', '["Full PCB Replacement Cost","Magnetron or Transformer Repair","Touchpad/Membrane Replacement","Internal Cavity Cleaning","Safety Fuse Replacement"]'::jsonb, 'note', 'Complex repairs may require 24-48 hour turnaround at service center')
)
WHERE name = 'Microwave' AND is_active = true;

-- Geyser Services
UPDATE services 
SET sub_services = jsonb_build_array(
  jsonb_build_object('name', 'Geyser Installation', 'included', '["Wall Mounting & Drilling","Inlet & Outlet Connections","Electrical Wiring","Leakage Testing","Thermostat Calibration","Safety Valve Inspection"]'::jsonb, 'notIncluded', '["Cost of Spare Parts","New Electrical Point","Fresh Plumbing Work","Old Geyser Uninstallation","Core Drilling"]'::jsonb, 'note', 'Use ISI-marked connection pipes for safety at high temperature/pressure'),
  jsonb_build_object('name', 'Geyser Uninstallation', 'included', '["Safe Power Disconnection","Water Tank Drainage","Inlet/Outlet Dismantling","Wall Mounting Removal","Pipe & Valve Management"]'::jsonb, 'notIncluded', '["Transportation","Wall Hole Patching","Plumbing Modifications","Old Bracket Removal","Disposal of Old Geyser"]'::jsonb, 'note', 'Switch off geyser 30 min before arrival for safe drainage'),
  jsonb_build_object('name', 'Geyser Check-up & Diagnosis', 'included', '["Heating Element Audit","Thermostat & Auto-Cutoff Test","Tank Leakage Inspection","Electrical Safety Scan","Pressure Release Valve Check","Scaling Assessment"]'::jsonb, 'notIncluded', '["Actual Repair Work","Cost of Spare Parts","Tank Descaling/Cleaning","Plumbing/Wall Pipe Fixes","Re-installation"]'::jsonb, 'note', 'Check-up fee waived if repair done during same visit')
)
WHERE name = 'Geyser' AND is_active = true;

-- Chimney Services
UPDATE services 
SET sub_services = jsonb_build_array(
  jsonb_build_object('name', 'Chimney Installation', 'included', '["Wall Mounting & Leveling","Chimney Unit Fitting","Standard Duct Connection","External Hole Connectivity","Suction & Speed Test","Baffle/Filter Fitment"]'::jsonb, 'notIncluded', '["Cost of Duct Pipe & Cowl","Core Cutting (Wall Hole)","Extra Duct Length","Electrical Point Installation","Old Chimney Uninstallation","Cabinet Cutting"]'::jsonb, 'note', 'Maintain proper distance from cooktop per manufacturer manual'),
  jsonb_build_object('name', 'Chimney Uninstallation', 'included', '["Safe Electrical Disconnect","Duct Pipe Removal","Filter & Oil Collector Removal","Wall Mounting Removal","Bracket Dismantling"]'::jsonb, 'notIncluded', '["Transportation","Wall Hole Sealing","Deep Cleaning","Cabinet Repair","Cowl Removal"]'::jsonb, 'note', 'Place plastic sheet on cooktop to catch accidental oil drips'),
  jsonb_build_object('name', 'Chimney Check-up', 'included', '["Suction Power Test","Baffle/Charcoal Filter Audit","Motor & Capacitor Health","Ducting Inspection","Control Panel Diagnostic","Auto-Clean Function Test"]'::jsonb, 'notIncluded', '["Actual Repair or Part Cost","Filter Degreasing/Cleaning","Cost of Spare Parts","Duct Pipe Replacement","Wall Core-Cutting"]'::jsonb, 'note', 'Loud humming without smoke suction = likely capacitor or motor issue'),
  jsonb_build_object('name', 'Chimney Normal Cleaning', 'included', '["Filter Degreasing","Oil Collector Emptying","Outer Body Polishing","Visible Interior Wipe","Suction Verification","Lights & Control Check"]'::jsonb, 'notIncluded', '["Internal Blower/Motor Cleaning","Duct Pipe Cleaning","Charcoal Filter Replacement","Repair of Mechanical Faults","Wall/Cabinet Degreasing"]'::jsonb, 'note', 'Normal cleaning without internal motor/fan access'),
  jsonb_build_object('name', 'Chimney Deep Cleaning', 'included', '["Internal Blower & Fan Cleaning","Caustic/Chemical Degreasing","Baffle & Mesh Filter Deep Wash","Oil Collector & Tray Sanitization","Motor Health Check & Oiling","Full Exterior & Glass Polishing"]'::jsonb, 'notIncluded', '["Duct Pipe Internal Cleaning","Charcoal/Carbon Filter Replacement","PCB or Touch-panel Repair","Kitchen Wall/Tile Degreasing","Duct Pipe Replacement"]'::jsonb, 'note', 'Uses strong degreasing agents. Clear open food before service')
)
WHERE name = 'Chimney' AND is_active = true;

-- Fridge Services
UPDATE services 
SET sub_services = jsonb_build_array(
  jsonb_build_object('name', 'Fridge Check-up & Diagnosis', 'included', '["Cooling Efficiency Test","Compressor Health Audit","Gas Pressure Measurement","Thermostat & Sensor Scan","Defrost System Inspection","Door Gasket & Seal Test","Condenser Coil Check"]'::jsonb, 'notIncluded', '["Actual Repair or Gas Filling","Cost of Spare Parts","Internal Deep Cleaning","Stabilizer Repair","Body Dent/Paint Work"]'::jsonb, 'note', 'Keep fridge on 2 hours before visit for accurate cooling drop measurement'),
  jsonb_build_object('name', 'Single Door Fridge Gas Charging', 'included', '["Nitrogen Leak Testing","Leak Repair (Brazing)","System Vacuuming","Filter/Drier Replacement","Precision Gas Refilling","Post-Charging Cooling Test"]'::jsonb, 'notIncluded', '["Compressor Replacement","Internal Body Leakage","Electrical Part Replacement","Condenser Coil Replacement","Deep Cleaning"]'::jsonb, 'note', '30-Day Service Warranty on labor'),
  jsonb_build_object('name', 'Double Door Fridge Gas Charging', 'included', '["Nitrogen Leak Detection","Brazing & Leak Repair","Complete System Vacuuming","Filter/Drier Replacement","Precision Gas Refilling","Airflow & Fan Test","Defrost System Check"]'::jsonb, 'notIncluded', '["Compressor Replacement","Defrost Component Parts","Internal Cabinet Leaks","Fan Motor Replacement","Inverter PCB Repair"]'::jsonb, 'note', 'Takes 90-120 min. Optimal cooling reached in 4-6 hours'),
  jsonb_build_object('name', 'Side-by-Side (Almirah) Fridge Check-up', 'included', '["Dual Cooling Zone Audit","Inverter Compressor Diagnostic","Multi-Fan Airflow Scan","Damper Control Test","Sensor & Thermistor Calibration","Water Dispenser & Ice Maker Scan","Condenser Fan & Coil Cleaning"]'::jsonb, 'notIncluded', '["Actual Repair or Gas Filling","Cost of Spare Parts","Internal Water Filter","PCB Repair/Recoding","Deep Cleaning"]'::jsonb, 'note', 'Recommend dedicated 2kVA Stabilizer for these units')
)
WHERE name = 'Fridge' AND is_active = true;

-- Cooler Services
UPDATE services 
SET sub_services = jsonb_build_array(
  jsonb_build_object('name', 'Air Cooler Check-up', 'included', '["Motor & Capacitor Audit","Submersible Pump Test","Water Distribution Scan","Electrical Safety & Earthing Test","Swing/Louver Motor Check","Fan Blade Alignment"]'::jsonb, 'notIncluded', '["Actual Repair or Part Cost","Cooling Pad Replacement","Deep Cleaning/Tank Scrubbing","Paint or Body Patching","Float Valve Installation"]'::jsonb, 'note', 'If burning smell or grinding noise: switch off immediately to prevent motor burnout'),
  jsonb_build_object('name', 'Cooler Pad Replacement', 'included', '["Old Pad Removal","Grill & Frame Cleaning","Precision Fitting","Water Distributor Alignment","Mesh/Net Securing","Post-Fit Suction Test"]'::jsonb, 'notIncluded', '["Cost of the Pads","Main Motor or Pump Repair","Tank Deep Cleaning","Painting/Anti-Rust Coating","Electrical Plug/Wire Repair"]'::jsonb, 'note', 'New pads charged extra unless user provides them')
)
WHERE name = 'Cooler' AND is_active = true;

-- Verify all services updated with detailed information
SELECT name, jsonb_array_length(sub_services) as subservice_count,
       CASE 
         WHEN sub_services @> '[{"included":""}]' THEN 'Detailed'
         ELSE 'Check manually'
       END as data_type
FROM services 
WHERE is_active = true 
ORDER BY name;
