# @workspace/database

Database package for the pharma-inventory application using Drizzle ORM with PostgreSQL (Neon).

## Environment Configuration

This package uses a flexible environment loading strategy to find the required `DATABASE_URL` variable:

### Environment Loading Priority

1. **Custom path via `DB_ENV_PATH`** - Set this environment variable to specify a custom .env file location
2. **Monorepo root `.env`** - Place `.env` file at project root (recommended for shared configuration)
3. **Web app `.env.local`** - Legacy fallback to `apps/web/.env.local`
4. **System environment variables** - Direct environment variable access

### Setup Options

#### Option 1: Monorepo Root (Recommended)
```bash
# Create .env at project root
echo 'DATABASE_URL="postgresql://user:password@host:5432/database"' > ../../.env
```

#### Option 2: Custom Path
```bash
# Set custom env file location
export DB_ENV_PATH="/path/to/your/.env"
pnpm db:push
```

#### Option 3: System Environment
```bash
# Set directly in environment
export DATABASE_URL="postgresql://user:password@host:5432/database"
pnpm db:push
```

## Available Scripts

- `pnpm db:generate` - Generate migration files from schema changes
- `pnpm db:push` - Push schema changes to database
- `pnpm db:studio` - Open Drizzle Studio for database inspection
- `pnpm db:seed` - Populate database with Ghana pharmaceutical data
- `pnpm db:reset` - Drop all tables (destructive operation)
- `pnpm db:create` - Create tables using raw SQL
- `pnpm type-check` - Run TypeScript type checking

## Schema Overview

### Tables

- **drugs** - Pharmaceutical products with Ghana-specific data
- **inventory** - Stock tracking and movement records

### Key Features

- Proper foreign key relationships
- Composite indexes for performance
- Ghana-specific pharmaceutical data
- Type-safe database operations
- Comprehensive seed data (10 essential medicines)

## Error Handling

The package includes comprehensive error handling:
- Clear error messages for missing environment variables
- Helpful setup instructions in error outputs
- Validation before database operations

## Usage in Applications

```typescript
import { createDatabaseClient, drugs } from '@workspace/database'

const db = createDatabaseClient(process.env.DATABASE_URL!)
const allDrugs = await db.select().from(drugs)
```