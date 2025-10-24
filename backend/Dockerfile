FROM node:22

# Instalar Python 3 e FFmpeg
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg

WORKDIR /app
COPY . .
RUN npm install

EXPOSE 10000
CMD ["node", "index.js"]