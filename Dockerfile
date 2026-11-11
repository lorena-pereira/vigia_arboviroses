# Vigia Arboviroses — ambiente de desenvolvimento
FROM node:24-bookworm-slim

WORKDIR /app/backend

# Instala as dependências do backend
COPY backend/package*.json ./

RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi \
    && npm install --global nodemon@3

# Copia o código do backend
COPY backend/ ./

EXPOSE 3000

# Executa com recarga automática
CMD ["nodemon", "--legacy-watch", "--watch", ".", "--ext", "js,json", "server.js"]