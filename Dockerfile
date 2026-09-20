FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build

FROM build AS migration
CMD ["npm", "run", "db:migrate"]

FROM build AS runtime
RUN npm prune --omit=dev
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4000
USER node
EXPOSE 4000
CMD ["node", "dist-server/index.js"]
