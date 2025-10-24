FROM node:18-alpine

# Instalar dependências do sistema primeiro
RUN apk update && apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg

# Agora instalar yt-dlp
RUN pip3 install --upgrade pip && \
    pip3 install yt-dlp

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