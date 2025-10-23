// services/weatherService.js
import axios from 'axios';

/**
 * Obtém dados climáticos de uma cidade
 * @param {string} city - Nome da cidade
 * @param {string} language - Idioma (padrão: pt_br)
 * @param {string} units - Unidades (metric/imperial)
 * @returns {Promise<Object>} Dados climáticos
 */
export const obterClima = async (city, language = "pt_br", units = "metric") => {
  try {
    // Você pode usar diferentes APIs de clima aqui
    // Exemplo com OpenWeatherMap
    const API_KEY = process.env.OPENWEATHER_API_KEY;
    
    if (!API_KEY) {
      throw new Error("API key do clima não configurada");
    }

    const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: {
        q: city,
        appid: API_KEY,
        lang: language,
        units: units
      },
      timeout: 10000
    });

    const data = response.data;

    return {
      status: true,
      cidade: data.name,
      pais: data.sys.country,
      temperatura: Math.round(data.main.temp),
      sensacao: Math.round(data.main.feels_like),
      temperatura_min: Math.round(data.main.temp_min),
      temperatura_max: Math.round(data.main.temp_max),
      umidade: data.main.humidity,
      pressao: data.main.pressure,
      descricao: data.weather[0].description,
      icone: data.weather[0].icon,
      vento: {
        velocidade: data.wind.speed,
        direcao: data.wind.deg
      },
      nascer_sol: new Date(data.sys.sunrise * 1000).toLocaleTimeString('pt-BR'),
      por_sol: new Date(data.sys.sunset * 1000).toLocaleTimeString('pt-BR'),
      visibilidade: data.visibility,
      nuvens: data.clouds.all
    };

  } catch (error) {
    console.error("Erro ao obter clima:", error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      throw new Error("Cidade não encontrada");
    }
    
    if (error.response?.status === 401) {
      throw new Error("API key inválida");
    }
    
    if (error.code === 'ECONNABORTED') {
      throw new Error("Timeout na requisição do clima");
    }
    
    throw new Error("Erro ao obter dados climáticos");
  }
};

/**
 * Obtém previsão para vários dias
 * @param {string} city - Nome da cidade
 * @param {number} days - Número de dias (1-5)
 * @returns {Promise<Array>} Previsão extendida
 */
export const obterPrevisao = async (city, days = 3) => {
  try {
    const API_KEY = process.env.OPENWEATHER_API_KEY;
    
    if (!API_KEY) {
      throw new Error("API key do clima não configurada");
    }

    const response = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
      params: {
        q: city,
        appid: API_KEY,
        lang: 'pt_br',
        units: 'metric',
        cnt: days * 8 // 8 previsões por dia
      },
      timeout: 10000
    });

    return response.data.list.map(item => ({
      data: new Date(item.dt * 1000).toLocaleDateString('pt-BR'),
      hora: new Date(item.dt * 1000).toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      temperatura: Math.round(item.main.temp),
      descricao: item.weather[0].description,
      icone: item.weather[0].icon,
      umidade: item.main.humidity,
      vento: item.wind.speed
    }));

  } catch (error) {
    console.error("Erro na previsão:", error.response?.data || error.message);
    throw new Error("Erro ao obter previsão do tempo");
  }
};

/**
 * Busca cidades por nome
 * @param {string} query - Termo de busca
 * @returns {Promise<Array>} Lista de cidades
 */
export const buscarCidades = async (query) => {
  try {
    const API_KEY = process.env.OPENWEATHER_API_KEY;
    
    if (!API_KEY) {
      throw new Error("API key do clima não configurada");
    }

    const response = await axios.get('http://api.openweathermap.org/geo/1.0/direct', {
      params: {
        q: query,
        limit: 5,
        appid: API_KEY
      },
      timeout: 5000
    });

    return response.data.map(city => ({
      nome: city.name,
      pais: city.country,
      estado: city.state,
      lat: city.lat,
      lon: city.lon
    }));

  } catch (error) {
    console.error("Erro na busca de cidades:", error);
    throw new Error("Erro ao buscar cidades");
  }
};