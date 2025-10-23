import youtubeConverterService from '../services/youtubeConverterService.js';

const youtubeConverterController = {
    /**
     * @route GET /api/youtube/convert
     * @desc Converte busca ou URL para MP3/MP4
     * @access Public
     */
    convertMedia: async (req, res) => {
        try {
            const { query, format = 'mp3' } = req.query;

            if (!query) {
                return res.status(400).json({
                    success: false,
                    message: 'Query ou URL é obrigatória'
                });
            }

            if (!['mp3', 'mp4'].includes(format.toLowerCase())) {
                return res.status(400).json({
                    success: false,
                    message: 'Formato deve ser mp3 ou mp4'
                });
            }

            console.log(`🎵 Requisição de conversão: ${format.toUpperCase()} para "${query}"`);
            
            const result = await youtubeConverterService.searchAndConvert(query, format);
            
            res.json(result);

        } catch (error) {
            console.error('Erro no converter controller:', error.message);
            res.status(500).json({
                success: false,
                message: 'Erro ao converter mídia',
                error: error.message
            });
        }
    },

    /**
     * @route GET /api/youtube/convert/direct
     * @desc Converte URL do YouTube diretamente para MP3/MP4
     * @access Public
     */
    convertDirect: async (req, res) => {
        try {
            const { url, format = 'mp3' } = req.query;

            if (!url) {
                return res.status(400).json({
                    success: false,
                    message: 'URL do YouTube é obrigatória'
                });
            }

            console.log(`🔗 Conversão direta: ${format.toUpperCase()} para URL`);
            
            const result = await youtubeConverterService.convertDirectly(url, format);
            
            res.json(result);

        } catch (error) {
            console.error('Erro na conversão direta:', error.message);
            res.status(500).json({
                success: false,
                message: 'Erro na conversão direta',
                error: error.message
            });
        }
    },

    /**
     * @route GET /api/youtube/convert/info
     * @desc Obtém informações sobre conversão disponível
     * @access Public
     */
    getConversionInfo: async (req, res) => {
        try {
            const { query } = req.query;

            if (!query) {
                return res.status(400).json({
                    success: false,
                    message: 'Query ou URL é obrigatória'
                });
            }

            console.log(`ℹ️ Obtendo informações de conversão para: "${query}"`);
            
            const result = await youtubeConverterService.getConversionInfo(query);
            
            res.json(result);

        } catch (error) {
            console.error('Erro ao obter informações:', error.message);
            res.status(500).json({
                success: false,
                message: 'Erro ao obter informações',
                error: error.message
            });
        }
    },

    /**
     * @route GET /api/youtube/convert/health
     * @desc Health check do serviço de conversão
     * @access Public
     */
    healthCheck: async (req, res) => {
        try {
            const isHealthy = await youtubeConverterService.healthCheck();
            
            res.json({
                success: true,
                data: {
                    service: 'YouTube Converter',
                    status: isHealthy ? 'healthy' : 'unhealthy',
                    timestamp: new Date().toISOString(),
                    version: 'v1.0.0',
                    features: ['mp3-conversion', 'mp4-conversion', 'search-integration']
                }
            });

        } catch (error) {
            res.status(503).json({
                success: false,
                message: 'Serviço indisponível',
                error: error.message
            });
        }
    }
};

export { youtubeConverterController };