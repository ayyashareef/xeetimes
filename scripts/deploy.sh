#!/usr/bin/env bash
# Runs ON the droplet (called by .github/workflows/deploy.yml after rsync).
# Installs deps, applies schema, builds, and hot-reloads the pm2 process.
set -euo pipefail

cd /var/www/hirinews
export NODE_OPTIONS=--max-old-space-size=2048
export NEXT_TELEMETRY_DISABLED=1

npm ci --no-audit --no-fund
npx prisma generate
# Non-destructive schema sync (fails safely if a change would drop data).
npx prisma db push --skip-generate
npm run build

if pm2 describe hiri >/dev/null 2>&1; then
  pm2 reload hiri --update-env
else
  PORT=3000 pm2 start npm --name hiri -- start
fi
pm2 save

echo "deploy done: $(date -u)"
