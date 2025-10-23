// controllers/instagramScraperController.js
import { 
    scrapeInstagram, 
    downloadInstagramMedia 
} from '../services/instagramScraperService.js';

export const instagramScraper = async (req, res) => {
    try {
        const { url, tipo } = req.query;
        
        if (!url) {
            return res.status(400).json({
                success: false,
                error: "Parâmetro 'url' do Instagram é obrigatório",
                exemplo: "/api/instagram-scraper?url=https://www.instagram.com/p/ABC123/"
            });
        }

        // Validar URL do Instagram
        if (!url.includes("instagram.com")) {
            return res.status(400).json({
                success: false,
                error: "URL deve ser do Instagram",
                dominios_validos: ["instagram.com", "www.instagram.com"]
            });
        }

        console.log(`📷 Instagram Scraper: ${url.substring(0, 60)}...`);

        const resultado = await scrapeInstagram(url);

        if (!resultado.success) {
            return res.status(500).json({
                success: false,
                error: resultado.error,
                url: url
            });
        }

        res.json({
            success: true,
            data: resultado
        });

    } catch (error) {
        console.error("❌ Erro no Instagram Scraper:", error.message);
        
        res.status(500).json({
            success: false,
            error: "Erro ao processar URL do Instagram",
            detalhes: error.message
        });
    }
};

export const instagramDownload = async (req, res) => {
    try {
        const { url, tipo = 'todos', download } = req.query;
        
        if (!url) {
            return res.status(400).json({
                success: false,
                error: "Parâmetro 'url' do Instagram é obrigatório"
            });
        }

        console.log(`📥 Instagram Download: ${url.substring(0, 60)}...`);

        const resultado = await downloadInstagramMedia(url, tipo);

        // Se não for para download direto, retorna informações
        if (!download || download === "false") {
            return res.json({
                success: true,
                data: resultado,
                download_links: resultado.media.map((m, index) => ({
                    numero: index + 1,
                    tipo: m.type,
                    download_direto: `${req.protocol}://${req.get("host")}/api/instagram-download?url=${encodeURIComponent(url)}&tipo=${tipo}&download=true&item=${index + 1}&apikey=${req.query.apikey || ""}`,
                    preview: m.preview
                }))
            });
        }

        // Download direto - pega o item específico ou o primeiro
        const itemIndex = parseInt(req.query.item || "1") - 1;
        const mediaItem = resultado.media[itemIndex];

        if (!mediaItem) {
            return res.status(404).json({
                success: false,
                error: `Item ${itemIndex + 1} não encontrado`
            });
        }

        // Fazer download do arquivo
        const response = await fetch(mediaItem.download);
        
        if (!response.ok) {
            throw new Error("Falha ao baixar mídia");
        }

        // Configurar headers para download
        const contentType = mediaItem.type === 'video' ? 'video/mp4' : 'image/jpeg';
        const filename = `instagram_${mediaItem.type}_${Date.now()}.${mediaItem.type === 'video' ? 'mp4' : 'jpg'}`;
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        res.send(buffer);

    } catch (error) {
        console.error("❌ Erro no Instagram Download:", error.message);
        
        res.status(500).json({
            success: false,
            error: "Erro ao baixar mídia do Instagram",
            detalhes: error.message
        });
    }
};