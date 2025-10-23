// controllers/clailaController.js
import { sendClailaMessage, getClailaModels } from '../services/clailaService.js';

export const chatWithClaila = async (req, res) => {
    try {
        const { message, sessionId, model = "gpt-4o" } = req.query;
        
        if (!message) {
            return res.status(400).json({
                success: false,
                error: "Mensagem não informada"
            });
        }

        const resultado = await sendClailaMessage(message, sessionId, model);
        res.json(resultado);
        
    } catch (error) {
        console.error("Erro no /api/claila:", error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

export const getClailaInfo = async (req, res) => {
    try {
        const models = getClailaModels();
        
        res.json({
            success: true,
            service: "Claila AI",
            base_url: "https://app.claila.com/api/v2",
            available_models: models,
            endpoints: {
                chat: "/api/claila?message=SEU_TEXTO&model=MODELO",
                info: "/api/claila/info"
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};