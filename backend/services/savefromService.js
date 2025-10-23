import axios from 'axios';
import * as cheerio from 'cheerio';

class SaveFromService {
    constructor() {
        this.baseUrl = 'https://en1.savefrom.net';
        this.apiUrl = 'https://en1.savefrom.net/savefrom.php';
        this.client = axios.create({
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            }
        });
    }

    /**
     * Valida se a URL é do YouTube
     */
    isValidYouTubeUrl(url) {
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
        return youtubeRegex.test(url);
    }

    /**
     * Obtém links de download do vídeo
     */
    async getDownloadLinks(youtubeUrl, quality = 'best') {
        try {
            console.log(`Iniciando scrap para: ${youtubeUrl}`);

            // Primeiro, fazer uma requisição GET para obter cookies e tokens
            const initialResponse = await this.client.get(this.baseUrl);
            const cookies = initialResponse.headers['set-cookie'];

            // Extrair token CSRF se existir
            const $ = cheerio.load(initialResponse.data);
            const csrfToken = this.extractCsrfToken($);

            // Preparar dados para o POST
            const formData = new URLSearchParams();
            formData.append('sf_url', youtubeUrl);
            formData.append('new', '2');
            formData.append('lang', 'en');
            formData.append('app', '');
            formData.append('country', '');
            formData.append('os', '');
            formData.append('browser', '');
            formData.append('channel', '');

            if (csrfToken) {
                formData.append('csrf_token', csrfToken);
            }

            // Fazer requisição POST para processar o vídeo
            const postResponse = await this.client.post(this.apiUrl, formData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookies ? cookies.join('; ') : '',
                    'Origin': this.baseUrl,
                    'Referer': this.baseUrl,
                },
                maxRedirects: 5
            });

            return this.parseDownloadLinks(postResponse.data, quality);

        } catch (error) {
            console.error('Erro no serviço SaveFrom:', error.message);
            throw new Error(`Falha ao obter links de download: ${error.message}`);
        }
    }

    /**
     * Extrai token CSRF da página
     */
    extractCsrfToken($) {
        try {
            // Tentar encontrar token em input hidden
            const tokenInput = $('input[name="csrf_token"]');
            if (tokenInput.length) {
                return tokenInput.val();
            }

            // Tentar encontrar em meta tags
            const metaToken = $('meta[name="csrf-token"]');
            if (metaToken.length) {
                return metaToken.attr('content');
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Parseia os links de download da resposta HTML
     */
    parseDownloadLinks(html, quality) {
        const $ = cheerio.load(html);
        const downloadLinks = [];

        // Procurar por links de download na estrutura do SaveFrom
        $('a').each((index, element) => {
            const link = $(element);
            const href = link.attr('href');
            const text = link.text().trim();

            // Filtrar links que parecem ser de download
            if (href && this.isDownloadLink(href, text)) {
                const qualityInfo = this.extractQualityInfo(text, href);
                
                downloadLinks.push({
                    url: href.startsWith('http') ? href : this.urlJoin(this.baseUrl, href),
                    quality: qualityInfo.quality,
                    format: qualityInfo.format,
                    size: qualityInfo.size,
                    type: qualityInfo.type
                });
            }
        });

        // Se não encontrar links na forma convencional, tentar métodos alternativos
        if (downloadLinks.length === 0) {
            return this.alternativeParseMethods($);
        }

        return this.filterByQuality(downloadLinks, quality);
    }

    /**
     * Helper para juntar URLs
     */
    urlJoin(base, path) {
        try {
            return new URL(path, base).toString();
        } catch (error) {
            return base + path;
        }
    }

    /**
     * Verifica se o link é um link de download
     */
    isDownloadLink(href, text) {
        const downloadIndicators = [
            'download', 'mp4', 'webm', 'mp3', 'video', 'audio',
            'hd', 'sd', '360p', '480p', '720p', '1080p'
        ];

        const lowerHref = href.toLowerCase();
        const lowerText = text.toLowerCase();

        return downloadIndicators.some(indicator => 
            lowerHref.includes(indicator) || lowerText.includes(indicator)
        );
    }

    /**
     * Extrai informações de qualidade do texto/link
     */
    extractQualityInfo(text, href) {
        const qualityMap = {
            '144p': '144p', '240p': '240p', '360p': '360p',
            '480p': '480p', '720p': '720p', '1080p': '1080p',
            'hd': '720p', 'full hd': '1080p'
        };

        let quality = 'unknown';
        let format = 'mp4';
        let size = 'unknown';
        let type = 'video';

        // Detectar qualidade
        for (const [key, value] of Object.entries(qualityMap)) {
            if (text.toLowerCase().includes(key) || href.toLowerCase().includes(key)) {
                quality = value;
                break;
            }
        }

        // Detectar formato
        if (text.toLowerCase().includes('mp3') || href.toLowerCase().includes('mp3')) {
            format = 'mp3';
            type = 'audio';
        } else if (text.toLowerCase().includes('webm') || href.toLowerCase().includes('webm')) {
            format = 'webm';
        }

        return { quality, format, size, type };
    }

    /**
     * Métodos alternativos de parse se o método principal falhar
     */
    alternativeParseMethods($) {
        const links = [];

        // Tentar encontrar em scripts JavaScript
        $('script').each((index, element) => {
            const scriptContent = $(element).html();
            if (scriptContent) {
                const jsonMatches = scriptContent.match(/{"url":"[^"]+","quality":"[^"]+"/g);
                if (jsonMatches) {
                    jsonMatches.forEach(match => {
                        try {
                            const jsonStr = match + '}';
                            const data = JSON.parse(jsonStr);
                            links.push({
                                url: data.url,
                                quality: data.quality,
                                format: data.format || 'mp4',
                                type: 'video'
                            });
                        } catch (e) {
                            // Ignorar JSON inválido
                        }
                    });
                }
            }
        });

        return links;
    }

    /**
     * Filtra links por qualidade desejada
     */
    filterByQuality(links, desiredQuality) {
        if (desiredQuality === 'best') {
            // Ordenar por qualidade (maior primeiro)
            return links.sort((a, b) => {
                const qualityOrder = {'1080p': 4, '720p': 3, '480p': 2, '360p': 1, 'unknown': 0};
                return qualityOrder[b.quality] - qualityOrder[a.quality];
            });
        }

        return links.filter(link => link.quality === desiredQuality);
    }

    /**
     * Obtém informações do vídeo
     */
    async getVideoInfo(youtubeUrl) {
        try {
            const downloadLinks = await this.getDownloadLinks(youtubeUrl);
            
            return {
                originalUrl: youtubeUrl,
                availableQualities: [...new Set(downloadLinks.map(link => link.quality))],
                availableFormats: [...new Set(downloadLinks.map(link => link.format))],
                downloads: downloadLinks
            };
        } catch (error) {
            throw new Error(`Falha ao obter informações do vídeo: ${error.message}`);
        }
    }

    /**
     * Health check do serviço
     */
    async healthCheck() {
        try {
            const response = await this.client.get(this.baseUrl, { timeout: 10000 });
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }
}

// Exportar uma instância única do serviço
const savefromService = new SaveFromService();
export default savefromService;