# Service & Subservices Update Guide

## Overview
Your services and subservices have been configured with the following structure:

### Services and Subservices Mapping

#### 1. AC Service
- AC Foam Jet Service
- General AC Service
- Gas Refilling Service
- AC Check-up & Diagnosis
- AC Installation
- AC Uninstallation

#### 2. Washing Machine
- Semi-Auto WM Check-up
- Top Load WM Check-up
- Front Load WM Check-up
- Top Load Normal Cleaning
- Top Load Deep Cleaning
- Front Load Normal Cleaning
- Front Load Deep Cleaning

#### 3. RO (Water Purifier)
- RO Purifier Check-up
- RO Annual Care Plan (12 Months)
- Standard RO Service

#### 4. Microwave
- Microwave Check-up
- Magnetron Replacement
- Microwave PCB Service

#### 5. Geyser
- Geyser Installation
- Geyser Uninstallation
- Geyser Check-up & Diagnosis

#### 6. Chimney
- Chimney Check-up
- Chimney Installation
- Chimney Uninstallation
- Chimney Normal Cleaning
- Chimney Deep Cleaning

#### 7. Fridge
- Fridge Check-up & Diagnosis
- Single Door Fridge Gas Charging
- Double Door Fridge Gas Charging
- Side-by-Side (Almirah) Fridge Check-up

#### 8. Cooler
- Air Cooler Check-up
- Cooler Pad Replacement

## How to Apply Updates

### Method 1: Admin Endpoint (Recommended)
Call the admin endpoint with your admin token:

```bash
curl -X POST http://localhost:5000/admin/update-services-subservices \
  -H "x-admin-token: admin-servicego-update" \
  -H "Content-Type: application/json"
```

Response will include:
- Update results for each service
- Verification of all services with their new sub_services

### Method 2: Direct SQL
Run the SQL migration:
```
backend/sql/update_services_with_subservices.sql
```

### Method 3: Manual Supabase Update
- Go to Supabase Dashboard
- Open the `services` table
- Edit the `sub_services` column for each service with the values from the mapping above

## Next Steps
1. After applying updates, the frontend will automatically display the new subservices
2. Update service images in the next phase (as you mentioned)
3. Vendor subservice pricing can be configured per vendor in the vendor dashboard

## Notes
- The `sub_services` field is stored as JSON array in the database
- Frontend respects database-stored sub_services over predefined mappings
- Cache is automatically invalidated after updates
- All operations maintain service active status
