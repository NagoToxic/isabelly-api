// controllers/facebookController.js
import { downloadFacebook } from '../services/facebookService.js';

export const getFacebookVideo = async (req, res) => {
    try {
        let { url, cookies, userAgent } = req.query;
        
        if (!url) {
            return res.status(400).json({ 
                status: false,
                error: "URL não informada" 
            });
        }

        const resultado = await downloadFacebook(url, cookies, userAgent);
        res.json(resultado);
        
    } catch (error) {
        console.error("Erro no /api/facebook:", error.message || error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
};