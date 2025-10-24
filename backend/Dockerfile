FROM node:18-alpine

# Instalar Python3, FFmpeg e dependências para yt-dlp
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    && pip3 install --upgrade pip \
    && pip3 install yt-dlp

WORKDIR /app

# Copiar apenas os arquivos de dependência primeiro
COPY package*.json ./
RUN npm ci --only=production

# Copiar o código da aplicação
COPY . .

# Criar diretório de downloads
RUN mkdir -p downloads

# Expor a porta (Render usa 10000)
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:10000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Comando de inicialização
CMD ["npm", "start"]