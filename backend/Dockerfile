FROM node:22-bullseye

# Instalar dependências
RUN apt-get update && apt-get install -y python3 python3-pip ffmpeg
RUN pip3 install yt-dlp

WORKDIR /app

# Copiar package.json primeiro (para cache)
COPY package*.json ./
RUN npm install --production

# Copiar o resto do código
COPY . .

# Criar downloads
RUN mkdir -p downloads

EXPOSE 10000

CMD ["node", "index.js"]