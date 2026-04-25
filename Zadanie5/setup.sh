#!/bin/bash
set -e

docker rm -f nginx backend front-only 2>/dev/null || true

docker pull ghcr.io/mozlook/product-dashboard-backend:v5
docker pull ghcr.io/mozlook/product-dashboard-frontend:v5

docker network inspect front-net >/dev/null 2>&1 || \
  docker network create --driver bridge --subnet 172.30.0.0/24 front-net

docker network inspect back-net >/dev/null 2>&1 || \
  docker network create --driver bridge --subnet 172.31.0.0/24 back-net

docker volume create items-data >/dev/null

docker run -d \
  --name backend \
  --network back-net \
  -v items-data:/data \
  -e INSTANCE_ID=backend-v5 \
  ghcr.io/mozlook/product-dashboard-backend:v5

docker run -d \
  --name nginx \
  --network back-net \
  -p 80:80 \
  ghcr.io/mozlook/product-dashboard-frontend:v5

docker network connect front-net nginx

docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}"
