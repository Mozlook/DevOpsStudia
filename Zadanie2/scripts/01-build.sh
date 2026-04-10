#!/bin/sh
set -e

cd "$(dirname "$0")/.."

docker build -t product-dashboard-backend:v1 ./backend
docker build -t product-dashboard-frontend:v1 ./frontend
