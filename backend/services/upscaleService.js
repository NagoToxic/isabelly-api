// services/upscaleService.js
import axios from 'axios';

/**
 * Faz upscale de imagem usando serviço externo
 * @param {string} imageUrl - URL da imagem
 * @param {number} escala - Escala (2, 3 ou 4)
 * @returns {Promise<Object>} Resultado do upscale
 */
export async function upscaleImage(imageUrl, escala = 2) {
    try {
        // Primeiro, baixa a imagem
        const respostaDownload = await axios.get(imageUrl, { 
            responseType: "arraybuffer",
            timeout: 15000 
        });

        const mimeType = respostaDownload.headers["content-type"] || "image/jpeg";
        const buffer = Buffer.from(respostaDownload.data);

        console.log(`📥 Imagem baixada: ${(buffer.length / 1024).toFixed(2)} KB`);

        // Chama a função de upscale (você já tem a função aumentarImagem)
        const resultado = await aumentarImagem(buffer, mimeType, escala);

        return resultado;

    } catch (error) {
        console.error("❌ Erro no upscale service:", error.message);
        throw new Error(`Falha no processamento: ${error.message}`);
    }
}

// ==================== FUNÇÃO aumentarImagem (sua função existente) ====================

/**
 * Sua função existente de upscale - mantenha como está
 * @param {Buffer} buffer - Buffer da imagem
 * @param {string} mimeType - Tipo MIME
 * @param {number} escala - Escala (2, 3, 4)
 * @returns {Promise<Object>} Resultado
 */
async function aumentarImagem(buffer, mimeType, escala) {
    // SUA IMPLEMENTAÇÃO EXISTENTE AQUI
    // Esta é a função que você já tem implementada
    
    try {
        // Exemplo de implementação - substitua pela sua
        const resultado = await processarComImgLarger(buffer, mimeType, escala);
        
        return {
            status: "sucesso",
            url: resultado.imageUrl,
            codigo: resultado.code,
            tentativas: resultado.attempts || 1,
            mensagem: "Upscale concluído com sucesso"
        };
        
    } catch (error) {
        return {
            status: "erro",
            mensagem: error.message,
            tentativas: 0
        };
    }
}

// ==================== FUNÇÕES AUXILIARES ====================

/**
 * Valida URL de imagem
 * @param {string} url - URL para validar
 * @returns {boolean} True se válida
 */
export function validarUrlImagem(url) {
    try {
        const urlObj = new URL(url);
        const extensoes = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];
        const pathname = urlObj.pathname.toLowerCase();
        
        return extensoes.some(ext => pathname.endsWith(ext));
    } catch {
        return false;
    }
}

/**
 * Obtém informações da imagem
 * @param {string} imageUrl - URL da imagem
 * @returns {Promise<Object>} Informações
 */
export async function getImageInfo(imageUrl) {
    try {
        const response = await axios.head(imageUrl, { timeout: 10000 });
        
        return {
            content_type: response.headers['content-type'],
            content_length: response.headers['content-length'],
            last_modified: response.headers['last-modified'],
            valid: true
        };
    } catch (error) {
        return {
            valid: false,
            error: error.message
        };
    }
}

/**
 * Faz download da imagem como buffer
 * @param {string} imageUrl - URL da imagem
 * @returns {Promise<Buffer>} Buffer da imagem
 */
export async function downloadImageBuffer(imageUrl) {
    try {
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 15000,
            maxContentLength: 10 * 1024 * 1024 // 10MB max
        });

        return Buffer.from(response.data);
    } catch (error) {
        throw new Error(`Falha ao baixar imagem: ${error.message}`);
    }
}

/**
 * Valida se o buffer é uma imagem válida
 * @param {Buffer} buffer - Buffer para validar
 * @returns {boolean} True se válido
 */
export function validarBufferImagem(buffer) {
    if (!buffer || buffer.length === 0) {
        return false;
    }

    // Verifica assinaturas de arquivos de imagem
    const signatures = {
        jpeg: [0xFF, 0xD8, 0xFF],
        png: [0x89, 0x50, 0x4E, 0x47],
        gif: [0x47, 0x49, 0x46],
        webp: [0x52, 0x49, 0x46, 0x46]
    };

    for (const [format, signature] of Object.entries(signatures)) {
        const matches = signature.every((byte, index) => buffer[index] === byte);
        if (matches) return true;
    }

    return false;
}

/**
 * Testa o serviço de upscale
 * @returns {Promise<Object>} Status do serviço
 */
export async function testUpscaleService() {
    try {
        // Imagem de teste pequena
        const testImageUrl = 'https://via.placeholder.com/100x100.png';
        const buffer = await downloadImageBuffer(testImageUrl);
        
        return {
            service: 'upscale',
            status: 'operational',
            max_file_size: '10MB',
            supported_scales: [2, 3, 4],
            supported_formats: ['JPEG', 'PNG', 'WEBP', 'GIF', 'BMP'],
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            service: 'upscale',
            status: 'degraded',
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}