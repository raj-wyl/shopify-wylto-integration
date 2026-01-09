FROM node:20-alpine
RUN apk add --no-cache openssl

EXPOSE 3000

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./

RUN npm ci --omit=dev && npm cache clean --force

COPY . .

# Add Prisma schema
COPY prisma ./prisma

# Generate Prisma client during build
RUN npx prisma generate

RUN npm run build

CMD ["npm", "run", "start"]