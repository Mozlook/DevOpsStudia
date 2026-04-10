#!/bin/sh
set -e

docker stop api-a 
docker stop api-b
docker stop product-dashboard-frontend

