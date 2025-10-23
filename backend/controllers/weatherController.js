// controllers/weatherController.js
import { obterClima } from '../services/weatherService.js';

export const getWeather = async (req, res) => {
  try {
    const { city, language = "pt_br", units = "metric" } = req.query;
    
    if (!city) {
      return res.status(400).json({
        status: false,
        message: "Cidade não informada"
      });
    }

    const clima = await obterClima(city, language, units);
    res.json(clima);
    
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message
    });
  }
};