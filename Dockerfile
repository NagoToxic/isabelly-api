# Base Node.js 22
FROM node:22-bullseye-slim

# Instala dependências do sistema
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg curl && \
    ln -s /usr/bin/python3 /usr/bin/python && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Instala yt-dlp globalmente
RUN pip3 install --no-cache-dir yt-dlp

# Define diretório de trabalho
WORKDIR /app

# Copia package.json e package-lock.json
COPY backend/package*.json ./

# Instala dependências Node.js
RUN npm install

# Copia todo o backend
COPY backend/ .

# Cria diretório para downloads temporários
RUN mkdir -p downloads

# Expõe porta (Render injeta PORT automaticamente)
EXPOSE 3000

# Comando para rodar a API
CMD ["node", "index.js"]