import tiktokService from '../services/tiktokService.js';

const tiktokController = {
    /**
     * @route GET /api/tiktok/info
     * @desc Obter informações completas do vídeo do TikTok
     * @access Public
     */
    getTikTokInfo: async (req, res) => {
        try {
            const { url } = req.query;

            if (!url) {
                return res.status(400).json({
                    success: false,
                    message: 'URL do TikTok é obrigatória'
                });
            }

            console.log(`📱 Requisição para TikTok: ${url}`);
            
            const result = await tiktokService.getTikTokInfo(url);
            
            res.json(result);

        } catch (error) {
            console.error('Erro no TikTok controller:', error.message);
            res.status(500).json({
                success: false,
                message: 'Erro ao obter informações do TikTok',
                error: error.message
            });
        }
    },

    /**
     * @route GET /api/tiktok/download
     * @desc Obter URL de download direto do TikTok
     * @access Public
     */
    getDownloadUrl: async (req, res) => {
        try {
            const { url } = req.query;

            if (!url) {
                return res.status(400).json({
                    success: false,
                    message: 'URL do TikTok é obrigatória'
                });
            }

            console.log(`📥 Requisição de download para TikTok: ${url}`);
            
            const result = await tiktokService.getDownloadUrl(url);
            
            res.json(result);

        } catch (error) {
            console.error('Erro ao obter URL de download:', error.message);
            res.status(500).json({
                success: false,
                message: 'Erro ao obter URL de download',
                error: error.message
            });
        }
    },

    /**
     * @route GET /api/tiktok/basic
     * @desc Obter informações básicas do TikTok (mais rápido)
     * @access Public
     */
    getBasicInfo: async (req, res) => {
        try {
            const { url } = req.query;

            if (!url) {
                return res.status(400).json({
                    success: false,
                    message: 'URL do TikTok é obrigatória'
                });
            }

            console.log(`⚡ Requisição básica para TikTok: ${url}`);
            
            const result = await tiktokService.getBasicInfo(url);
            
            res.json(result);

        } catch (error) {
            console.error('Erro ao obter informações básicas:', error.message);
            res.status(500).json({
                success: false,
                message: 'Erro ao obter informações básicas',
                error: error.message
            });
        }
    },

    /**
     * @route GET /api/tiktok/validate
     * @desc Validar URL do TikTok
     * @access Public
     */
    validateUrl: async (req, res) => {
        try {
            const { url } = req.query;

            if (!url) {
                return res.status(400).json({
                    success: false,
                    message: 'URL é obrigatória'
                });
            }

            const isValid = tiktokService.isValidTikTokUrl(url);
            const videoId = tiktokService.extractVideoId(url);

            res.json({
                success: true,
                data: {
                    url,
                    isValid,
                    videoId,
                    platform: 'TikTok'
                }
            });

        } catch (error) {
            console.error('Erro ao validar URL:', error.message);
            res.status(500).json({
                success: false,
                message: 'Erro ao validar URL',
                error: error.message
            });
        }
    },

    /**
     * @route GET /api/tiktok/health
     * @desc Health check do serviço TikTok
     * @access Public
     */
    healthCheck: async (req, res) => {
        try {
            const isHealthy = await tiktokService.healthCheck();
            
            res.json({
                success: true,
                data: {
                    service: 'TikTok Scraper',
                    status: isHealthy ? 'healthy' : 'unhealthy',
                    timestamp: new Date().toISOString(),
                    version: 'v1.0.0'
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

export { tiktokController };