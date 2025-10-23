// services/youtubeService.js
import ytSearch from 'yt-search';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== BUSCA RÁPIDA (yt-search) ====================

/**
 * Busca SUPER rápida no YouTube usando yt-search
 * @param {string} query - Termo de busca
 * @returns {Promise<Array>} Lista de vídeos
 */
export const buscarVideosYouTube = async (query) => {
    try {
        console.log("⚡ Buscando com yt-search:", query);
        
        const searchResult = await ytSearch(query);
        
        return searchResult.videos.map(video => ({
            id: video.videoId,
            title: video.title,
            thumbnail: video.thumbnail,
            duration: video.duration.timestamp,
            channel: video.author.name,
            view_count: video.views,
            upload_date: video.uploadDate,
            url: video.url,
            timestamp: video.duration.seconds,
            isLive: video.live,
            ago: video.ago
        }));

    } catch (error) {
        console.error("❌ Erro na busca rápida:", error);
        throw new Error("Falha ao buscar vídeos: " + error.message);
    }
};

/**
 * Busca apenas um vídeo (mais rápido)
 * @param {string} query - Termo de busca
 * @returns {Promise<Object>} Primeiro vídeo
 */
export const buscarPrimeiroVideo = async (query) => {
    try {
        const videos = await buscarVideosYouTube(query);
        return videos[0] || null;
    } catch (error) {
        throw new Error("Falha ao buscar vídeo: " + error.message);
    }
};

// ==================== DOWNLOAD DE QUALIDADE (yt-dlp + ffmpeg) ====================

/**
 * Obtém informações do vídeo para download
 * @param {string} name - Nome ou URL do vídeo
 * @param {string} type - Tipo (audio/video)
 * @param {string} quality - Qualidade (perfect/reduced)
 * @returns {Promise<Object>} Informações do vídeo
 */
export const downloadYouTube = async (name, type = "audio", quality = "perfect") => {
    try {
        let videoUrl = name;
        
        // Se não for URL, busca o vídeo rapidamente com yt-search
        if (!name.startsWith('http')) {
            const video = await buscarPrimeiroVideo(name);
            if (!video) {
                throw new Error("Nenhum vídeo encontrado");
            }
            videoUrl = video.url;
        }

        // Obtém informações detalhadas com yt-dlp
        const videoInfo = await getVideoInfoYtDlp(videoUrl);

        const safeTitle = (videoInfo.title || 'video').replace(/[^a-zA-Z0-9 \-_.]/g, "");
        const filename = type === "audio" ? `${safeTitle}.mp3` : `${safeTitle}.mp4`;

        return {
            title: videoInfo.title,
            thumbnail: videoInfo.thumbnail,
            duration: videoInfo.duration_string || formatDuration(videoInfo.duration),
            minutes: Math.floor(videoInfo.duration / 60),
            seconds: videoInfo.duration % 60,
            url: videoUrl,
            filename: safeTitle,
            originalInfo: videoInfo
        };

    } catch (error) {
        console.error("❌ Erro no download do YouTube:", error);
        throw new Error(`Falha ao processar vídeo: ${error.message}`);
    }
};

/**
 * Obtém informações detalhadas do vídeo usando yt-dlp
 * @param {string} url - URL do YouTube
 * @returns {Promise<Object>} Informações do vídeo
 */
const getVideoInfoYtDlp = async (url) => {
    return new Promise((resolve, reject) => {
        const args = [
            "--dump-json",
            "--no-warnings",
            url
        ];

        const ytdlp = spawn("yt-dlp", args);
        let output = '';

        ytdlp.stdout.on('data', (data) => {
            output += data.toString();
        });

        ytdlp.stderr.on('data', (data) => {
            console.error("YT-DLP Info:", data.toString());
        });

        ytdlp.on('close', (code) => {
            if (code === 0 && output) {
                try {
                    const info = JSON.parse(output);
                    resolve(info);
                } catch (err) {
                    reject(new Error("Failed to parse video info"));
                }
            } else {
                reject(new Error(`Failed to get video info: code ${code}`));
            }
        });

        ytdlp.on('error', (err) => {
            reject(new Error(`Failed to start yt-dlp: ${err.message}`));
        });
    });
};

