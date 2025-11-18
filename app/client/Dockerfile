# syntax=docker/dockerfile:1

# Stage 1: build the React SPA. Override VITE_API_URL at build time to point to the
# correct API origin—secrets stay out of the image and repo.
FROM node:22-alpine3.20 AS build
RUN apk update && apk upgrade --no-cache
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Stage 2: serve the static bundle with Nginx. The config we copy below enables
# SPA-style routing (fallback to /index.html) and keeps the image patched.
FROM nginx:1.27-alpine

# Update system packages in the final image to pick up security fixes
RUN apk update && apk upgrade --no-cache

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
