import ytdlp from 'yt-dlp-exec';
import axios from 'axios';

class FreshVideoService {
    constructor() {
        this.timeout = 30000;
    }

    /**
     * Obtém URL fresca do vídeo/áudio do YouTube
     */
    async getFreshVideoUrl(youtubeUrl, format = 'audio') {
        try {
            console.log(`🔄 Obtendo URL fresca para: ${youtubeUrl}`);
            console.log(`📝 Formato solicitado: ${format}`);

            // Opções base
            const baseOptions = {
                dumpJson: true,
                noWarnings: true,
                noCallHome: true,
                noCheckCertificate: true,
                preferFreeFormats: true,
                youtubeSkipDashManifest: true,
            };

            let options;
            
            if (format === 'audio') {
                // Para áudio: forçar formatos MP3/MP4 diretos
                options = {
                    ...baseOptions,
                    format: 'bestaudio[ext=mp3]/bestaudio[ext=m4a]/bestaudio'
                };
            } else {
                // Para vídeo: forçar formatos MP4 diretos e evitar HLS
                options = {
                    ...baseOptions,
                    format: 'bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]/best[ext=mp4][height<=720]/best[height<=720]'
                };
            }

            console.log('⚙️ Opções do yt-dlp:', options);

            const info = await ytdlp(youtubeUrl, options);
            
            console.log('📦 Resposta do yt-dlp:', {
                hasUrl: !!info.url,
                url: info.url ? `${info.url.substring(0, 100)}...` : 'N/A',
                urlType: info.url ? this.getUrlType(info.url) : 'N/A',
                title: info.title,
                duration: info.duration,
                ext: info.ext,
                protocol: info.protocol
            });

            // Verificar se a URL é HLS (que não funciona direito)
            if (info.url && this.isHlsUrl(info.url)) {
                console.log('⚠️ URL é HLS, tentando obter formato direto...');
                const directUrl = await this.getDirectUrl(youtubeUrl, format);
                if (directUrl) {
                    return this.formatSuccessResponse(info, directUrl);
                }
            }

            // Estratégia 1: URL direta
            if (info.url && !this.isHlsUrl(info.url)) {
                console.log('✅ URL direta encontrada');
                return this.formatSuccessResponse(info, info.url);
            }

            // Estratégia 2: Formatos solicitados
            if (info.requested_formats && info.requested_formats.length > 0) {
                const directFormat = info.requested_formats.find(f => 
                    f.url && !this.isHlsUrl(f.url)
                );
                if (directFormat) {
                    console.log('✅ URL encontrada em requested_formats');
                    return this.formatSuccessResponse(info, directFormat.url);
                }
            }

            // Estratégia 3: Lista de formatos
            if (info.formats && info.formats.length > 0) {
                // Filtrar formatos diretos (não HLS)
                const directFormats = info.formats.filter(f => 
                    f.url && !this.isHlsUrl(f.url) && this.isDirectFormat(f, format)
                );

                // Ordenar por qualidade
                const sortedFormats = directFormats.sort((a, b) => {
                    if (format === 'audio') {
                        return (b.abr || 0) - (a.abr || 0);
                    } else {
                        return (b.height || 0) - (a.height || 0);
                    }
                });

                if (sortedFormats.length > 0) {
                    console.log('✅ URL direta encontrada em formats');
                    return this.formatSuccessResponse(info, sortedFormats[0].url);
                }
            }

            // Se chegou aqui, tentar método mais agressivo
            console.log('🔄 Tentando método agressivo...');
            const aggressiveUrl = await this.getAggressiveUrl(youtubeUrl, format);
            if (aggressiveUrl) {
                return this.formatSuccessResponse(info, aggressiveUrl);
            }

            throw new Error('Nenhuma URL direta encontrada');

        } catch (error) {
            console.error('❌ Erro no getFreshVideoUrl:', error.message);
            throw new Error(`Falha ao obter URL: ${error.message}`);
        }
    }

    /**
     * Formata resposta de sucesso
     */
    formatSuccessResponse(info, url) {
        return {
            success: true,
            data: {
                url: url,
                title: info.title,
                duration: info.duration,
                thumbnail: info.thumbnail,
                format: info.ext,
                filesize: info.filesize,
                isLive: info.is_live || false
            }
        };
    }

    /**
     * Verifica se é URL HLS
     */
    isHlsUrl(url) {
        return url.includes('/manifest/') || 
               url.includes('/hls_playlist/') || 
               url.includes('.m3u8') ||
               url.includes('manifest.googlevideo.com');
    }

    /**
     * Verifica se é formato direto
     */
    isDirectFormat(format, requestedFormat) {
        if (requestedFormat === 'audio') {
            return !format.vcodec || format.vcodec === 'none';
        } else {
            return !!format.vcodec && format.vcodec !== 'none';
        }
    }

    /**
     * Obtém tipo da URL
     */
    getUrlType(url) {
        if (this.isHlsUrl(url)) return 'HLS';
        if (url.includes('.googlevideo.com/videoplayback')) return 'Direct Video';
        if (url.includes('.m4a')) return 'Audio M4A';
        if (url.includes('.mp3')) return 'Audio MP3';
        if (url.includes('.mp4')) return 'Video MP4';
        return 'Unknown';
    }

