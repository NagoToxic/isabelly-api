FROM node:22

# Instalar Python e FFmpeg
RUN apt-get update && apt-get install -y python3 python3-pip ffmpeg
RUN pip3 install yt-dlp

WORKDIR /app

# Copiar tudo
COPY . .

# Instalar dependências (simples assim)
RUN npm install

EXPOSE 10000

CMD ["npm", "start"]