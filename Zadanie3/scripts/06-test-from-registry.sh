#!/bin/sh
set -e

docker stop product-dashboard-frontend product-dashboard-backend 2>/dev/null || true
docker rm product-dashboard-frontend product-dashboard-backend 2>/dev/null || true

docker network rm product-dashboard-net 2>/dev/null || true

docker rmi \
  ghcr.io/mozlook/product-dashboard-frontend:latest \
  ghcr.io/mozlook/product-dashboard-frontend:v1 \
  product-dashboard-frontend:latest \
  product-dashboard-frontend:v1 \
  ghcr.io/mozlook/product-dashboard-backend:latest \
  ghcr.io/mozlook/product-dashboard-backend:v1 \
  product-dashboard-backend:latest \
  product-dashboard-backend:v1 2>/dev/null || true

docker pull ghcr.io/mozlook/product-dashboard-backend:v1
docker pull ghcr.io/mozlook/product-dashboard-backend:latest

docker pull ghcr.io/mozlook/product-dashboard-frontend:v1
docker pull ghcr.io/mozlook/product-dashboard-frontend:latest

docker network create product-dashboard-net

docker run -d \
  --name product-dashboard-backend \
  --network product-dashboard-net \
  ghcr.io/mozlook/product-dashboard-backend:v1

docker run -d \
  --name product-dashboard-frontend \
  --network product-dashboard-net \
  -p 8080:80 \
  ghcr.io/mozlook/product-dashboard-frontend:v1

sleep 3

echo
echo "===== GET / ====="
curl -i http://localhost:8080/

echo
echo "===== GET /products.html ====="
curl -i http://localhost:8080/products.html

echo
echo "===== GET /stats.html ====="
curl -i http://localhost:8080/stats.html

echo
echo "===== GET /api/stats #1 ====="
curl -i http://localhost:8080/api/stats

echo
echo "===== GET /api/stats #2 ====="
curl -i http://localhost:8080/api/stats
