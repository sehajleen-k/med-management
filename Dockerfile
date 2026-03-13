FROM node:20-alpine

# better-sqlite3 needs build tools
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Default data directory (override with DB_PATH env var + volume mount)
RUN mkdir -p /data

EXPOSE 3000

CMD ["node", "server.js"]
