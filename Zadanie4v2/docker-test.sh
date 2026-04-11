#!/bin/sh
set -e

docker stop product-dashboard-frontend4 product-dashboard-backend4 2>/dev/null || true
docker rm product-dashboard-frontend4 product-dashboard-backend4 2>/dev/null || true

docker network rm product-dashboard-net4 2>/dev/null || true

docker rmi \
  ghcr.io/mozlook/product-dashboard-frontend4:latest \
  ghcr.io/mozlook/product-dashboard-frontend4:v1 \
  product-dashboard-frontend4:latest \
  product-dashboard-frontend4:v1 \
  ghcr.io/mozlook/product-dashboard-backend4:latest \
  ghcr.io/mozlook/product-dashboard-backend4:v1 \
  product-dashboard-backend4:latest \
  product-dashboard-backend4:v1 2>/dev/null || true

docker pull ghcr.io/mozlook/product-dashboard-backend4:v1
docker pull ghcr.io/mozlook/product-dashboard-backend4:latest

docker pull ghcr.io/mozlook/product-dashboard-frontend4:v1
docker pull ghcr.io/mozlook/product-dashboard-frontend4:latest

docker network create product-dashboard-net4

docker run -d \
  --name product-dashboard-backend4 \
  --network product-dashboard-net4 \
  -e INSTANCE_ID=backend4 \
  ghcr.io/mozlook/product-dashboard-backend4:v1

docker run -d \
  --name product-dashboard-frontend4 \
  --network product-dashboard-net4 \
  -p 8084:80 \
  ghcr.io/mozlook/product-dashboard-frontend4:v1

sleep 3

echo
echo "===== GET / ====="
curl -i http://localhost:8084/

echo
echo "===== GET /products.html ====="
curl -i http://localhost:8084/products.html

echo
echo "===== GET /stats.html ====="
curl -i http://localhost:8084/stats.html

echo
echo "===== GET /api/stats #1 ====="
curl -i http://localhost:8084/api/stats

echo
echo "===== GET /api/stats #2 ====="
curl -i http://localhost:8084/api/stats

echo
echo "===== RUNNING CONTAINERS ====="
docker ps
