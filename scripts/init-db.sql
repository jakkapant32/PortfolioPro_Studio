-- PortfolioPro Studio local database setup
-- Run: psql -h localhost -p 5432 -U postgres -f scripts/init-db.sql

SELECT 'CREATE DATABASE portfoliopro'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'portfoliopro')\gexec
