# syntax=docker/dockerfile:1

# Stage 1: install dependencies without dev tooling to keep final image slim.
FROM node:22-alpine3.20 AS deps
RUN apk update && apk upgrade --no-cache
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 2: copy app source + node_modules. Runtime secrets are injected via
# environment variables (e.g., JWT_SECRET) at container start, never baked in.
FROM node:22-alpine3.20 AS runner
RUN apk update && apk upgrade --no-cache
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 4000
CMD ["node", "src/index.js"]
