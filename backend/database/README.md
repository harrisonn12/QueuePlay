# Database Setup for Coupon Auto-Expiration

## Overview
This directory contains database migrations and functions to implement automatic coupon cleanup using pg_cron.

## Setup Instructions

### 1. Enable pg_cron Extension
Run this in your Supabase SQL editor (requires admin privileges):
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### 2. Apply Migration
Execute the migration file in order:
```bash
# In Supabase SQL editor, run:
\i backend/database/migrations/001_setup_pg_cron_coupon_cleanup.sql
```

### 3. Create Supporting Functions
```bash
# In Supabase SQL editor, run:
\i backend/database/functions/get_expired_coupons.sql
```

## Features

### Automatic Cleanup
- **Schedule**: Every 2 hours at minute 0 (configurable)
- **Function**: `cleanup_expired_coupons()`
- **Target**: Coupons where `expirationDate < NOW()`

### Manual Operations
```python
# Get expired coupons
expired = couponsDatabase.getExpiredCoupons()

# Manual cleanup
deleted_count = couponsDatabase.cleanupExpiredCoupons()

# View cleanup stats
stats = couponsDatabase.getCleanupStats()
```

### Monitoring
- **Log Table**: `coupon_cleanup_log` tracks all cleanup runs
- **Stats View**: `coupon_cleanup_stats` provides aggregated statistics
- **Cron Jobs**: Check `cron.job` table for job status

## Management Commands

### View Active Cron Jobs
```sql
SELECT * FROM cron.job WHERE jobname = 'coupon-auto-cleanup';
```

### Modify Schedule
```sql
-- Change to run every hour
SELECT cron.alter_job('coupon-auto-cleanup', schedule => '0 * * * *');
```

### Disable/Enable Job
```sql
-- Disable
SELECT cron.unschedule('coupon-auto-cleanup');

-- Re-enable
SELECT cron.schedule('coupon-auto-cleanup', '0 */2 * * *', 'SELECT cleanup_expired_coupons();');
```

### Manual Cleanup
```sql
SELECT cleanup_expired_coupons();
```

## Troubleshooting

### Check Job Execution
```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'coupon-auto-cleanup')
ORDER BY start_time DESC;
```

### View Cleanup History
```sql
SELECT * FROM coupon_cleanup_log ORDER BY cleanup_date DESC LIMIT 10;
```

### Performance Index
```sql
-- Verify index exists
\d coupons
-- Should show: idx_coupons_expiration_date
```

## Security Notes
- pg_cron requires superuser privileges to install
- Cleanup function runs with database user permissions
- All operations are logged for audit purposes