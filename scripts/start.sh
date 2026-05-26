#!/bin/sh
set -e

mkdir -p /app/data

echo "[startup] Syncing Prisma schema..."
npx prisma db push

echo "[startup] Checking seed data..."
node scripts/seed-if-empty.mjs

echo "[startup] Starting Next.js..."
npm start