/**
 * Download direto com yt-dlp + ffmpeg
 * @param {string} url - URL do vídeo
 * @param {string} type - Tipo (audio/video)
 * @param {string} quality - Qualidade (perfect/reduced)
 * @param {Object} res - Response object para stream
 * @returns {Promise<void>}
 */
export const downloadYouTubeStream = async (url, type, quality, res) => {
    return new Promise(async (resolve, reject) => {
        try {
            const formats = getFormatsConfig(type, quality);
            let success = false;

            for (const format of formats) {
                try {
                    console.log(`🎯 Tentando formato: ${format}`);
                    await downloadWithFormat(url, format, type, res);
                    success = true;
                    break;
                } catch (formatError) {
                    console.log(`❌ Formato ${format} falhou:`, formatError.message);
                    continue;
                }
            }

            if (!success) {
                throw new Error("Todos os formatos falharam");
            }

            resolve();
        } catch (error) {
            reject(error);
        }
    });
};

/**
 * Configurações de formatos por tipo e qualidade
 */
const getFormatsConfig = (type, quality) => {
    const config = {
        audio: {
            perfect: ["bestaudio[ext=m4a]", "bestaudio[ext=webm]", "bestaudio"],
            reduced: ["worstaudio[ext=m4a]", "worstaudio[ext=webm]", "worstaudio"]
        },
        video: {
            perfect: ["best[height<=1080]", "best[height<=720]", "best"],
            reduced: ["worst[height>=144]", "worst", "best[height<=360]"]
        }
    };

    return config[type]?.[quality] || config[type]?.perfect || ["best"];
};

/**
 * Download com formato específico
 */
const downloadWithFormat = (url, format, type, res) => {
    return new Promise((resolve, reject) => {
        const ytdlpArgs = ["-f", format, "-o", "-", "--no-part", url];
        
        console.log("🔧 Executando yt-dlp:", ytdlpArgs.join(" "));

        const ytdlp = spawn("yt-dlp", ytdlpArgs);
        
        if (type === "audio") {
            // Converter para MP3 com ffmpeg
            const ffmpegArgs = [
                "-i", "pipe:0",
                "-c:a", "libmp3lame",
                "-b:a", "192k",
                "-f", "mp3",
                "pipe:1"
            ];

            const ffmpeg = spawn("ffmpeg", ffmpegArgs);

            ytdlp.stdout.pipe(ffmpeg.stdin);
            ffmpeg.stdout.pipe(res);

            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`FFmpeg failed: ${code}`));
                }
            });

            ffmpeg.on('error', reject);

        } else {
            // Vídeo direto
            ytdlp.stdout.pipe(res);
            
            ytdlp.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`YT-DLP failed: ${code}`));
                }
            });
        }

        ytdlp.on('error', reject);

        // Timeout
        setTimeout(() => {
            reject(new Error("Timeout no download"));
        }, 60000);
    });
};

// ==================== FUNÇÕES AUXILIARES ====================

/**
 * Formata duração em segundos para string
 */
const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
};

/**
 * Extrai ID do vídeo da URL
 */
const extractVideoId = (url) => {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
};

/**
 * Verifica se o yt-dlp está disponível
 */
export const checkYtDlpAvailability = async () => {
    return new Promise((resolve) => {
        const ytdlp = spawn("yt-dlp", ["--version"]);
        ytdlp.on('close', (code) => resolve(code === 0));
        ytdlp.on('error', () => resolve(false));
    });
};

/**
 * Verifica se o ffmpeg está disponível
 */
export const checkFfmpegAvailability = async () => {
    return new Promise((resolve) => {
        const ffmpeg = spawn("ffmpeg", ["-version"]);
        ffmpeg.on('close', (code) => resolve(code === 0));
        ffmpeg.on('error', () => resolve(false));
    });
};

/**
 * Testa todos os serviços
 */
