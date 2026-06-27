#!/bin/sh
set -eu

DB_PATH="${FOSSNOTE_DATABASE_PATH:-/data/database.db}"
DB_DIR="$(dirname "$DB_PATH")"

mkdir -p "$DB_DIR"
touch "$DB_PATH"
ln -sf "$DB_PATH" /app/database.db

if [ "${FOSSNOTE_SEED_ON_START:-1}" = "1" ]; then
  npm run seed
fi

exec "$@"
