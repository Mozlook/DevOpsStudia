FROM alpine:3.23 AS builder

WORKDIR /site

COPY index.html ./
COPY products.html ./
COPY stats.html ./
COPY css ./css
COPY js ./js
COPY nginx.conf ./nginx.conf

FROM nginx:alpine

ARG NGINX_VERSION
LABEL version=$NGINX_VERSION

RUN rm -rf /usr/share/nginx/html/* \
    && mkdir -p /var/cache/nginx/stats_cache

COPY --from=builder /site/index.html /usr/share/nginx/html/index.html
COPY --from=builder /site/products.html /usr/share/nginx/html/products.html
COPY --from=builder /site/stats.html /usr/share/nginx/html/stats.html
COPY --from=builder /site/css /usr/share/nginx/html/css
COPY --from=builder /site/js /usr/share/nginx/html/js
COPY --from=builder /site/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
