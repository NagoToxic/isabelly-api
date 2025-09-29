FROM node:18-slim

# Instala dependências básicas do sistema (para possíveis pacotes nativos)
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Configura variáveis de ambiente
ENV NODE_ENV=production

# Configura o diretório de trabalho
WORKDIR /app

# Copia os arquivos do backend
COPY backend/package*.json ./

# Instala APENAS as dependências de produção (ignora devDependencies)
RUN npm ci --only=production

# Copia o código do backend
COPY backend/ .

# Expõe a porta
EXPOSE 3000

# Comando para iniciar a aplicação (usando type: module)
CMD ["node", "index.js"]
