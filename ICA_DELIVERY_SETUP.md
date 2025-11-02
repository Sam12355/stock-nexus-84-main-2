# ICA Delivery Setup Instructions

## Database Migration Required

You need to run this SQL script in your Supabase SQL Editor to add the `user_id` column to the `ica_delivery` table:

```sql
-- Add user_id column to ica_delivery table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ica_delivery' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE ica_delivery ADD COLUMN user_id INTEGER;
    END IF;
END $$;

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_ica_delivery_user_id ON ica_delivery(user_id);
```

## Steps to Run:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on "SQL Editor" in the left sidebar
4. Click "New Query"
5. Copy and paste the SQL script above
6. Click "Run" or press Cmd+Enter (Mac) / Ctrl+Enter (Windows)

## Features Implemented

### 1. Duplicate Prevention
- Users cannot submit multiple times for the same time period (Morning/Afternoon) on the same day
- Error message shows: "<username> has already submitted the delivery"

### 2. Edit Within 1 Hour
- Users can edit their submission within 1 hour of submission
- After 1 hour, the edit option is no longer available
- Form auto-populates with existing data when editing

### 3. ICA Delivery List (Manager/Assistant Manager Only)
- New menu item "ICA Delivery" appears below "Stock Out"
- View all submissions with date filtering
- Export options:
  - **PDF**: Download as PDF report
  - **Excel**: Download as spreadsheet
  - **Print**: Print directly from browser
- Calendar date picker to filter by specific date
- Grouped display by user and time of day

## User Workflow

### For Staff Users:
1. Click "ICA Delivery" button next to "Generate Moveout List"
2. Use preset tags for quick form filling or enter manually
3. Fill in amounts for each type (Normal, Combo, Vegan, Salmon Avocado, Wakame)
4. Select Time of the Day (Morning/Afternoon)
5. Submit
6. **Edit**: If within 1 hour, can reopen and edit their submission

### For Managers/Assistant Managers:
1. Go to "ICA Delivery" menu item (below Stock Out)
2. Use date picker to select date
3. View all submissions grouped by user
4. Export as PDF, Excel, or Print

## Technical Details

### Backend Routes:
- `GET /api/ica-delivery?date=YYYY-MM-DD` - Fetch records by date
- `GET /api/ica-delivery/my-submissions` - Get current user's today's submissions
- `POST /api/ica-delivery` - Create new submission (with duplicate check)
- `PUT /api/ica-delivery/:id` - Edit submission (only within 1 hour)

### Database Schema:
```sql
ica_delivery table:
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER) -- NEW COLUMN
- user_name (VARCHAR)
- type (VARCHAR)
- amount (INTEGER)
- time_of_day (VARCHAR)
- submitted_at (TIMESTAMP)
- created_at (TIMESTAMP)
```

## Notes
- The transparent glass effect is applied throughout the modal
- "Time of Day" label changed to "Time of the Day"
- All changes are deployed and live after running the SQL migration
