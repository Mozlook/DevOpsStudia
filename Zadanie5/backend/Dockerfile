FROM node:20-alpine

ARG IMAGE_VERSION
LABEL version=$IMAGE_VERSION

ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node . .

RUN mkdir -p /data && chown -R node:node /data

USER node

EXPOSE 3000

CMD ["node", "server.js"]
