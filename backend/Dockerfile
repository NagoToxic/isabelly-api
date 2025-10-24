FROM node:22-bullseye

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Instalar yt-dlp
RUN pip3 install --upgrade pip && pip3 install yt-dlp

WORKDIR /app

# Copiar package.json
COPY package*.json ./

# Verificar e instalar dependências
RUN if [ -f "package.json" ]; then \
        npm install --production --no-optional; \
    else \
        echo "ERRO: package.json não encontrado" && exit 1; \
    fi

# Copiar o resto da aplicação
COPY . .

# Criar diretório de downloads
RUN mkdir -p downloads

EXPOSE 10000

CMD ["npm", "start"]