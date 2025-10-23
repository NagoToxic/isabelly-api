// middleware/checkApiKey.js
import { loadKeys, saveKeys, incrementKeyUsage } from '../utils/keyManager.js';

/**
 * Middleware para verificar API Key
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
export const checkApiKey = async (req, res, next) => {
    try {
        // Obter API key de diferentes fontes
        const apiKey = getApiKeyFromRequest(req);
        
        if (!apiKey) {
            return res.status(401).json({
                success: false,
                error: "API Key não fornecida",
                message: "Adicione 'apikey' nos query parameters ou no header 'x-api-key'"
            });
        }

        // Verificar se a key existe e é válida
        const keyData = await validateApiKey(apiKey);
        
        if (!keyData) {
            return res.status(401).json({
                success: false,
                error: "API Key inválida ou expirada"
            });
        }

        // Verificar limite de uso
        if (keyData.used >= keyData.limit) {
            return res.status(429).json({
                success: false,
                error: "Limite de uso excedido",
                limit: keyData.limit,
                used: keyData.used,
                reset: "Contate o administrador para reset"
            });
        }

        // Incrementar uso da key
        await incrementKeyUsage(apiKey);

        // Adicionar informações da key ao request
        req.apiKeyData = {
            key: apiKey,
            owner: keyData.owner || 'unknown',
            used: keyData.used + 1,
            limit: keyData.limit,
            remaining: keyData.limit - (keyData.used + 1)
        };

        // Log de uso (opcional)
        console.log(`🔑 API Key usada: ${apiKey.substring(0, 8)}... | Rota: ${req.path} | Restante: ${req.apiKeyData.remaining}`);

        next();

    } catch (error) {
        console.error("❌ Erro no middleware checkApiKey:", error);
        return res.status(500).json({
            success: false,
            error: "Erro interno na verificação da API Key"
        });
    }
};

/**
 * Obtém a API Key do request
 * @param {Object} req - Request object
 * @returns {string|null} API Key ou null
 */
function getApiKeyFromRequest(req) {
    // 1. Query parameters (priority)
    if (req.query.apikey) {
        return req.query.apikey;
    }
    
    // 2. Headers
    if (req.headers['x-api-key']) {
        return req.headers['x-api-key'];
    }
    
    if (req.headers['authorization']) {
        const authHeader = req.headers['authorization'];
        if (authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }
        return authHeader;
    }
    
    // 3. Body (para POST requests)
    if (req.body && req.body.apikey) {
        return req.body.apikey;
    }
    
    return null;
}

/**
 * Valida a API Key
 * @param {string} apiKey - API Key para validar
 * @returns {Object|null} Dados da key ou null
 */
async function validateApiKey(apiKey) {
    try {
        const keys = loadKeys();
        
        const keyData = keys.find(k => k.key === apiKey);
        
        if (!keyData) {
            return null;
        }

        // Verificar se a key está ativa
        if (keyData.status === 'inactive') {
            return null;
        }

        // Verificar expiração
        if (keyData.expiresAt) {
            const expiryDate = new Date(keyData.expiresAt);
            if (expiryDate < new Date()) {
                return null;
            }
        }

        return keyData;

    } catch (error) {
        console.error("❌ Erro na validação da API Key:", error);
        return null;
    }
}

/**
 * Middleware para rotas administrativas (apenas keys especiais)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
export const checkAdminKey = async (req, res, next) => {
    try {
        const apiKey = getApiKeyFromRequest(req);
        
        if (!apiKey) {
            return res.status(401).json({
                success: false,
                error: "API Key administrativa necessária"
            });
        }

        const keys = loadKeys();
        const keyData = keys.find(k => k.key === apiKey);
        
        if (!keyData || keyData.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: "Acesso negado. API Key administrativa requerida."
            });
        }

        req.apiKeyData = keyData;
        next();

    } catch (error) {
        console.error("❌ Erro no middleware checkAdminKey:", error);
        return res.status(500).json({
            success: false,
            error: "Erro interno na verificação administrativa"
        });
    }
};

/**
 * Middleware para logging de uso (opcional)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
export const apiLogger = async (req, res, next) => {
    const startTime = Date.now();
    
    // Intercepta o método res.json para logar a resposta
    const originalJson = res.json;
    res.json = function(data) {
        const duration = Date.now() - startTime;
        
        console.log(`📊 API Log: ${req.method} ${req.path} | Status: ${res.statusCode} | Duração: ${duration}ms | Key: ${req.apiKeyData?.key?.substring(0, 8)}...`);
        
        return originalJson.call(this, data);
    };
    
    next();
};