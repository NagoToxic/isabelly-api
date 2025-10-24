#!/usr/bin/env bash
set -e

echo "🚀 Iniciando build compatível com Render..."
WORKDIR=$(pwd)

# ---------------------------
# 1️⃣ Instalar Python portátil (com fallback)
# ---------------------------
echo "🐍 Baixando Python portátil..."
PYTHON_URL="https://github.com/astral-sh/python-build-standalone/releases/download/20241002/cpython-3.11.8+20241002-x86_64-unknown-linux-gnu-install_only.tar.gz"

curl -fL "$PYTHON_URL" -o python.tar.gz || {
  echo "⚠️ Download direto falhou, tentando fallback..."
  curl -L "https://cdn.jsdelivr.net/gh/astral-sh/python-build-standalone@main/cpython-3.11.8+20241002-x86_64-unknown-linux-gnu-install_only.tar.gz" -o python.tar.gz
}

mkdir -p /tmp/python
tar -xzf python.tar.gz -C /tmp/python --strip-components=1
export PATH="/tmp/python/bin:$PATH"
python3 --version || echo "⚠️ Python não verificado"

# ---------------------------
# 2️⃣ Instalar yt-dlp (binário)
# ---------------------------
echo "📥 Baixando yt-dlp..."
curl -L "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp" -o /tmp/python/bin/yt-dlp
chmod a+rx /tmp/python/bin/yt-dlp
yt-dlp --version || echo "⚠️ yt-dlp não verificado"

# ---------------------------
# 3️⃣ Instalar dependências Node.js
# ---------------------------
echo "📦 Instalando dependências npm..."
npm install yt-dlp-exec
npm install

# ---------------------------
# 4️⃣ Finalização
# ---------------------------
echo "✅ Ambiente pronto com Python e yt-dlp."
echo "Iniciando build Node..."