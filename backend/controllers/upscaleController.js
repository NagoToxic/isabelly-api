// controllers/upscaleController.js
import { upscaleImage } from '../services/upscaleService.js';

export const upscaleImageHandler = async (req, res) => {
    try {
        const { imageUrl, escala = "2" } = req.query;

        if (!imageUrl) {
            return res.status(400).json({
                success: false,
                error: "Parâmetro 'imageUrl' é obrigatório",
                exemplo: "/api/upscale-imagem?imageUrl=https://exemplo.com/imagem.jpg&escala=2"
            });
        }

        const escalaNum = parseInt(escala);
        if (![2, 3, 4].includes(escalaNum)) {
            return res.status(400).json({
                success: false,
                error: "Escala deve ser 2, 3 ou 4",
                escalas_validas: [2, 3, 4]
            });
        }

        console.log(`🖼 Iniciando upscale: ${imageUrl.substring(0, 50)}...`);

        const resultado = await upscaleImage(imageUrl, escalaNum);

        if (resultado.status !== "sucesso") {
            return res.status(500).json({
                success: false,
                error: "Falha no upscale",
                detalhes: resultado.mensagem
            });
        }

        res.json({
            success: true,
            data: {
                imagem_original: imageUrl,
                imagem_upscaled: resultado.url,
                escala: escalaNum,
                codigo_processamento: resultado.codigo,
                tentativas: resultado.tentativas,
                timestamp: new Date().toISOString()
            },
            meta: {
                servico: "ImgLarger.com",
                qualidade: "IA Professional",
                tempo_estimado: `${resultado.tentativas * 3} segundos`
            }
        });

    } catch (erro) {
        console.error("❌ Erro na rota upscale:", erro.message);
        
        res.status(500).json({
            success: false,
            error: "Erro ao processar imagem",
            detalhes: erro.message,
            solucao: "Verifique a URL da imagem e tente novamente"
        });
    }
};