    /**
     * Obtém URL direta (não HLS)
     */
    async getDirectUrl(youtubeUrl, format) {
        try {
            console.log('🎯 Buscando URL direta...');
            
            const options = {
                dumpJson: true,
                noWarnings: true,
                format: format === 'audio' ? 
                    'bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio' : 
                    'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'
            };

            const info = await ytdlp(youtubeUrl, options);
            
            if (info.url && !this.isHlsUrl(info.url)) {
                console.log('✅ URL direta obtida!');
                return info.url;
            }

            return null;

        } catch (error) {
            console.error('Erro ao obter URL direta:', error.message);
            return null;
        }
    }

    /**
     * Método agressivo para obter URL
     */
    async getAggressiveUrl(youtubeUrl, format) {
        try {
            console.log('💪 Método agressivo...');
            
            // Tentar vários formatos específicos
            const formatAttempts = format === 'audio' ? [
                'bestaudio[ext=m4a]',
                'bestaudio[ext=mp3]', 
                'bestaudio',
                'worstaudio[ext=m4a]',
                'worstaudio'
            ] : [
                'best[ext=mp4]',
                'bestvideo[ext=mp4]+bestaudio[ext=m4a]',
                'worst[ext=mp4]',
                'best',
                'worst'
            ];

            for (const formatStr of formatAttempts) {
                try {
                    console.log(`   Tentando formato: ${formatStr}`);
                    const info = await ytdlp(youtubeUrl, {
                        dumpJson: true,
                        noWarnings: true,
                        format: formatStr
                    });

                    if (info.url && !this.isHlsUrl(info.url)) {
                        console.log(`   ✅ Sucesso com formato: ${formatStr}`);
                        return info.url;
                    }
                } catch (error) {
                    // Continua para o próximo formato
                    console.log(`   ❌ Formato ${formatStr} falhou: ${error.message}`);
                }
            }

            return null;

        } catch (error) {
            console.error('Método agressivo falhou:', error.message);
            return null;
        }
    }

    /**
     * Testa se uma URL está funcionando
     */
    async testVideoUrl(url) {
        try {
            console.log(`🧪 Testando URL: ${this.getUrlType(url)} - ${url.substring(0, 80)}...`);

            // Se for HLS, testa de forma diferente
            if (this.isHlsUrl(url)) {
                return await this.testHlsUrl(url);
            }

            // Para URLs diretas
            const response = await axios.head(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Range': 'bytes=0-1'
                },
                validateStatus: (status) => status === 200 || status === 206
            });

            const isWorking = response.status === 200 || response.status === 206;
            const contentLength = response.headers['content-length'];
            const contentType = response.headers['content-type'];

            console.log(`📊 Status: ${response.status}, Tipo: ${contentType}, Trabalhando: ${isWorking}`);

            return {
                success: true,
                isWorking,
                status: response.status,
                contentLength,
                contentType,
                urlType: this.getUrlType(url),
                isDirect: !this.isHlsUrl(url)
            };

        } catch (error) {
            console.log(`❌ URL não funciona: ${error.message}`);
            return {
                success: false,
                isWorking: false,
                error: error.message,
                urlType: this.getUrlType(url)
            };
        }
    }

    /**
     * Testa URL HLS
     */
    async testHlsUrl(url) {
        try {
            console.log('📺 Testando URL HLS...');
            
            const response = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            // HLS geralmente retorna uma playlist .m3u8
            const isHlsPlaylist = response.data.includes('#EXTM3U');
            
            console.log(`📊 HLS: ${isHlsPlaylist ? 'Playlist válida' : 'Playlist inválida'}`);

            return {
                success: true,
                isWorking: isHlsPlaylist,
                status: response.status,
                contentType: response.headers['content-type'],
                urlType: 'HLS',
                isDirect: false,
                isHls: true
            };

        } catch (error) {
            console.log(`❌ HLS não funciona: ${error.message}`);
            return {
                success: false,
                isWorking: false,
                error: error.message,
                urlType: 'HLS',
                isHls: true
            };
        }
    }

    /**
     * Baixa um pedaço do vídeo para testar
     */
    async downloadSample(url, bytes = 102400) {
        try {
            console.log(`📥 Baixando amostra de ${bytes} bytes...`);

            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Range': `bytes=0-${bytes - 1}`,
                    'Referer': 'https://www.youtube.com/'
                },
                maxContentLength: bytes + 1024,
                validateStatus: (status) => status === 200 || status === 206
            });

            const buffer = Buffer.from(response.data);
            
            console.log(`✅ Amostra baixada: ${buffer.length} bytes`);

            return {
                success: true,
                buffer,
                size: buffer.length,
                status: response.status,
                contentType: response.headers['content-type']
            };

        } catch (error) {
            console.error('Erro ao baixar amostra:', error);
            throw new Error(`Falha no download: ${error.message}`);
        }
    }

    /**
     * Health check do serviço
     */
    async healthCheck() {
        try {
            const testUrl = 'https://youtu.be/dQw4w9WgXcQ';
            const result = await this.getFreshVideoUrl(testUrl, 'audio');
            return result.success;
        } catch (error) {
            console.error('Health check failed:', error.message);
            return false;
        }
    }
}

const freshVideoService = new FreshVideoService();
export default freshVideoService;