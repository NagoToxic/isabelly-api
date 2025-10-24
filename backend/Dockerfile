FROM node:18-bullseye

# Instalar Python e dependências (Debian-based é mais compatível)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Instalar yt-dlp
RUN pip3 install yt-dlp

WORKDIR /app

# Copiar arquivos de dependência
COPY package*.json ./
RUN npm ci --only=production

# Copiar todo o código
COPY . .

# Criar diretório de downloads
RUN mkdir -p downloads

# Expor a porta do Render
EXPOSE 10000

# Comando de inicialização
CMD ["npm", "start"]