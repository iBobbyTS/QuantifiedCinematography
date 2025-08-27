# Database Scripts

This directory contains database initialization and seeding scripts.

## Files

### `init.sql`
Raw SQL script for initializing the database with basic data. This script:
- Inserts a "None" product type (id: 0)
- Inserts a "None" brand (id: 0) 
- Inserts a "None" product series (id: 0, linked to the above)
- Resets sequences to start from 1 for future inserts

### `seed.ts`
TypeScript seeding script using Drizzle ORM. This script:
- Inserts the same basic data as `init.sql`
- Uses proper error handling and logging
- Can be run directly or imported as a module
- Automatically resets sequences

## Usage

### Option 1: Run SQL script directly
```bash
# Connect to your PostgreSQL database and run:
psql -d quantified_cinematography -f src/db/init.sql
```

### Option 2: Run TypeScript seed script
```bash
# Using Bun
bun run src/db/seed.ts

# Using Node.js
node src/db/seed.ts
```

### Option 3: Import and use in code
```typescript
import { seed, resetSequences } from './db/seed.js';

// Seed the database
await seed();

// Reset sequences separately if needed
await resetSequences();
```

## What gets inserted

| Table | ID | Name | Description |
|-------|----|------|-------------|
| `product_types` | 0 | None | Default product type for unassigned products |
| `brands` | 0 | None | Default brand for unassigned products |
| `product_series` | 0 | None | Default series linking the above two |

## Sequence Reset

After inserting the basic data with ID 0, the sequences are reset to start from 1. This ensures that:
- New records get IDs starting from 1
- The "None" records remain at ID 0
- No conflicts occur with auto-generated IDs

## Notes

- The script uses `onConflictDoNothing()` to prevent duplicate insertions
- All timestamps are set to the current time
- The script is idempotent - it can be run multiple times safely
- Use this script after creating the database tables but before inserting any real data
