// controllers/tofigureController.js
import { 
    convertToFigureV1, 
    convertToFigureV2, 
    uploadAndConvertToFigure 
} from '../services/tofigureService.js';

export const toFigureV1 = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Envie uma imagem via form-data com a chave "image"'
            });
        }

        console.log('📤 Fazendo upload da imagem...');

        const resultado = await convertToFigureV1(req.file);
        
        res.json({
            success: true,
            uploadedUrl: resultado.uploadedUrl,
            figureUrl: resultado.figureUrl,
            message: 'Imagem convertida para figure com sucesso!'
        });

    } catch (error) {
        console.error('❌ Erro:', error.message);
        res.status(500).json({
            success: false,
            error: error.message || 'Erro no processamento'
        });
    }
};

export const toFigureV2 = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                error: 'Nenhuma imagem enviada' 
            });
        }

        console.log('📤 Iniciando processamento...');

        const resultado = await convertToFigureV2(req.file);
        
        res.json({
            success: true,
            figureUrl: resultado.figureUrl,
            message: 'Imagem convertida com sucesso!'
        });

    } catch (error) {
        console.error('💥 Erro final:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

export const toFigureUpload = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Arquivo de imagem é obrigatório'
            });
        }

        const resultado = await uploadAndConvertToFigure(req.file);
        
        res.json({
            success: true,
            result: resultado.figureUrl
        });

    } catch (error) {
        console.error('Erro no upload:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};