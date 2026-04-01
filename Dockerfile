# syntax=docker/dockerfile:1
# Unvibe - Next.js 14 production image for Coolify

FROM node:20-alpine
WORKDIR /app

# Copy files
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Expose port
EXPOSE 3014

# Start standalone server
CMD ["node", ".next/standalone/server.js"]
