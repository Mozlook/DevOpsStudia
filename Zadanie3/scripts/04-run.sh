#!/bin/sh
set -e

docker run -d \
  --name product-dashboard-backend \
  --network product-dashboard-net \
  ghcr.io/mozlook/product-dashboard-backend:v1

docker run -d \
  --name product-dashboard-frontend \
  --network product-dashboard-net \
  -p 8080:80 \
  ghcr.io/mozlook/product-dashboard-frontend:v1
