// services/tofigureService.js
import axios from 'axios';
import FormData from 'form-data';

// Configuração do axios
const api = axios.create({
    timeout: 180000, // 30 segundos
    timeoutErrorMessage: 'Tempo limite excedido'
});

// Servidores de upload
const UPLOAD_SERVERS = [
    {
        name: 'tmpfiles.org',
        url: 'https://tmpfiles.org/api/v1/upload',
        field: 'file', 
        getUrl: (response) => response.data.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/')
    },
    {
        name: 'uguu.se',
        url: 'https://uguu.se/upload.php',
        field: 'files[]',
        getUrl: (response) => response.data.files[0].url
    }
];

// API de conversão
const FIGURE_API_URL = 'https://api.nekolabs.my.id/tools/convert/tofigure';

// ==================== FUNÇÕES PRINCIPAIS ====================

/**
 * Versão 1 - Upload simples no uguu.se
 * @param {Object} file - Arquivo do multer
 * @returns {Promise<Object>} Resultado
 */
export async function convertToFigureV1(file) {
    try {
        // Upload para uguu.se
        const form = new FormData();
        form.append('files[]', file.buffer, {
            filename: file.originalname || 'image.jpg',
            contentType: file.mimetype
        });

        const uploadResponse = await axios.post('https://uguu.se/upload.php', form, {
            headers: form.getHeaders()
        });

        const uploadedUrl = uploadResponse.data.files[0].url;
        console.log('✅ Upload feito:', uploadedUrl);

        // Converter para figure
        console.log('🎨 Convertendo para figure...');
        const figureResponse = await axios.get(
            `${FIGURE_API_URL}?imageUrl=${encodeURIComponent(uploadedUrl)}`
        );

        const figureUrl = figureResponse.data.result;
        console.log('✅ Figure criado:', figureUrl);

        return {
            uploadedUrl,
            figureUrl
        };

    } catch (error) {
        console.error('❌ Erro no convertToFigureV1:', error.message);
        throw new Error(`Falha na conversão: ${error.message}`);
    }
}

/**
 * Versão 2 - Com múltiplos servidores e retry
 * @param {Object} file - Arquivo do multer
 * @returns {Promise<Object>} Resultado
 */
export async function convertToFigureV2(file) {
    try {
        // Upload com múltiplos servidores
        const uploadedUrl = await uploadToServer(file);
        
        if (!uploadedUrl) {
            throw new Error('Todos os servidores de upload falharam');
        }

        // Conversão com retry
        const figureUrl = await convertWithRetry(uploadedUrl);
        
        return { figureUrl };

    } catch (error) {
        console.error('❌ Erro no convertToFigureV2:', error.message);
        throw new Error(`Falha na conversão: ${error.message}`);
    }
}

/**
 * Upload para figure (versão simplificada)
 * @param {Object} file - Arquivo do multer
 * @returns {Promise<Object>} Resultado
 */
export async function uploadAndConvertToFigure(file) {
    try {
        // Upload para servidor temporário
        const form = new FormData();
        form.append('files[]', file.buffer, { 
            filename: 'image.jpg' 
        });

        const uploadResponse = await axios.post('https://uguu.se/upload.php', form, { 
            headers: form.getHeaders() 
        });

        const imageUrl = encodeURIComponent(uploadResponse.data.files[0].url);

        // Converte para figure
        const result = await axios.get(`${FIGURE_API_URL}?imageUrl=${imageUrl}`);

        return {
            figureUrl: result.data.result
        };

    } catch (error) {
        console.error('❌ Erro no uploadAndConvertToFigure:', error.message);
        throw new Error(`Falha no upload: ${error.message}`);
    }
}

// ==================== FUNÇÕES AUXILIARES ====================

/**
 * Faz upload para servidor com fallback
 * @param {Object} file - Arquivo do multer
 * @returns {Promise<string>} URL do upload
 */
async function uploadToServer(file) {
    for (const server of UPLOAD_SERVERS) {
        try {
            console.log(`🔄 Tentando upload em: ${server.name}`);
            
            const uploadForm = new FormData();
            uploadForm.append(server.field, file.buffer, {
                filename: 'image.jpg',
                contentType: file.mimetype
            });

            const uploadResponse = await api.post(server.url, uploadForm, {
                headers: uploadForm.getHeaders(),
                timeout: 15000
            });

            const uploadedUrl = server.getUrl(uploadResponse);
            console.log(`✅ Upload bem-sucedido no ${server.name}: ${uploadedUrl}`);
            return uploadedUrl;
            
        } catch (uploadError) {
            console.log(`❌ Falha no ${server.name}:`, uploadError.message);
            continue;
        }
    }
    
    return null;
}

/**
 * Converte imagem com sistema de retry
 * @param {string} imageUrl - URL da imagem
 * @returns {Promise<string>} URL do figure
 */
async function convertWithRetry(imageUrl) {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
        try {
            attempts++;
            console.log(`🎨 Tentativa ${attempts} de conversão...`);
            
            const figureResponse = await api.get(
                `${FIGURE_API_URL}?imageUrl=${encodeURIComponent(imageUrl)}`,
                { timeout: 20000 }
            );
            
            const figureUrl = figureResponse.data.result;
            console.log(`✅ Conversão bem-sucedida: ${figureUrl}`);
            return figureUrl;
            
        } catch (figureError) {
            console.log(`❌ Tentativa ${attempts} falhou:`, figureError.message);
            if (attempts === maxAttempts) {
                throw new Error(`Falha após ${maxAttempts} tentativas: ${figureError.message}`);
            }
            // Aguarda antes de tentar novamente
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    throw new Error('Número máximo de tentativas excedido');
}

/**
 * Valida arquivo de imagem
 * @param {Object} file - Arquivo do multer
 * @returns {boolean} True se válido
 */
export function validateImageFile(file) {
    if (!file) return false;
    if (!file.mimetype.startsWith('image/')) return false;
    if (file.size > 10 * 1024 * 1024) return false; // 10MB
    return true;
}

/**
 * Testa a conexão com os serviços
 * @returns {Promise<Object>} Status dos serviços
 */
export async function testToFigureServices() {
    const results = {
        upload_servers: {},
        conversion_api: {}
    };

    // Testa servidores de upload
    for (const server of UPLOAD_SERVERS) {
        try {
            const testResponse = await axios.get(server.url.split('/upload')[0], { 
                timeout: 10000 
            });
            results.upload_servers[server.name] = {
                status: 'online',
                response_time: testResponse.headers['x-response-time'] || 'unknown'
            };
        } catch (error) {
            results.upload_servers[server.name] = {
                status: 'offline',
                error: error.message
            };
        }
    }

    // Testa API de conversão
    try {
        const testResponse = await axios.get(FIGURE_API_URL, { 
            timeout: 10000 
        });
        results.conversion_api = {
            status: 'online',
            url: FIGURE_API_URL
        };
    } catch (error) {
        results.conversion_api = {
            status: 'offline',
            error: error.message
        };
    }

    return results;
}