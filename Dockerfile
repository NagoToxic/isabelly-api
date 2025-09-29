FROM node:18-slim

# Instala dependências do sistema
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-freefont-ttf \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

# Configura variáveis de ambiente para Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

# Configura o diretório de trabalho
WORKDIR /app

# Copia APENAS os arquivos do backend primeiro
COPY backend/package*.json ./

# Instala as dependências
RUN npm ci --only=production

# Copia o código do backend
COPY backend/ .

# Expõe a porta
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["node", "index.js"]
