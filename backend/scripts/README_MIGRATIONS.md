# Database Migrations

## Regional Manager Column Migration

To add the `regional_manager_id` column to the regions table, run:

```sql
ALTER TABLE regions ADD COLUMN regional_manager_id UUID REFERENCES users(id) ON DELETE SET NULL;
```

Or use the Node.js migration script:

```bash
cd backend
node scripts/add_regional_manager_column.js
```

## What This Migration Does

- Adds a `regional_manager_id` column to the `regions` table
- Creates a foreign key relationship to the `users` table
- Sets the column to NULL when the referenced user is deleted
- Enables regional manager assignment functionality in the Region Management interface

## After Migration

Once the migration is complete, the Region Management page will:
- Show regional managers in the dropdown
- Allow assigning regional managers to regions
- Display assigned regional managers in the regions table
- Handle regional manager updates and assignments
