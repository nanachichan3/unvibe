# syntax=docker/dockerfile:1
# Simple Next.js 14 build for Coolify

FROM node:20-alpine
WORKDIR /app

# Copy files
COPY package*.json ./
RUN npm ci
COPY . .

# Build
RUN npm run build

# Expose port
EXPOSE 3014

# Start
CMD ["npm", "start"]
