docker inspect nginx --format 'nginx networks: {{range $name, $net := .NetworkSettings.Networks}}{{$name}} {{end}}'

docker inspect backend --format 'backend networks: {{range $name, $net := .NetworkSettings.Networks}}{{$name}} {{end}}'

curl -s http://localhost/api/items

docker rm -f front-only 2>/dev/null || true

docker run -d \
  --name front-only \
  --network front-net \
  alpine:3.20 \
  sleep 3600

docker inspect front-only --format 'front-only networks: {{range $name, $net := .NetworkSettings.Networks}}{{$name}} {{end}}'

docker exec front-only sh -c "ping -c 1 backend"

docker exec front-only sh -c "wget -qO- http://backend:3000/items"
