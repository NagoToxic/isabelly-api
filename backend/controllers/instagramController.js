// controllers/instagramController.js
import { downloadInstagram, downloadInstagramV2 } from '../services/instagramService.js';

export const getInstagramMedia = async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) {
            return res.status(400).json({ 
                error: "URL não informada" 
            });
        }

        const resultado = await downloadInstagram(url);
        res.json(resultado);
        
    } catch (err) {
        console.error("Erro no /api/instagram:", err.message || err);
        res.status(500).json({ 
            error: err.message 
        });
    }
};

export const getInstagramMediaV2 = async (req, res) => {
    const { url } = req.query;
    
    if (!url) {
        return res.status(400).json({ 
            error: true, 
            message: "❌ URL do Instagram obrigatória." 
        });
    }

    try {
        const cleanUrl = url.split("?")[0];

        if (!cleanUrl.includes("/p/") && !cleanUrl.includes("/reel/")) {
            return res.status(400).json({
                error: true,
                message: "❌ Apenas links de *posts* ou *reels* são suportados!"
            });
        }

        const data = await downloadInstagram(cleanUrl);
        const mediaUrl = data.media[0].url;

        res.setHeader("Content-Disposition", `attachment; filename="instagram_media.${data.media[0].type === "video" ? "mp4" : "jpg"}"`);

        const response = await fetch(mediaUrl);
        if (!response.ok) throw new Error("Falha ao baixar mídia do Instagram");

        response.body.pipe(res);

    } catch (err) {
        console.error("Erro no /api/instagramV2:", err.message || err);
        res.status(500).json({ 
            error: true, 
            message: "Erro interno ao processar a mídia." 
        });
    }
};