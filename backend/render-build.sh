#!/usr/bin/env bash
set -e

echo "🚀 Iniciando build compatível com Render..."

# ---------------------------
# 1️⃣ Instalar Python portátil
# ---------------------------
echo "🐍 Baixando Python portátil..."
curl -L https://github.com/indygreg/python-build-standalone/releases/download/20241002/cpython-3.11.8+20241002-x86_64-unknown-linux-gnu-install_only.tar.gz -o python.tar.gz
mkdir -p /tmp/python
tar -xzf python.tar.gz -C /tmp/python --strip-components=1
export PATH="/tmp/python/bin:$PATH"
python3 --version

# ---------------------------
# 2️⃣ Instalar yt-dlp (binário)
# ---------------------------
echo "📥 Baixando yt-dlp..."
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /tmp/python/bin/yt-dlp
chmod a+rx /tmp/python/bin/yt-dlp
yt-dlp --version

# ---------------------------
# 3️⃣ Instalar dependências Node
# ---------------------------
echo "📦 Instalando dependências npm..."
npm install yt-dlp-exec
npm install

# ---------------------------
# 4️⃣ Finalização
# ---------------------------
echo "✅ Ambiente pronto. yt-dlp e Python funcionando!"