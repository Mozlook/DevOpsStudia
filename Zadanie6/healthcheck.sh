#!/usr/bin/env bash
docker compose -f compose.yml up -d --build --wait
docker compose -f compose.yml ps > healthcheck.txt
cat healthcheck.txt
