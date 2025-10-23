import savefromService from '../services/savefromService.js';

const savefromController = {
    /**
     * @route GET /api/download
     * @desc Baixar vídeo do YouTube
     * @access Public
     */
    downloadVideo: async (req, res) => {
        try {
            const { url, quality = 'best' } = req.query;

            if (!url) {
                return res.status(400).json({
                    success: false,
                    message: 'URL do vídeo é obrigatória'
                });
            }

            // Validar se é uma URL do YouTube
            if (!savefromService.isValidYouTubeUrl(url)) {
                return res.status(400).json({
                    success: false,
                    message: 'URL do YouTube inválida'
                });
            }

            console.log(`Processando download para: ${url}`);
            
            const downloadInfo = await savefromService.getDownloadLinks(url, quality);
            
            res.json({
                success: true,
                data: downloadInfo
            });

        } catch (error) {
            console.error('Erro no controller:', error.message);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    },

    /**
     * @route GET /api/video-info
     * @desc Obter informações do vídeo
     * @access Public
     */
    getVideoInfo: async (req, res) => {
        try {
            const { url } = req.query;

            if (!url) {
                return res.status(400).json({
                    success: false,
                    message: 'URL do vídeo é obrigatória'
                });
            }

            const videoInfo = await savefromService.getVideoInfo(url);
            
            res.json({
                success: true,
                data: videoInfo
            });

        } catch (error) {
            console.error('Erro ao obter informações do vídeo:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao obter informações do vídeo',
                error: error.message
            });
        }
    },

    /**
     * @route GET /api/health
     * @desc Health check do serviço SaveFrom
     * @access Public
     */
    healthCheck: async (req, res) => {
        try {
            const isHealthy = await savefromService.healthCheck();
            
            res.json({
                success: true,
                data: {
                    service: 'SaveFrom Scraper',
                    status: isHealthy ? 'healthy' : 'unhealthy',
                    timestamp: new Date().toISOString()
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

export { savefromController };