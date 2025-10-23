// controllers/eromeController.js
import { processarErome } from '../services/erome.js';

export const handleEromeAlbum = async (req, res) => {
    try {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({ error: "URL não informada" });
        }

        const resultado = await processarErome(url);
        
        if (resultado.error) {
            return res.status(400).json({ error: resultado.error });
        }

        res.json(resultado);

    } catch (err) {
        console.error("Erro na rota /api/erome:", err);
        res.status(500).json({ error: "Erro interno ao processar o álbum" });
    }
};

export const handleEromeProxy = async (req, res) => {
    try {
        const { url, type } = req.query;
        
        if (!url) {
            return res.status(400).json({ error: "URL não informada" });
        }

        console.log("Proxy acessando:", url);

        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "https://www.erome.com/",
                "Accept": type === 'video' ? "video/mp4,video/*" : "image/*,*/*"
            },
            timeout: 30000
        });

        if (!response.ok) {
            return res.status(response.status).send(`Erro: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        const contentLength = response.headers.get('content-length');

        res.setHeader('Content-Type', contentType || (type === 'video' ? 'video/mp4' : 'image/jpeg'));
        res.setHeader('Content-Length', contentLength || '');
        res.setHeader('Cache-Control', 'public, max-age=3600');

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        res.send(buffer);

    } catch (err) {
        console.error("Erro no proxy:", err);
        res.status(500).send("Erro ao baixar o arquivo");
    }
};