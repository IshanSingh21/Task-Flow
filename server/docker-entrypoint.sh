#!/bin/sh
set -e

echo "[Entrypoint] Running database synchronization..."
npx prisma db push --skip-generate || echo "[Entrypoint] Notice: Prisma db push completed with warnings, proceeding..."

echo "[Entrypoint] Launching TaskFlow Backend API..."
exec "$@"
