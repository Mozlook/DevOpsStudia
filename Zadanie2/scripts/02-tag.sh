#!/bin/sh
set -e

docker tag product-dashboard-backend:v1 product-dashboard-backend:latest
docker tag product-dashboard-frontend:v1 product-dashboard-frontend:latest

docker tag product-dashboard-backend:v1 ghcr.io/mozlook/product-dashboard-backend:v1
docker tag product-dashboard-backend:v1 ghcr.io/mozlook/product-dashboard-backend:latest

docker tag product-dashboard-frontend:v1 ghcr.io/mozlook/product-dashboard-frontend:v1
docker tag product-dashboard-frontend:v1 ghcr.io/mozlook/product-dashboard-frontend:latest
