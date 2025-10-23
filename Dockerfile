# 1️⃣ Base image Node.js 22
FROM node:22-bullseye-slim

# 2️⃣ Instala dependências do sistema
# - ffmpeg: necessário para yt-dlp
# - python3 & pip: yt-dlp-exec depende
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg curl && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# 3️⃣ Define diretório de trabalho
WORKDIR /app

# 4️⃣ Copia package.json e package-lock.json
COPY backend/package*.json ./

# 5️⃣ Instala dependências Node.js
RUN npm install

# 6️⃣ Copia todo o backend
COPY backend/ .

# 7️⃣ Cria diretório para downloads temporários
RUN mkdir -p downloads

# 8️⃣ Expõe porta (Render injeta variável PORT)
EXPOSE 3000

# 9️⃣ Comando para rodar a API
CMD ["node", "index.js"]