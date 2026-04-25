#!/bin/sh

docker build -t ghcr.io/mozlook/product-dashboard-backend:v5 --build-arg IMAGE_VERSION=v5 ./backend

docker build -t ghcr.io/mozlook/product-dashboard-frontend:v5 --build-arg NGINX_VERSION=v5 ./frontend

docker push ghcr.io/mozlook/product-dashboard-backend:v5

docker push ghcr.io/mozlook/product-dashboard-frontend:v5
