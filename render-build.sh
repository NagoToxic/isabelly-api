#!/usr/bin/env bash
set -e

echo "🚀 Iniciando build para Render..."

# ---------------------------
# 1️⃣ Instalar Python
# ---------------------------
echo "🐍 Instalando Python..."
apt-get update
apt-get install -y python3 python3-pip

# ---------------------------
# 2️⃣ Instalar yt-dlp (binário oficial)
# ---------------------------
echo "📥 Baixando yt-dlp..."
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
chmod a+rx /usr/local/bin/yt-dlp
echo "✅ yt-dlp instalado."

# ---------------------------
# 3️⃣ Instalar dependências do Node
# ---------------------------
echo "📦 Instalando dependências npm..."
npm install yt-dlp-exec
npm install
echo "✅ Dependências Node instaladas."

# ---------------------------
# 4️⃣ Conclusão
# ---------------------------
echo "🎉 Build finalizado com sucesso!"