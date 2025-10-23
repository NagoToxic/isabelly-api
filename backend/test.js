/*// test-fresh-urls.js
import freshVideoService from './services/freshVideoService.js';

async function testFreshUrls() {
    const testUrl = 'https://youtu.be/LTJdoztkmoY'; // URL do seu vídeo
    
    try {
        console.log('🧪 TESTANDO URLs FRESCAS');
        console.log('='.repeat(50));
        
        // 1. Obter URL fresca
        const freshResult = await freshVideoService.getFreshVideoUrl(testUrl, 'audio');
        console.log('✅ URL Fresca:', freshResult.data.url.substring(0, 100) + '...');
        
        // 2. Testar a URL
        const testResult = await freshVideoService.testVideoUrl(freshResult.data.url);
        console.log('✅ Teste URL:', testResult.isWorking ? 'FUNCIONANDO' : 'NÃO FUNCIONA');
        
        // 3. Baixar amostra
        const sample = await freshVideoService.downloadSample(freshResult.data.url, 51200); // 50KB
        console.log('✅ Amostra:', sample.size + ' bytes baixados');
        
    } catch (error) {
        console.log('❌ Erro:', error.message);
    }
}

testFreshUrls();*/

import axios from 'axios';
import fs from 'fs';

const testVideoDownload = async () => {
    const testUrl = 'https://youtu.be/zE1sdmoGQzc'; // O mesmo vídeo que deu problema
    
    try {
        console.log('🧪 TESTANDO DOWNLOAD DE VÍDEO');
        
        // 1. Primeiro obter a URL fresca
        const apiUrl = `http://localhost:3000/api/youtube/convert/direct?url=${encodeURIComponent(testUrl)}&format=mp4&apikey=Nago`;
        console.log('🔗 Buscando URL via API...');
        
        const infoResponse = await axios.get(apiUrl);
        const downloadUrl = infoResponse.data.data.downloadInfo.downloadUrl;
        
        console.log('📹 URL obtida:', downloadUrl.substring(0, 100) + '...');
        console.log('📊 Tipo:', infoResponse.data.data.downloadInfo.fileType);
        console.log('🔧 Fonte:', infoResponse.data.source);

        // 2. Baixar o vídeo
        console.log('⬇️ Baixando vídeo...');
        const videoResponse = await axios.get(downloadUrl, {
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Range': 'bytes=0-10485760', // Primeiros 10MB apenas
                'Referer': 'https://www.youtube.com/'
            },
            timeout: 30000
        });

        console.log('📦 Status:', videoResponse.status);
        console.log('📄 Content-Type:', videoResponse.headers['content-type']);
        console.log('💾 Content-Length:', videoResponse.headers['content-length']);

        // 3. Salvar para análise
        const writer = fs.createWriteStream('test_video.mp4');
        videoResponse.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        console.log('✅ Vídeo salvo como test_video.mp4');
        
        // 4. Verificar informações do arquivo
        const stats = fs.statSync('test_video.mp4');
        console.log('📊 Tamanho do arquivo:', stats.size, 'bytes');
        
        // 5. Verificar se é um MP4 válido
        const buffer = fs.readFileSync('test_video.mp4');
        const header = buffer.slice(0, 8).toString('hex');
        console.log('🔍 Cabeçalho do arquivo:', header);
        
        // MP4 válido deve começar com 'ftyp'
        const isMp4Valid = buffer.includes(Buffer.from('ftyp'));
        console.log('✅ MP4 válido?', isMp4Valid);

    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
};

testVideoDownload();