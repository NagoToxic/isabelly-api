// services/instagramScraperService.js

// ==================== CONFIGURAÇÕES ====================
const GRAMFETCHR_BASE_URL = "https://gramfetchr.com";
const GRAMFETCHR_API_URL = `${GRAMFETCHR_BASE_URL}/api/fetchr`;

// ==================== FUNÇÕES PRINCIPAIS ====================

/**
 * Gera IP aleatório
 * @returns {string} IP aleatório
 */
function randomIP() {
    return Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join(".");
}

/**
 * Obtém token do GramFetchr
 * @returns {Promise<string>} Token
 */
async function getToken() {
    try {
        const res = await fetch("https://gramfetchr.com/", {
            method: "POST",
            headers: {
                "accept": "text/x-component",
                "content-type": "text/plain;charset=UTF-8",
                "next-action": "00d6c3101978ea75ab0e1c4879ef0c686242515660",
                "next-router-state-tree": "%5B%22%22%2C%7B%22children%22%3A%5B%5B%22locale%22%2C%22en%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%2Ctrue%5D%7D%2Cnull%2Cnull%5D",
                "Referer": "https://gramfetchr.com/"
            },
            body: "[]"
        });
        
        const text = await res.text();
        const tokenMatch = text.match(/"([a-f0-9]{32}:[a-f0-9]{32})"/);
        
        if (!tokenMatch) {
            throw new Error("Falha ao obter token do GramFetchr");
        }
        
        return tokenMatch[1];
    } catch (error) {
        console.error("❌ Erro ao obter token:", error.message);
        throw new Error(`Falha na autenticação: ${error.message}`);
    }
}

/**
 * Scraping do Instagram usando GramFetchr
 * @param {string} url - URL do Instagram
 * @returns {Promise<Object>} Dados da mídia
 */
export async function scrapeInstagram(url) {
    try {
        const token = await getToken();
        
        const response = await fetch(GRAMFETCHR_API_URL, {
            method: "POST",
            headers: {
                "accept": "*/*",
                "content-type": "application/json",
                "Referer": "https://gramfetchr.com/"
            },
            body: JSON.stringify({
                url,
                token,
                referer: "https://gramfetchr.com/",
                requester: randomIP()
            })
        });
        
        const data = await response.json();
        
        if (!data.success || !data.mediaItems) {
            throw new Error("Falha ao obter dados do Instagram");
        }

        return {
            success: true,
            total_media: data.mediaItems.length,
            media: data.mediaItems.map((m, i) => ({
                index: i + 1,
                type: m.isVideo ? "video" : "image",
                download: `${GRAMFETCHR_BASE_URL}${m.downloadLink}`,
                preview: `${GRAMFETCHR_BASE_URL}${m.preview}`,
                thumbnail: `${GRAMFETCHR_BASE_URL}${m.thumbnail}`,
                dimensions: m.dimensions || null,
                size: m.size || null
            })),
            metadata: {
                url_original: url,
                processado_em: new Date().toISOString(),
                servico: "GramFetchr",
                qualidade: "alta"
            }
        };

    } catch (error) {
        console.error("❌ Erro no IG Scraper:", error.message);
        return { 
            success: false, 
            error: error.message 
        };
    }
}

/**
 * Download de mídia do Instagram
 * @param {string} url - URL do Instagram
 * @param {string} tipo - Tipo de mídia (todos, video, image)
 * @returns {Promise<Object>} Mídias para download
 */
export async function downloadInstagramMedia(url, tipo = 'todos') {
    try {
        const resultado = await scrapeInstagram(url);
        
        if (!resultado.success) {
            throw new Error(resultado.error);
        }

        if (resultado.media.length === 0) {
            throw new Error("Nenhuma mídia encontrada");
        }

        // Filtra por tipo se especificado
        const mediaFiltrada = tipo === 'todos' 
            ? resultado.media 
            : resultado.media.filter(m => m.type === tipo);

        if (mediaFiltrada.length === 0) {
            throw new Error(`Nenhuma mídia do tipo '${tipo}' encontrada`);
        }

        return {
            success: true,
            media: mediaFiltrada,
            total_disponivel: mediaFiltrada.length,
            url_original: url,
            tipos_encontrados: [...new Set(resultado.media.map(m => m.type))]
        };

    } catch (error) {
        console.error("❌ Erro no download:", error.message);
        throw new Error(`Erro no download: ${error.message}`);
    }
}

// ==================== FUNÇÕES AUXILIARES ====================

/**
 * Valida URL do Instagram
 * @param {string} url - URL para validar
 * @returns {boolean} True se válida
 */
export function validarUrlInstagram(url) {
    try {
        const urlObj = new URL(url);
        const patterns = [
            /instagram\.com\/p\/[A-Za-z0-9_-]+\/?/,
            /instagram\.com\/reel\/[A-Za-z0-9_-]+\/?/,
            /instagram\.com\/stories\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/?/,
            /instagram\.com\/tv\/[A-Za-z0-9_-]+\/?/
        ];
        
        return patterns.some(pattern => pattern.test(urlObj.pathname));
    } catch {
        return false;
    }
}

/**
 * Obtém informações básicas da URL
 * @param {string} url - URL do Instagram
 * @returns {Object} Informações
 */
export function getInstagramUrlInfo(url) {
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        
        return {
            tipo: pathParts[0] || 'desconhecido',
            id: pathParts[1] || 'desconhecido',
            url_completa: url,
            dominio: urlObj.hostname
        };
    } catch {
        return {
            tipo: 'invalido',
            id: 'invalido',
            url_completa: url,
            dominio: 'invalido'
        };
    }
}

/**
 * Testa a conexão com o GramFetchr
 * @returns {Promise<Object>} Status do serviço
 */
export async function testGramFetchrConnection() {
    try {
        const token = await getToken();
        
        return {
            service: "GramFetchr",
            status: "operational",
            token_obtido: !!token,
            base_url: GRAMFETCHR_BASE_URL,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            service: "GramFetchr",
            status: "offline",
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Processa múltiplas URLs do Instagram
 * @param {Array} urls - Lista de URLs
 * @returns {Promise<Array>} Resultados
 */
export async function processarMultiplasUrlsInstagram(urls) {
    try {
        const resultados = [];
        
        for (const url of urls) {
            try {
                const data = await scrapeInstagram(url);
                resultados.push({
                    url,
                    success: data.success,
                    data: data.success ? data : null,
                    error: data.success ? null : data.error
                });
            } catch (error) {
                resultados.push({
                    url,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return {
            total_urls: urls.length,
            sucessos: resultados.filter(r => r.success).length,
            falhas: resultados.filter(r => !r.success).length,
            resultados: resultados
        };
    } catch (error) {
        throw new Error(`Erro ao processar múltiplas URLs: ${error.message}`);
    }
}