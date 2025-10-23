import { ytmp3, ytmp4 } from 'ruhend-scraper';
import { buscarMelhorVideo, downloadYouTube } from './youtubeService.js';
import freshVideoService from './freshVideoService.js';
import axios from 'axios';

class YoutubeConverterService {
    constructor() {
        this.converters = { ytmp3, ytmp4 };
    }

    /**
     * Estratégia principal - tenta múltiplos métodos
     */
    async searchAndConvert(query, format = 'mp3') {
        console.log(`🎯 Iniciando conversão para: "${query}" em ${format}`);

        const methods = [
            { name: 'ruhend-scraper', fn: () => this._tryRuhendScraper(query, format) },
            { name: 'fresh-urls', fn: () => this._tryFreshUrls(query, format) },
            { name: 'your-existing-service', fn: () => this._tryExistingService(query, format) },
            { name: 'simple-fallback', fn: () => this._trySimpleFallback(query, format) }
        ];

        for (const method of methods) {
            try {
                console.log(`\n🔄 Tentando método: ${method.name}`);
                const result = await method.fn();
                console.log(`✅ Método ${method.name} funcionou!`);
                return result;
            } catch (error) {
                console.log(`❌ Método ${method.name} falhou: ${error.message}`);
                // Continua para o próximo método
            }
        }

        throw new Error(`Todos os métodos falharam para: "${query}"`);
    }

    /**
     * Método 1: ruhend-scraper
     */
    async _tryRuhendScraper(query, format) {
        const searchResult = await buscarMelhorVideo(query);
        
        if (!searchResult || !searchResult.url) {
            throw new Error('Nenhum vídeo encontrado');
        }

        const converter = format === 'mp3' ? this.converters.ytmp3 : this.converters.ytmp4;
        const convertedData = await converter(searchResult.url);

        const downloadUrl = format === 'mp3' ? convertedData.audio : convertedData.video;
        
        if (!downloadUrl) {
            throw new Error('URL de download não retornada pelo ruhend-scraper');
        }

        // Testar a URL
        const testResult = await freshVideoService.testVideoUrl(downloadUrl);
        
        if (!testResult.isWorking) {
            throw new Error('URL do ruhend-scraper não está funcionando');
        }

        return {
            success: true,
            data: {
                searchInfo: {
                    query,
                    videoTitle: searchResult.title,
                    videoUrl: searchResult.url,
                    channel: searchResult.author?.name,
                    duration: searchResult.duration?.timestamp,
                    thumbnail: searchResult.thumbnail
                },
                downloadInfo: this.formatConverterResponse(convertedData, format)
            },
            source: 'ruhend-scraper'
        };
    }

    /**
     * Método 2: URLs frescas com yt-dlp
     */
    async _tryFreshUrls(query, format) {
        const searchResult = await buscarMelhorVideo(query);
        
        if (!searchResult || !searchResult.url) {
            throw new Error('Nenhum vídeo encontrado');
        }

        const freshUrlResult = await freshVideoService.getFreshVideoUrl(
            searchResult.url, 
            format === 'mp3' ? 'audio' : 'video'
        );

        // Testar a URL
        const testResult = await freshVideoService.testVideoUrl(freshUrlResult.data.url);
        
        // Aceitar HLS como funcionando, mas marcar como não direto
        const isAcceptable = testResult.isWorking || testResult.isHls;
        
        if (!isAcceptable) {
            throw new Error('URL não está funcionando');
        }

        return {
            success: true,
            data: {
                searchInfo: {
                    query,
                    videoTitle: searchResult.title,
                    videoUrl: searchResult.url,
                    channel: searchResult.author?.name,
                    duration: searchResult.duration?.timestamp,
                    thumbnail: searchResult.thumbnail
                },
                downloadInfo: {
                    title: freshUrlResult.data.title,
                    downloadUrl: freshUrlResult.data.url,
                    format: format,
                    fileType: format === 'mp3' ? 'audio' : 'video',
                    duration: freshUrlResult.data.duration,
                    thumbnail: freshUrlResult.data.thumbnail,
                    size: freshUrlResult.data.filesize,
                    tested: true,
                    working: testResult.isWorking,
                    isHls: testResult.isHls,
                    isDirect: testResult.isDirect,
                    note: testResult.isHls ? 'URL HLS - pode não funcionar em todos os players' : 'URL direta'
                }
            },
            source: 'fresh-urls'
        };
    }

