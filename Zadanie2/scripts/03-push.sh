#!/bin/sh
set -e

docker login ghcr.io -u mozlook

docker push ghcr.io/mozlook/product-dashboard-backend:v1
docker push ghcr.io/mozlook/product-dashboard-backend:latest

docker push ghcr.io/mozlook/product-dashboard-frontend:v1
docker push ghcr.io/mozlook/product-dashboard-frontend:latest
