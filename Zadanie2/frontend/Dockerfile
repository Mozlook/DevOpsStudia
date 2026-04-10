FROM alpine:3.23 AS assets

WORKDIR /site

COPY index.html ./
COPY products.html ./
COPY stats.html ./
COPY css ./css
COPY js ./js

FROM nginx:1.29.8-alpine3.23

RUN rm -rf /usr/share/nginx/html/* \
    && mkdir -p /var/cache/nginx/stats_cache

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=assets /site/index.html /usr/share/nginx/html/index.html
COPY --from=assets /site/products.html /usr/share/nginx/html/products.html
COPY --from=assets /site/stats.html /usr/share/nginx/html/stats.html
COPY --from=assets /site/css /usr/share/nginx/html/css
COPY --from=assets /site/js /usr/share/nginx/html/js

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