    /**
     * Método 3: Seu serviço existente (downloadYouTube)
     */
    async _tryExistingService(query, format) {
        console.log('🔧 Usando seu serviço YouTube existente...');
        
        // Usa sua função downloadYouTube que já funciona
        const videoInfo = await downloadYouTube(query, 
            format === 'mp3' ? 'audio' : 'video', 
            'perfect'
        );

        if (!videoInfo.url) {
            throw new Error('Serviço existente não retornou URL');
        }

        return {
            success: true,
            data: {
                searchInfo: {
                    query,
                    videoTitle: videoInfo.title,
                    videoUrl: videoInfo.url,
                    thumbnail: videoInfo.thumbnail,
                    duration: videoInfo.duration
                },
                downloadInfo: {
                    title: videoInfo.title,
                    downloadUrl: videoInfo.url,
                    format: format,
                    fileType: format === 'mp3' ? 'audio' : 'video',
                    duration: videoInfo.duration,
                    thumbnail: videoInfo.thumbnail,
                    size: videoInfo.filesize
                }
            },
            source: 'existing-service'
        };
    }

    /**
     * Método 4: Fallback simples
     */
    async _trySimpleFallback(query, format) {
        console.log('🆘 Usando fallback simples...');
        
        const searchResult = await buscarMelhorVideo(query);
        
        if (!searchResult || !searchResult.url) {
            throw new Error('Nenhum vídeo encontrado');
        }

        // Retorna informações básicas sem URL de download
        return {
            success: true,
            data: {
                searchInfo: {
                    query,
                    videoTitle: searchResult.title,
                    videoUrl: searchResult.url,
                    channel: searchResult.author?.name,
                    duration: searchResult.duration?.timestamp,
                    thumbnail: searchResult.thumbnail
                },
                downloadInfo: {
                    title: searchResult.title,
                    downloadUrl: null, // Sem URL de download
                    format: format,
                    fileType: format === 'mp3' ? 'audio' : 'video',
                    duration: searchResult.duration?.timestamp,
                    thumbnail: searchResult.thumbnail,
                    note: 'Serviço temporariamente indisponível. Use o link do YouTube diretamente.'
                }
            },
            source: 'simple-fallback'
        };
    }

    /**
     * Converte uma URL do YouTube diretamente
     */
    async convertDirectly(youtubeUrl, format = 'mp3') {
        try {
            console.log(`🔗 Convertendo URL diretamente: ${youtubeUrl}`);

            if (!this.isYouTubeUrl(youtubeUrl)) {
                throw new Error('URL do YouTube inválida');
            }

            const converter = format.toLowerCase() === 'mp3' ? this.converters.ytmp3 : this.converters.ytmp4;
            const convertedData = await converter(youtubeUrl);

            return {
                success: true,
                data: {
                    downloadInfo: this.formatConverterResponse(convertedData, format)
                },
                source: 'direct-convert'
            };

        } catch (error) {
            console.error('Erro na conversão direta:', error);
            
            // Se o ruhend-scraper falhar, tenta com o serviço existente
            try {
                console.log('🔄 Ruhend-scraper falhou, tentando serviço existente...');
                const videoInfo = await downloadYouTube(
                    youtubeUrl,
                    format === 'mp3' ? 'audio' : 'video',
                    'perfect'
                );

                if (!videoInfo.url) {
                    throw new Error('Serviço existente também falhou');
                }

                return {
                    success: true,
                    data: {
                        downloadInfo: {
                            title: videoInfo.title,
                            downloadUrl: videoInfo.url,
                            format: format,
                            fileType: format === 'mp3' ? 'audio' : 'video',
                            duration: videoInfo.duration,
                            thumbnail: videoInfo.thumbnail,
                            size: videoInfo.filesize
                        }
                    },
                    source: 'existing-service-fallback'
                };

            } catch (fallbackError) {
                throw new Error(`Falha ao converter URL: ${error.message}`);
            }
        }
    }

