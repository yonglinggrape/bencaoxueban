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

RUN chmod +x /app/scripts/start.sh

EXPOSE 3000
CMD ["/app/scripts/start.sh"]
