#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="${ROOT_DIR}/apps/api-laravel"

if ! command -v composer >/dev/null 2>&1; then
  echo "composer not found"
  exit 1
fi

if [ -d "${TARGET_DIR}" ]; then
  echo "Directory already exists: ${TARGET_DIR}"
  exit 1
fi

echo "Creating Laravel project at ${TARGET_DIR}"
composer create-project laravel/laravel "${TARGET_DIR}"

cd "${TARGET_DIR}"
cp .env.example .env || true
php artisan key:generate

echo "Laravel bootstrap complete."
echo "Next:"
echo "1) Configure MySQL in apps/api-laravel/.env"
echo "2) php artisan migrate"
echo "3) php artisan serve --host=127.0.0.1 --port=8091"

