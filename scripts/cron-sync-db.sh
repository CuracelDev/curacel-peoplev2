#!/bin/bash
set -e

# Configuration
DB_HOST="34.145.99.193"
DB_USER="peopleos_user"
DB_PASS="P3ople0S_Secure_2026!"
PROD_DB="peopleos_production"
STAGING_DB="peopleos_staging"

# Logging setup
LOG_FILE="/home/ubuntu/db_sync.log"
echo "[$(date)] Starting DB sync: $PROD_DB -> $STAGING_DB" >> $LOG_FILE

# 1. Clear staging DB schema to ensure clean slate
echo "[$(date)] Dropping and recreating public schema in staging..." >> $LOG_FILE
export PGPASSWORD=$DB_PASS
psql -h $DB_HOST -U $DB_USER -d $STAGING_DB -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" >> $LOG_FILE 2>&1

# 2. Dump and Restore
echo "[$(date)] Dumping production and restoring to staging..." >> $LOG_FILE
pg_dump -h $DB_HOST -U $DB_USER --no-owner --no-privileges $PROD_DB | \
psql -h $DB_HOST -U $DB_USER $STAGING_DB >> $LOG_FILE 2>&1

echo "[$(date)] Sync complete!" >> $LOG_FILE
echo "-----------------------------------" >> $LOG_FILE
