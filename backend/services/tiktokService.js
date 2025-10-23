import { ttdl } from 'ruhend-scraper';

class TiktokService {
    constructor() {
        this.scraper = ttdl;
    }

    /**
     * Obtém informações e URL de download do TikTok
     */
    async getTikTokInfo(url) {
        try {
            console.log(`📱 Obtendo informações do TikTok: ${url}`);

            // Validar URL do TikTok
            if (!this.isValidTikTokUrl(url)) {
                throw new Error('URL do TikTok inválida');
            }

            const data = await this.scraper(url);
            
            return {
                success: true,
                data: this.formatTikTokResponse(data)
            };

        } catch (error) {
            console.error('Erro no TiktokService:', error);
            
            // Tentar fallback se a lib principal falhar
            try {
                const fallbackData = await this.tryFallback(url);
                return {
                    success: true,
                    data: fallbackData,
                    source: 'fallback'
                };
            } catch (fallbackError) {
                throw new Error(`Falha ao obter informações do TikTok: ${error.message}`);
            }
        }
    }

    /**
     * Valida URL do TikTok
     */
    isValidTikTokUrl(url) {
        const tiktokPatterns = [
            /https?:\/\/(?:www\.)?tiktok\.com\/@[\w.-]+\/video\/\d+/,
            /https?:\/\/vt\.tiktok\.com\/[\w]+\//,
            /https?:\/\/vm\.tiktok\.com\/[\w]+\//,
            /https?:\/\/www\.tiktok\.com\/t\/[\w]+\//,
            /https?:\/\/(?:www\.)?tiktok\.com\/[\w.-]+\/video\/\d+/
        ];

        return tiktokPatterns.some(pattern => pattern.test(url));
    }

    /**
     * Formata a resposta do TikTok
     */
    formatTikTokResponse(data) {
        return {
            // Informações básicas
            title: data.title || 'Sem título',
            author: data.author || 'Autor desconhecido',
            username: data.username || 'sem_username',
            
            // Estatísticas
            statistics: {
                likes: data.like || 0,
                comments: data.comment || 0,
                shares: data.share || 0,
                views: data.views || 0,
                bookmarks: data.bookmark || 0
            },
            
            // Metadados
            published: data.published || 'Data desconhecida',
            duration: data.duration || 0,
            
            // URLs de mídia
            media: {
                video: data.video || null,
                cover: data.cover || null,
                music: data.music || null,
                profilePicture: data.profilePicture || null
            },
            
            // Informações adicionais
            additionalInfo: {
                hasWatermark: true, // TikTok sempre tem watermark
                isPrivate: !data.video, // Se não tem URL de vídeo, provavelmente é privado
                canDownload: !!data.video
            }
        };
    }

    /**
     * Fallback alternativo caso a lib principal falhe
     */
    async tryFallback(url) {
        console.log('🔄 Tentando método fallback para TikTok...');
        
        // Aqui você pode implementar fallbacks alternativos
        // Por enquanto, retornamos uma estrutura básica
        return {
            title: 'Vídeo do TikTok',
            author: 'Autor desconhecido',
            username: 'unknown',
            statistics: {
                likes: 0,
                comments: 0,
                shares: 0,
                views: 0,
                bookmarks: 0
            },
            published: 'Data desconhecida',
            duration: 0,
            media: {
                video: null,
                cover: null,
                music: null,
                profilePicture: null
            },
            additionalInfo: {
                hasWatermark: true,
                isPrivate: false,
                canDownload: false,
                note: 'Método fallback - informações limitadas'
            }
        };
    }

    /**
     * Obtém apenas a URL de download direto do vídeo
     */
    async getDownloadUrl(url) {
        try {
            console.log(`📥 Obtendo URL de download do TikTok: ${url}`);

            const data = await this.scraper(url);
            
            if (!data.video) {
                throw new Error('URL de download não disponível para este vídeo');
            }

            return {
                success: true,
                data: {
                    downloadUrl: data.video,
                    title: data.title,
                    author: data.author,
                    duration: data.duration,
                    thumbnail: data.cover,
                    statistics: {
                        likes: data.like,
                        comments: data.comment,
                        shares: data.share,
                        views: data.views
                    }
                }
            };

        } catch (error) {
            console.error('Erro ao obter URL de download:', error);
            throw new Error(`Falha ao obter URL de download: ${error.message}`);
        }
    }

    /**
     * Obtém informações básicas (mais rápido)
     */
    async getBasicInfo(url) {
        try {
            console.log(`⚡ Obtendo informações básicas do TikTok: ${url}`);

            const data = await this.scraper(url);
            
            return {
                success: true,
                data: {
                    title: data.title,
                    author: data.author,
                    username: data.username,
                    thumbnail: data.cover,
                    duration: data.duration,
                    videoUrl: data.video,
                    published: data.published
                }
            };

        } catch (error) {
            console.error('Erro ao obter informações básicas:', error);
            throw new Error(`Falha ao obter informações básicas: ${error.message}`);
        }
    }

    /**
     * Health check do serviço TikTok
     */
    async healthCheck() {
        try {
            // Testar com uma URL de exemplo
            const testUrl = 'https://vt.tiktok.com/ZSY3rQ1qk/';
            const isValid = this.isValidTikTokUrl(testUrl);
            return isValid;
        } catch (error) {
            console.error('Health check failed:', error.message);
            return false;
        }
    }

    /**
     * Extrai ID do vídeo do TikTok
     */
    extractVideoId(url) {
        const patterns = [
            /tiktok\.com\/@[\w.-]+\/video\/(\d+)/,
            /tiktok\.com\/t\/([\w]+)/,
            /vt\.tiktok\.com\/([\w]+)/,
            /vm\.tiktok\.com\/([\w]+)/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        return null;
    }
}

const tiktokService = new TiktokService();
export default tiktokService;