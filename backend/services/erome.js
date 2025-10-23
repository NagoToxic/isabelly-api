// services/erome.js
import axios from 'axios';
import cheerio from 'cheerio';

export const processarErome = async (url) => {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        
        const titulo = $('title').text();
        const imagens = [];
        const videos = [];

        $('img').each((i, el) => {
            const src = $(el).attr('src');
            src?.includes('erome') && imagens.push(src);
        });

        $('video source').each((i, el) => {
            const src = $(el).attr('src');
            src && videos.push(src);
        });

        return { titulo, imagens, videos, url_original: url };
        
    } catch (error) {
        console.error('Erro ao processar Erome:', error.message);
        return { error: 'Falha ao acessar o álbum' };
    }
};