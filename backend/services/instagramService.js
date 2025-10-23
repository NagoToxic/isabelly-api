// services/instagramService.js
import { instagramGetUrl } from 'instagram-url-direct';

// ==================== FUNÇÕES INSTAGRAM ====================
export async function downloadInstagram(url) {
    try {
        console.log("╔═══════════════════════════════════════╗");
        console.log("║         📱 INSTAGRAM DOWNLOAD        ║");
        console.log("╚═══════════════════════════════════════╝");
        console.log(`🔗 URL: ${url}`);
        
        // Validação da URL
        if (!url || typeof url !== 'string') {
            throw new Error("URL inválida");
        }

        // Limpar URL - remover parâmetros de query
        const cleanUrl = url.split('?')[0];
        console.log("🔧 URL limpa:", cleanUrl);

        // Validar tipo de post
        if (!cleanUrl.includes("/p/") && !cleanUrl.includes("/reel/")) {
            throw new Error("Link inválido. Apenas posts (/p/) ou reels (/reel/) são suportados.");
        }

        console.log("╔═══════════════════════════════════════╗");
        console.log("║           🔍 BUSCANDO DADOS           ║");
        console.log("╚═══════════════════════════════════════╝");
        
        const data = await instagramGetUrl(cleanUrl);

        // Verificar se os dados são válidos
        if (!data) {
            throw new Error("Nenhum dado retornado da API");
        }

        // Verificar estrutura dos dados
        if (!data.url_list || !Array.isArray(data.url_list) || data.url_list.length === 0) {
            throw new Error("Nenhuma mídia encontrada no post");
        }

        // Verificar se media_details existe
        if (!data.media_details || !Array.isArray(data.media_details)) {
            throw new Error("Estrutura de dados inválida - media_details não encontrado");
        }

        console.log("╔═══════════════════════════════════════╗");
        console.log("║           ✅ DADOS RECEBIDOS           ║");
        console.log("╚═══════════════════════════════════════╝");
        
        // Informações básicas do perfil
        const username = data.post_info?.username || 'N/A';
        const mediaCount = data.media_details.length;
        
        console.log(`👤 Nome do perfil: ${username}`);
        console.log(`📊 Mídias encontradas: ${mediaCount}`);
      
        return {
            results_number: data.results_number || data.media_details.length,
            post_info: data.post_info || {},
            media: data.media_details.map((m, index) => ({
                index: index + 1,
                type: m.type || 'unknown',
                url: m.url || '',
                thumbnail: m.thumbnail || '',
                width: m.dimensions?.width || 0,
                height: m.dimensions?.height || 0,
                views: m.video_view_count || null,
                duration: m.duration || null
            }))
        };

    } catch (err) {
        console.log("╔═══════════════════════════════════════╗");
        console.log("║             ❌ ERRO CRÍTICO           ║");
        console.log("╚═══════════════════════════════════════╝");
        console.error(`💥 Mensagem: ${err.message}`);
        console.error(`🔍 Stack trace: ${err.stack}`);
        throw new Error(`Erro ao buscar mídia do Instagram: ${err.message}`);
    }
}

// ==================== FUNÇÕES ADICIONAIS ====================

/**
 * Versão V2 - Download direto
 * @param {string} url - URL do Instagram
 * @returns {Promise<Object>} Dados da mídia
 */
export const downloadInstagramV2 = async (url) => {
    try {
        console.log("📱 Instagram V2 - URL recebida:", url);
        
        const cleanUrl = url.split("?")[0];

        if (!cleanUrl.includes("/p/") && !cleanUrl.includes("/reel/")) {
            throw new Error("❌ Apenas links de *posts* ou *reels* são suportados!");
        }

        const data = await downloadInstagram(cleanUrl);
        
        if (!data.media || data.media.length === 0) {
            throw new Error("Nenhuma mídia encontrada após processamento");
        }

        // Encontrar a melhor mídia (vídeo primeiro, depois imagem)
        const bestMedia = data.media.reduce((best, current) => {
            if (current.type === 'video') return current;
            if (best.type !== 'video' && current.url) return current;
            return best;
        }, data.media[0]);

        return {
            success: true,
            media_count: data.media.length,
            media: data.media,
            download_url: bestMedia.url,
            type: bestMedia.type,
            selected_media: bestMedia
        };

    } catch (error) {
        console.error("❌ Erro no Instagram V2:", error.message);
        throw new Error(`Erro no download: ${error.message}`);
    }
};

/**
 * Valida URL do Instagram
 * @param {string} url - URL para validar
 * @returns {boolean} True se válida
 */
export const validarUrlInstagram = (url) => {
    try {
        if (!url || typeof url !== 'string') return false;
        
        const patterns = [
            /https?:\/\/(www\.)?instagram\.com\/p\/[A-Za-z0-9_-]+\/?/,
            /https?:\/\/(www\.)?instagram\.com\/reel\/[A-Za-z0-9_-]+\/?/,
            /https?:\/\/(www\.)?instagram\.com\/tv\/[A-Za-z0-9_-]+\/?/,
            /https?:\/\/(www\.)?instagram\.com\/stories\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/?/
        ];
        
        return patterns.some(pattern => pattern.test(url));
    } catch {
        return false;
    }
};

/**
 * Obtém informações básicas do post
 * @param {string} url - URL do Instagram
 * @returns {Promise<Object>} Informações básicas
 */
export const getInstagramInfo = async (url) => {
    try {
        const data = await downloadInstagram(url);
        
        return {
            success: true,
            post_info: data.post_info,
            media_count: data.media.length,
            media_types: [...new Set(data.media.map(m => m.type))],
            has_video: data.media.some(m => m.type === "video"),
            has_photo: data.media.some(m => m.type === "image"),
            dimensions: data.media.map(m => ({ width: m.width, height: m.height }))
        };

    } catch (error) {
        throw new Error(`Erro ao obter informações: ${error.message}`);
    }
};