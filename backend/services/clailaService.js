// services/clailaService.js
import axios from 'axios';

// ==================== CONFIGURAÇÕES CLAILA AI ====================
const CLAILA_BASE_URL = "https://app.claila.com/api/v2";

export const CLAILA_MODELS = {
    "gpt-5-mini": "ChatGPT-5 mini",
    "gpt-4.1-mini": "ChatGPT 4.1 mini", 
    "gpt-5": "ChatGPT-5",
    "gpt-4.1": "ChatGPT 4.1",
    "gpt-4o": "ChatGPT 4o",
    "o3-mini": "ChatGPT o3-mini"
};

// ==================== FUNÇÕES CLAILA AI ====================

/**
 * Obtém token CSRF da Claila
 * @returns {Promise<string>} Token CSRF
 */
export async function getClailaCSRFToken() {
    try {
        const response = await axios.get(`${CLAILA_BASE_URL}/getcsrftoken`, {
            headers: {
                "Accept": "*/*",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "X-Requested-With": "XMLHttpRequest"
            },
            timeout: 10000
        });
        return response.data;
    } catch (error) {
        throw new Error(`Erro ao obter token CSRF: ${error.message}`);
    }
}

/**
 * Envia mensagem para a Claila AI
 * @param {string} message - Mensagem do usuário
 * @param {string} sessionId - ID da sessão (opcional)
 * @param {string} model - Modelo a ser usado
 * @returns {Promise<Object>} Resposta da AI
 */
export async function sendClailaMessage(message, sessionId = null, model = "gpt-4o") {
    try {
        // Validação do modelo
        if (!CLAILA_MODELS[model]) {
            throw new Error(`Modelo '${model}' não disponível. Modelos: ${Object.keys(CLAILA_MODELS).join(', ')}`);
        }

        const csrfToken = await getClailaCSRFToken();
        const actualSessionId = sessionId || Date.now().toString();

        const data = new URLSearchParams({
            model: model,
            calltype: "completion",
            message: message,
            sessionId: actualSessionId
        });

        const response = await axios.post(`${CLAILA_BASE_URL}/unichat2`, data, {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "X-CSRF-Token": csrfToken,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "X-Requested-With": "XMLHttpRequest",
                "Referer": "https://app.claila.com/",
                "Origin": "https://app.claila.com"
            },
            timeout: 60000
        });

        return {
            success: true,
            response: response.data,
            sessionId: actualSessionId,
            model: CLAILA_MODELS[model] || model,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error("Erro na API Claila:", error.message);
        
        if (error.code === 'ECONNABORTED') {
            throw new Error("Timeout na requisição para Claila AI");
        }
        
        if (error.response?.status === 403) {
            throw new Error("Token CSRF inválido ou expirado");
        }
        
        throw new Error(`Erro na API Claila: ${error.message}`);
    }
}

// ==================== FUNÇÕES ADICIONAIS ====================

/**
 * Retorna a lista de modelos disponíveis
 * @returns {Object} Modelos disponíveis
 */
export function getClailaModels() {
    return CLAILA_MODELS;
}

/**
 * Valida se um modelo está disponível
 * @param {string} model - Nome do modelo
 * @returns {boolean} True se disponível
 */
export function isValidClailaModel(model) {
    return CLAILA_MODELS.hasOwnProperty(model);
}

/**
 * Envia múltiplas mensagens em sequência
 * @param {Array} messages - Array de mensagens
 * @param {string} sessionId - ID da sessão
 * @param {string} model - Modelo a ser usado
 * @returns {Promise<Array>} Respostas
 */
export async function sendClailaConversation(messages, sessionId = null, model = "gpt-4o") {
    try {
        const actualSessionId = sessionId || Date.now().toString();
        const responses = [];

        for (const message of messages) {
            try {
                const response = await sendClailaMessage(message, actualSessionId, model);
                responses.push({
                    message,
                    response: response.response,
                    success: true
                });
            } catch (error) {
                responses.push({
                    message,
                    error: error.message,
                    success: false
                });
            }
        }

        return {
            success: true,
            sessionId: actualSessionId,
            model: CLAILA_MODELS[model] || model,
            responses: responses,
            total_messages: messages.length,
            successful_responses: responses.filter(r => r.success).length
        };

    } catch (error) {
        throw new Error(`Erro na conversa: ${error.message}`);
    }
}

/**
 * Testa a conexão com a Claila AI
 * @returns {Promise<Object>} Status da conexão
 */
export async function testClailaConnection() {
    try {
        const csrfToken = await getClailaCSRFToken();
        
        return {
            success: true,
            message: "Conexão com Claila AI estabelecida com sucesso",
            csrf_token: csrfToken ? "Obteve token com sucesso" : "Falha ao obter token",
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}