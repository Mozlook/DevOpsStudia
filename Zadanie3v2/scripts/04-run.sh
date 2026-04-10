#!/bin/sh
set -e

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
