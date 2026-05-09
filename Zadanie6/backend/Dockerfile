FROM node:20-alpine

ARG IMAGE_VERSION=v6
LABEL version=$IMAGE_VERSION

ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev && npm cache clean --force

COPY --chown=node:node . .

USER node

EXPOSE 3000

CMD ["npm", "start"]