    /**
     * Formata a resposta do conversor
     */
    formatConverterResponse(data, format) {
        const isMp3 = format.toLowerCase() === 'mp3';
        
        return {
            title: data.title,
            author: data.author,
            duration: data.duration,
            views: data.views,
            uploadDate: data.upload,
            thumbnail: data.thumbnail,
            description: data.description,
            
            // Dados específicos do formato
            downloadUrl: isMp3 ? data.audio : data.video,
            format: isMp3 ? 'mp3' : 'mp4',
            fileType: isMp3 ? 'audio' : 'video',
            
            // Metadados adicionais
            metadata: {
                hasAudio: !!data.audio,
                hasVideo: !isMp3 ? !!data.video : false,
                canDownload: isMp3 ? !!data.audio : !!data.video,
                quality: isMp3 ? 'audio' : 'video'
            }
        };
    }

    /**
     * Valida se é uma URL do YouTube
     */
    isYouTubeUrl(url) {
        const youtubePatterns = [
            /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)/,
            /youtube\.com\/watch\?.*v=[^&]+/,
            /youtu\.be\/[^&]+/
        ];

        return youtubePatterns.some(pattern => pattern.test(url));
    }

    /**
     * Obtém informações disponíveis para conversão
     */
    async getConversionInfo(query) {
        try {
            let videoInfo;
            let isUrl = this.isYouTubeUrl(query);

            if (isUrl) {
                // Se for URL, usa conversão direta para obter info
                const mp3Data = await this.converters.ytmp3(query);
                videoInfo = {
                    title: mp3Data.title,
                    author: mp3Data.author,
                    duration: mp3Data.duration,
                    thumbnail: mp3Data.thumbnail,
                    url: query
                };
            } else {
                // Se for query de busca, usa search
                const searchResult = await buscarMelhorVideo(query);
                videoInfo = {
                    title: searchResult.title,
                    author: searchResult.author?.name,
                    duration: searchResult.duration?.timestamp,
                    thumbnail: searchResult.thumbnail,
                    url: searchResult.url
                };
            }

            return {
                success: true,
                data: {
                    query,
                    isUrl,
                    video: videoInfo,
                    availableFormats: ['mp3', 'mp4'],
                    conversionOptions: {
                        mp3: { type: 'audio', quality: 'high', format: 'mp3' },
                        mp4: { type: 'video', quality: 'high', format: 'mp4' }
                    }
                }
            };

        } catch (error) {
            console.error('Erro ao obter informações de conversão:', error);
            throw new Error(`Falha ao obter informações: ${error.message}`);
        }
    }

    /**
     * Health check do serviço
     */
    async healthCheck() {
        try {
            // Testa com uma busca simples
            const testQuery = 'rick astley never gonna give you up';
            const searchResult = await buscarMelhorVideo(testQuery);
            
            return !!(searchResult && searchResult.url);
        } catch (error) {
            console.error('Health check failed:', error.message);
            return false;
        }
    }

    /**
     * Baixa o arquivo MP3/MP4 e retorna como buffer
     */
    async downloadMediaBuffer(downloadUrl, format = 'mp3') {
        try {
            console.log(`📥 Baixando mídia como buffer: ${downloadUrl.substring(0, 100)}...`);

            const response = await axios.get(downloadUrl, {
                responseType: 'arraybuffer',
                timeout: 60000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': format === 'mp3' ? 'audio/*' : 'video/*',
                    'Referer': 'https://www.youtube.com/'
                }
            });

            if (response.status !== 200) {
                throw new Error(`Erro no download: Status ${response.status}`);
            }

            return Buffer.from(response.data);

        } catch (error) {
            console.error('Erro no download do buffer:', error);
            throw new Error(`Falha no download: ${error.message}`);
        }
    }
}

const youtubeConverterService = new YoutubeConverterService();
export default youtubeConverterService;