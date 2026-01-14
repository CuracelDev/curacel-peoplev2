#!/bin/bash
set -e

echo "🛑 Stopping app..."
docker compose -f docker-compose.deploy.yml stop app

echo "🔌 Terminating database connections..."
docker exec curacel-people-db-v2 psql -U curacel -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'curacel_people' AND pid <> pg_backend_pid();" || true

echo "🗑️ Dropping database..."
docker exec curacel-people-db-v2 psql -U curacel -d postgres -c "DROP DATABASE IF EXISTS curacel_people;"

echo "📦 Creating new database..."
docker exec curacel-people-db-v2 psql -U curacel -d postgres -c "CREATE DATABASE curacel_people;"

echo "📥 Importing SQL file..."
docker exec -i curacel-people-db-v2 psql -U curacel -d curacel_people < curacel_people_export.sql

echo "🚀 Starting app..."
docker compose -f docker-compose.deploy.yml start app

echo "✅ Database import complete!"
