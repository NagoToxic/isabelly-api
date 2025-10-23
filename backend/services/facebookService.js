// services/facebookService.js
import getFBInfo from "@xaviabot/fb-downloader";
import axios from 'axios';

// ==================== FUNÇÕES FACEBOOK ====================
export async function downloadFacebook(url, cookies, userAgent) {
    try {
        // 🔄 Resolver links /share/r/... via meta refresh
        try {
            const { data: html } = await axios.get(url, { 
                headers: { 
                    "User-Agent": userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Cookie": cookies || "",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8"
                },
                timeout: 10000
            });
            
            const match = html.match(/<meta http-equiv="refresh" content="0; URL='(.+?)'">/i);
            if (match && match[1]) {
                url = match[1];
                console.log("URL resolvida:", url);
            }
        } catch (err) {
            console.log("Não foi possível resolver URL, usando original");
        }

        // 📥 Busca info do vídeo usando a biblioteca
        const result = await getFBInfo(url);

        if (!result || !result.data) {
            throw new Error("Não foi possível obter informações do vídeo");
        }

        return {
            status: true,
            message: "Vídeo do Facebook obtido com sucesso",
            data: result.data
        };
        
    } catch (error) {
        console.error("Erro no download do Facebook:", error.message);
        
        // Tratamento de erros específicos
        if (error.message.includes("Não foi possível obter")) {
            throw new Error("Vídeo não encontrado ou indisponível");
        }
        
        if (error.message.includes("timeout")) {
            throw new Error("Timeout ao acessar o Facebook");
        }
        
        throw new Error(`Erro ao baixar vídeo: ${error.message}`);
    }
}

// ==================== FUNÇÕES AUXILIARES ====================

/**
 * Valida URL do Facebook
 * @param {string} url - URL para validar
 * @returns {boolean} True se válida
 */
export const validarUrlFacebook = (url) => {
    const patterns = [
        /https?:\/\/(www\.)?facebook\.com\/.+\/videos\/.+/,
        /https?:\/\/(www\.)?facebook\.com\/watch\/?/,
        /https?:\/\/(www\.)?fb\.watch\/.+/,
        /https?:\/\/(www\.)?facebook\.com\/.+\/video\/.+/,
        /https?:\/\/(www\.)?facebook\.com\/share\/r\/.+/
    ];
    
    return patterns.some(pattern => pattern.test(url));
};

/**
 * Obtém informações básicas do vídeo sem usar a biblioteca (fallback)
 * @param {string} url - URL do Facebook
 * @returns {Promise<Object>} Informações básicas
 */
export const getFacebookVideoInfo = async (url) => {
    try {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
        };

        const response = await axios.get(url, {
            headers,
            timeout: 15000
        });

        // Extrai informações básicas do HTML
        const titleMatch = response.data.match(/<title>(.*?)<\/title>/);
        const thumbnailMatch = response.data.match(/<meta property="og:image" content="(.*?)"/);
        const descriptionMatch = response.data.match(/<meta property="og:description" content="(.*?)"/);

        return {
            title: titleMatch ? titleMatch[1] : 'Vídeo do Facebook',
            description: descriptionMatch ? descriptionMatch[1] : '',
            thumbnail: thumbnailMatch ? thumbnailMatch[1] : ''
        };

    } catch (error) {
        throw new Error(`Erro ao obter informações: ${error.message}`);
    }
};

/**
 * Testa se a biblioteca está funcionando
 * @returns {Promise<boolean>} True se funcionando
 */
export const testarBibliotecaFB = async () => {
    try {
        // Testa com uma URL conhecida (opcional)
        await getFBInfo('https://www.facebook.com/watch/?v=example');
        return true;
    } catch (error) {
        console.error("Biblioteca FB não está funcionando:", error.message);
        return false;
    }
};