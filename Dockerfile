FROM node:18-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN chmod +x ./docker-entrypoint.sh

ENV NODE_ENV=production
ENV FOSSNOTE_DATABASE_PATH=/data/database.db
ENV FOSSNOTE_SEED_ON_START=1

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]
