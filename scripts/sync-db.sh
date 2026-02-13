#!/bin/bash
set -e

# Configuration
# Replace these with your actual production details
PROD_SSH_USER="ubuntu"
PROD_SSH_HOST="[PRODUCTION_IP_DO_NOT_COMMIT]" 
PROD_CONTAINER_NAME="curacel-people-db-v2"  # Verify this on prod
DB_USER="postgres"
DB_NAME="curacel_people"

# Staging details (from your current setup)
STAGING_SSH_USER="ubuntu"
STAGING_SSH_HOST="compliance" # Or IP
STAGING_CONTAINER_NAME="curacel-people-db-v2"

echo "⚠️  This will OVERWRITE the Staging database with Production data."
read -p "Are you sure? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

echo "Detailed steps:"
echo "1. Dump Production DB"
echo "2. Transfer to Staging"
echo "3. Restore to Staging DB"

# 1. Dump Production DB
echo "📦 Dumping Production Database..."
# We use docker exec to run pg_dump inside the container
ssh ${PROD_SSH_USER}@${PROD_SSH_HOST} "docker exec -t ${PROD_CONTAINER_NAME} pg_dump -U ${DB_USER} -c ${DB_NAME}" > prod_dump.sql

if [ ! -s prod_dump.sql ]; then
    echo "❌ Dump failed or file is empty."
    rm prod_dump.sql
    exit 1
fi

# 2. Transfer to Staging
echo "🚀 Transferring dump to Staging..."
scp prod_dump.sql ${STAGING_SSH_USER}@${STAGING_SSH_HOST}:~/prod_dump.sql

# 3. Restore to Staging
echo "mV Restoring to Staging Database..."
# We pipe the file into docker exec psql
ssh ${STAGING_SSH_USER}@${STAGING_SSH_HOST} "cat ~/prod_dump.sql | docker exec -i ${STAGING_CONTAINER_NAME} psql -U ${DB_USER} ${DB_NAME}"

# Cleanup
rm prod_dump.sql
ssh ${STAGING_SSH_USER}@${STAGING_SSH_HOST} "rm ~/prod_dump.sql"

echo "✅ Database Sync Complete!"
