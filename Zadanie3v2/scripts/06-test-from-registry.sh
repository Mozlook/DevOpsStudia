#!/bin/sh
set -e

docker stop product-dashboard-frontend product-dashboard-backend api-a api-b 2>/dev/null || true
docker rm product-dashboard-frontend product-dashboard-backend api-a api-b 2>/dev/null || true

docker network rm product-dashboard-net 2>/dev/null || true

docker rmi \
  ghcr.io/mozlook/product-dashboard-frontend:latest \
  ghcr.io/mozlook/product-dashboard-frontend:v2 \
  product-dashboard-frontend:latest \
  product-dashboard-frontend:v2 \
  ghcr.io/mozlook/product-dashboard-backend:latest \
  ghcr.io/mozlook/product-dashboard-backend:v1 \
  product-dashboard-backend:latest \
  product-dashboard-backend:v1 2>/dev/null || true

docker pull ghcr.io/mozlook/product-dashboard-backend:v1
docker pull ghcr.io/mozlook/product-dashboard-backend:latest

docker pull ghcr.io/mozlook/product-dashboard-frontend:v2
docker pull ghcr.io/mozlook/product-dashboard-frontend:latest

docker network create product-dashboard-net

docker run -d \
  --name api-a \
  --network product-dashboard-net \
  -e INSTANCE_ID=api-a \
  ghcr.io/mozlook/product-dashboard-backend:v1

docker run -d \
  --name api-b \
  --network product-dashboard-net \
  -e INSTANCE_ID=api-b \
  ghcr.io/mozlook/product-dashboard-backend:v1

docker run -d \
  --name product-dashboard-frontend \
  --network product-dashboard-net \
  -p 8080:80 \
  ghcr.io/mozlook/product-dashboard-frontend:v2

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
echo "===== GET /api/stats #1 (cache test) ====="
curl -i http://localhost:8080/api/stats

echo
echo "===== GET /api/stats #2 (cache test) ====="
curl -i http://localhost:8080/api/stats

echo
echo "===== LOAD BALANCING TEST ====="

seen_a=0
seen_b=0
i=1

while [ "$i" -le 6 ]; do
  body=$(curl -s "http://localhost:8080/api/stats?refresh=$i")
  instance=$(printf '%s\n' "$body" | sed -n 's/.*"instanceId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')

  echo "request $i -> $instance"
  echo "$body"

  case "$instance" in
    api-a) seen_a=1 ;;
    api-b) seen_b=1 ;;
  esac

  i=$((i + 1))
done

echo
echo "===== RUNNING CONTAINERS ====="
docker ps

if [ "$seen_a" -eq 1 ] && [ "$seen_b" -eq 1 ]; then
  echo
  echo "OK: load balancing dziala, odpowiedzi obsluzyly api-a i api-b."
else
  echo
  echo "BLAD: nie wykryto obu instancji backendu w odpowiedziach."
  exit 1
fi
