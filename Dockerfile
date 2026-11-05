FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/game-core/package.json packages/game-core/
COPY packages/questions/package.json packages/questions/
COPY packages/server/package.json packages/server/
COPY packages/web/package.json packages/web/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
RUN pnpm --filter @casino/web build

FROM node:22-alpine AS run
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/packages/game-core ./packages/game-core
COPY --from=build /app/packages/questions ./packages/questions
COPY --from=build /app/packages/server ./packages/server
COPY --from=build /app/packages/web/dist ./packages/web/dist
COPY package.json pnpm-workspace.yaml ./
EXPOSE 3000
CMD ["node", "packages/server/src/index.ts"]
