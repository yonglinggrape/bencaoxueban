# syntax=docker/dockerfile:1
FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

# Startup script: push schema + start app
RUN echo '#!/bin/sh\nmkdir -p /app/data\nnpx prisma db push --skip-generate\nnpm start' > /app/start.sh \
    && chmod +x /app/start.sh

EXPOSE 3000
CMD ["/app/start.sh"]
