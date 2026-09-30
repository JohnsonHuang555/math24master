FROM node:20-alpine

# Socket.IO 服務專用映像檔；Next.js 前端改部署於 Vercel，不在此建置
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 socket

# server 僅依賴 server/、models/、lib/，以 tsx 直接執行 TS（需 tsconfig.json 解析 @/ 路徑）
COPY --chown=socket:nodejs server ./server
COPY --chown=socket:nodejs models ./models
COPY --chown=socket:nodejs lib ./lib
COPY --chown=socket:nodejs tsconfig.json ./tsconfig.json

USER socket

EXPOSE 3000

ENV PORT=3000

CMD ["npm", "run", "start:socket"]
