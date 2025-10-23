// controllers/youtubeController.js - ADICIONE ESTAS FUNÇÕES
import { 
    buscarVideosYouTube, 
    buscarMelhorVideo,
    buscarVideoRapido,
    downloadYouTube, 
    downloadYouTubeStream,
    testYouTubeServices 
} from '../services/youtubeService.js';

export const searchYouTube = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.status(400).json({ error: "Query não informada" });

        const videos = await buscarVideosYouTube(query);
        res.json(videos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const downloadYouTubeAudio = async (req, res) => {
    const { name, type = "audio", quality = "perfect", download } = req.query;
    if (!name) return res.status(400).json({ error: "Nome da música obrigatório" });

    try {
        const videoInfo = await downloadYouTube(name, type, quality);

        if (!download || download === "false") {
            return res.json({
                ...videoInfo,
                download_url: `${req.protocol}://${req.get("host")}/api/yt/download?name=${encodeURIComponent(name)}&type=${type}&quality=${quality}&download=true&apikey=${req.query.apikey || ""}`
            });
        }

        // Headers para download
        res.setHeader("Content-Type", type === "audio" ? "audio/mpeg" : "video/mp4");
        res.setHeader("Content-Disposition", `attachment; filename="${videoInfo.filename}.${type === "audio" ? "mp3" : "mp4"}"`);
        res.setHeader("Cache-Control", "no-cache");

        // Download com stream
        await downloadYouTubeStream(videoInfo.url, type, quality, res);

    } catch (err) {
        console.error(err);
        if (!res.headersSent) {
            res.status(500).json({ error: err.message });
        }
    }
};

// ✅ FUNÇÃO iPhone Audio ATUALIZADA
export const downloadiPhoneAudio = async (req, res) => {
    const { name, info } = req.query;
    if (!name) return res.status(400).json({ error: "Nome da música obrigatório" });

    try {
        const videoInfo = await downloadYouTube(name);

        if (info === "true") {
            return res.json({
                title: videoInfo.title,
                thumbnail: videoInfo.thumbnail,
                duration: videoInfo.duration,
                minutes: videoInfo.minutes,
                seconds: videoInfo.seconds,
                url: videoInfo.url
            });
        }

        const filename = `${videoInfo.title.replace(/[^a-zA-Z0-9 \-_.]/g, "")}.aac`;
        
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Type", "audio/aac");

        // Download em formato AAC (compatível com iPhone)
        await downloadYouTubeStream(videoInfo.url, "audio", "perfect", res);

    } catch (err) {
        console.error("Erro final:", err);
        if (!res.headersSent) {
            res.status(500).json({ error: err.message });
        }
    }
};

// ✅ NOVA FUNÇÃO DE TESTE
export const testServices = async (req, res) => {
    try {
        const results = await testYouTubeServices();
        res.json({ success: true, services: results });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Busca apenas 1 vídeo - o mais relevante
 */
export const searchOneYouTube = async (req, res) => {
    try {
        const { query, fast = "false" } = req.query;
        if (!query) return res.status(400).json({ error: "Query não informada" });

        let video;
        
        if (fast === "true") {
            // Busca rápida - primeiro resultado
            video = await buscarVideoRapido(query);
        } else {
            // Busca precisa - melhor resultado
            video = await buscarMelhorVideo(query);
        }

        res.json({
            success: true,
            video: {
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
            }
        });

    } catch (err) {
        res.status(500).json({ 
            success: false,
            error: err.message 
        });
    }
};

/**
 * Busca múltiplos vídeos (compatibilidade)
 */
export const searchYouTube1 = async (req, res) => {
    try {
        const { query, limit = "10" } = req.query;
        if (!query) return res.status(400).json({ error: "Query não informada" });

        const videos = await buscarVideosYouTube(query);
        const limitedVideos = videos.slice(0, parseInt(limit));

        res.json(limitedVideos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};