export const testYouTubeServices = async () => {
    const results = {
        yt_search: 'pending',
        yt_dlp: 'pending',
        ffmpeg: 'pending'
    };

    try {
        // Testa yt-search
        await buscarVideosYouTube("test");
        results.yt_search = 'operational';
    } catch (error) {
        results.yt_search = 'failed';
    }

    // Testa yt-dlp
    results.yt_dlp = await checkYtDlpAvailability() ? 'operational' : 'failed';
    
    // Testa ffmpeg
    results.ffmpeg = await checkFfmpegAvailability() ? 'operational' : 'failed';

    return results;
};

// services/youtubeService.js - ADICIONE ESTAS FUNÇÕES

/**
 * Busca UM vídeo com melhor correspondência
 * @param {string} query - Termo de busca
 * @returns {Promise<Object>} Melhor vídeo encontrado
 */
export const buscarMelhorVideo = async (query) => {
    try {
        console.log("🎯 Buscando melhor vídeo para:", query);
        
        const searchResult = await ytSearch(query);
        
        if (!searchResult.videos || searchResult.videos.length === 0) {
            throw new Error("Nenhum vídeo encontrado");
        }

        // Encontra o vídeo com melhor score de relevância
        const melhorVideo = encontrarMelhorResultado(query, searchResult.videos);
        
        console.log("✅ Melhor vídeo encontrado:", melhorVideo.title);
        
        return melhorVideo;

    } catch (error) {
        console.error("❌ Erro na busca precisa:", error);
        throw new Error("Falha ao buscar vídeo: " + error.message);
    }
};

/**
 * Encontra o resultado mais relevante baseado na query
 */
const encontrarMelhorResultado = (query, videos) => {
    const queryLower = query.toLowerCase();
    const palavrasQuery = queryLower.split(' ').filter(p => p.length > 2);
    
    let melhorScore = -1;
    let melhorVideo = videos[0];

    for (const video of videos) {
        const score = calcularScoreRelevancia(video, queryLower, palavrasQuery);
        
        if (score > melhorScore) {
            melhorScore = score;
            melhorVideo = video;
        }
    }

    console.log(`📊 Melhor score: ${melhorScore} - "${melhorVideo.title}"`);
    return melhorVideo;
};

/**
 * Calcula score de relevância baseado em vários fatores
 */
const calcularScoreRelevancia = (video, queryLower, palavrasQuery) => {
    let score = 0;
    const tituloLower = video.title.toLowerCase();
    const canalLower = video.author.name.toLowerCase();

    // 1. Correspondência exata no título (maior peso)
    if (tituloLower.includes(queryLower)) {
        score += 100;
    }

    // 2. Todas as palavras da query no título
    const todasPalavrasNoTitulo = palavrasQuery.every(palavra => 
        tituloLower.includes(palavra)
    );
    if (todasPalavrasNoTitulo) {
        score += 80;
    }

    // 3. Algumas palavras no título
    const palavrasNoTitulo = palavrasQuery.filter(palavra => 
        tituloLower.includes(palavra)
    ).length;
    score += palavrasNoTitulo * 20;

    // 4. Correspondência no canal
    if (canalLower.includes(queryLower)) {
        score += 30;
    }

    // 5. Vídeos mais recentes (menos de 1 ano)
    if (video.ago && !video.ago.includes('year')) {
        score += 10;
    }

    // 6. Vídeos com boa duração (entre 2 e 15 minutos)
    if (video.duration.seconds > 120 && video.duration.seconds < 900) {
        score += 5;
    }

    // 7. Penaliza vídeos ao vivo (geralmente não são música)
    if (video.live) {
        score -= 50;
    }

    // 8. Penaliza vídeos muito longos (> 30 minutos)
    if (video.duration.seconds > 1800) {
        score -= 20;
    }

    return score;
};

/**
 * Busca rápida - apenas 1 resultado otimizado
 */
export const buscarVideoRapido = async (query) => {
    try {
        // Busca com menos resultados para ser mais rápido
        const searchResult = await ytSearch({ query, pages: 1 });
        
        if (!searchResult.videos || searchResult.videos.length === 0) {
            throw new Error("Nenhum vídeo encontrado");
        }

        // Retorna o primeiro resultado (já é geralmente o mais relevante)
        return searchResult.videos[0];

    } catch (error) {
        throw new Error("Busca rápida falhou: " + error.message);
    }
};