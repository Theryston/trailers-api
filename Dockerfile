FROM node:20-alpine

WORKDIR /app

COPY . .

RUN npm install -g pnpm

RUN pnpm install

EXPOSE 3000

CMD ["pnpm", "run", "start"]