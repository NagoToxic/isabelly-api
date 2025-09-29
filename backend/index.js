// index.js
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import axios from "axios";
import fetch from "node-fetch";
import cheerio from "cheerio";

// ✅ IMPORTAR TODAS AS FUNÇÕES DO func.js
import { 
    aumentarImagem,
    loadKeys,
    saveKeys,
    checkApiKey,
    processarErome,
    buscarVideosYouTube,
    downloadYouTube,
    obterClima,
    downloadFacebook,
    downloadInstagram,
    sendClailaMessage,
    CLAILA_MODELS,
    igScraper,
    downloadInstagramMedia,
    ytdown,
    downloadYouTubeDirect
} from './func.js';

// 🔧 Corrige __dirname no ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

const tempDir = path.join(__dirname, "downloads");
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

// -------------------- ROTAS ADMIN --------------------
app.get("/admin/keys", (req, res) => res.json(loadKeys()));

app.post("/admin/keys", (req, res) => {
    const { key, limit } = req.body;
    if (!key || !limit) return res.status(400).json({ error: "Campos obrigatórios" });

    const keys = loadKeys();
    if (keys.find(k => k.key === key)) return res.status(400).json({ error: "Key já existe" });

    keys.push({ key, limit, used: 0 });
    saveKeys(keys);
    res.json({ msg: "Key criada", key });
});

app.put("/admin/keys/:key", (req, res) => {
    const { limit, used } = req.body;
    const keys = loadKeys();
    const entry = keys.find(k => k.key === req.params.key);
    if (!entry) return res.status(404).json({ error: "Key não encontrada" });

    if (limit !== undefined) entry.limit = limit;
    if (used !== undefined) entry.used = used;
    saveKeys(keys);
    res.json({ msg: "Key atualizada", entry });
});

app.delete("/admin/keys/:key", (req, res) => {
    let keys = loadKeys();
    keys = keys.filter(k => k.key !== req.params.key);
    saveKeys(keys);
    res.json({ msg: "Key removida" });
});

// -------------------- ROTAS PÚBLICAS --------------------
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "../frontend", "start.html")));

// Erome
app.get("/api/erome", checkApiKey, async (req, res) => {
    try {
        const { url, download } = req.query;
        
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
});

// Proxy Erome
app.get("/api/erome/proxy", checkApiKey, async (req, res) => {
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
});

// Teste de vídeo Erome
app.get("/api/erome/video", checkApiKey, async (req, res) => {
    try {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({ error: "URL do vídeo não informada" });
        }

        console.log("Testando acesso ao vídeo:", url);

        // Teste 1: Tentativa básica
        const response1 = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "https://www.erome.com/"
            }
        });

        // Teste 2: Headers mais completos
        const response2 = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Referer": "https://www.erome.com/",
                "Accept": "video/mp4,video/webm,video/*,*/*;q=0.8",
            }
        });

        // Teste 3: Com Range header
        const response3 = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "https://www.erome.com/",
                "Range": "bytes=0-999"
            }
        });

        // Teste 4: Simulando navegador
        const response4 = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Referer": "https://www.erome.com/a/a6rDeOLa",
                "Accept": "*/*",
                "Origin": "https://www.erome.com"
            }
        });

        const resultados = {
            url_testada: url,
            testes: [
                {
                    nome: "Headers básicos",
                    status: response1.status,
                    status_text: response1.statusText,
                },
                {
                    nome: "Headers completos", 
                    status: response2.status,
                    status_text: response2.statusText,
                },
                {
                    nome: "Com Range header",
                    status: response3.status,
                    status_text: response3.statusText,
                },
                {
                    nome: "Simulando navegador",
                    status: response4.status,
                    status_text: response4.statusText,
                }
            ],
            conclusao: response4.status === 200 ? "Vídeo acessível" : "Vídeo bloqueado"
        };

        res.json({
            success: true,
            data: resultados
        });

    } catch (err) {
        console.error("Erro no teste de vídeo:", err);
        res.status(500).json({ 
            success: false,
            error: "Erro ao testar vídeo",
            details: err.message
        });
    }
});

// YouTube search
app.get("/api/yt/search", checkApiKey, async (req, res) => {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: "Query não informada" });

    try {
        const videos = await buscarVideosYouTube(query);
        res.json(videos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Rota unificada de download do YouTube
app.get("/api/yt/download", checkApiKey, async (req, res) => {
    const { name, type = "audio", quality = "perfect", download } = req.query;
    if (!name) return res.status(400).json({ error: "Nome da música obrigatório" });

    try {
        const videoInfo = await downloadYouTube(name, type, quality);

        if (!download || download === "false") {
            return res.json({
                ...videoInfo,
                download_url: `${req.protocol}://${req.get("host")}/api/yt/download?name=${encodeURIComponent(name)}&type=${type}&quality=${quality}&download=true&apikey=${req.query.apikey || ""}`
            });
        }

        res.setHeader("Content-Disposition", `attachment; filename="${videoInfo.filename}"`);

        if (type === "audio") {
            if (quality === "reduced") {
                // Áudio reduzido para WhatsApp (OGG)
                const audio = spawn("yt-dlp", ["-f", "bestaudio", "-o", "-", videoInfo.url]);
                const ffmpeg = spawn("ffmpeg", [
                    "-i", "pipe:0",
                    "-c:a", "libopus",
                    "-b:a", "64k",
                    "-ar", "16000",
                    "-f", "ogg",
                    "pipe:1"
                ]);
                audio.stdout.pipe(ffmpeg.stdin);
                ffmpeg.stdout.pipe(res);
                audio.stderr.on("data", d => console.error("YT-DLP:", d.toString()));
                ffmpeg.stderr.on("data", d => console.error("FFMPEG:", d.toString()));
            } else {
                // Áudio perfeito (MP3)
                const audio = spawn("yt-dlp", ["-f", "bestaudio", "-o", "-", videoInfo.url]);
                audio.stdout.pipe(res);
                audio.stderr.on("data", d => console.error("YT-DLP:", d.toString()));
            }
        } else {
            // Vídeo (com áudio)
            const videoStream = spawn("yt-dlp", ["-f", "bv*[ext=mp4]/best", "-o", "-", videoInfo.url]);
            const audioStream = spawn("yt-dlp", ["-f", "ba[ext=m4a]/bestaudio/best", "-o", "-", videoInfo.url]);
            const ffmpeg = spawn("ffmpeg", [
                "-i", "pipe:3",
                "-i", "pipe:4",
                "-c:v", "copy",
                "-c:a", "aac",
                "-f", "mp4",
                "pipe:1"
            ], { stdio: ["pipe","pipe","pipe","pipe","pipe"] });
            videoStream.stdout.pipe(ffmpeg.stdio[3]);
            audioStream.stdout.pipe(ffmpeg.stdio[4]);
            ffmpeg.stdout.pipe(res);

            ffmpeg.stderr.on("data", d => console.error("FFMPEG:", d.toString()));
            videoStream.stderr.on("data", d => console.error("VIDEO:", d.toString()));
            audioStream.stderr.on("data", d => console.error("AUDIO:", d.toString()));
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// iPhone Audio
app.get("/api/iphone-audio", checkApiKey, async (req, res) => {
  const { name, info } = req.query;
  if (!name) return res.status(400).json({ error: "Nome da música obrigatório" });

  try {
    const videoInfo = await downloadYouTube(name);

    // Se for apenas para informações, retorna JSON com dados
    if (info === "true") {
      return res.json({
        title: videoInfo.title,
        thumbnail: videoInfo.thumbnail,
        duration: videoInfo.duration,
        minutes: videoInfo.minutes,
        seconds: videoInfo.seconds,
        url: videoInfo.url
      });
    }

    // Se for para download, processa o áudio
    const filename = `${videoInfo.title.replace(/[^a-zA-Z0-9 \-_.]/g, "")}.aac`;
    
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "audio/aac");

    const audio = spawn("yt-dlp", ["-f", "bestaudio", "-o", "-", videoInfo.url]);
    const ffmpeg = spawn("ffmpeg", [
      "-i", "pipe:0",
      "-c:a", "aac",
      "-b:a", "128k",
      "-f", "adts",
      "pipe:1"
    ]);

    audio.stdout.pipe(ffmpeg.stdin);
    ffmpeg.stdout.pipe(res);

    audio.stderr.on("data", d => console.error("YT-DLP:", d.toString()));
    ffmpeg.stderr.on("data", d => console.error("FFMPEG:", d.toString()));

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Weather
app.get("/api/weather", checkApiKey, async (req, res) => {
  try {
    const { city, language = "pt_br", units = "metric" } = req.query;
    const clima = await obterClima(city, language, units);
    res.json(clima);
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message
    });
  }
});

// Facebook
app.get("/api/facebook", checkApiKey, async (req, res) => {
    try {
        let { url, cookies, userAgent } = req.query;
        if (!url) return res.status(400).json({ error: "URL não informada" });

        const resultado = await downloadFacebook(url, cookies, userAgent);
        res.json(resultado);
    } catch (error) {
        console.error("Erro no /api/facebook:", error.message || error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});

// Instagram
app.get("/api/instagram", checkApiKey, async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) return res.status(400).json({ error: "URL não informada" });

        const resultado = await downloadInstagram(url);
        res.json(resultado);
    } catch (err) {
        console.error("Erro no /api/instagram:", err.message || err);
        res.status(500).json({ error: err.message });
    }
});

// Instagram V2
app.get("/api/instagramV2", checkApiKey, async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: true, message: "❌ URL do Instagram obrigatória." });

    try {
        const cleanUrl = url.split("?")[0];

        if (!cleanUrl.includes("/p/") && !cleanUrl.includes("/reel/")) {
            return res.status(400).json({
                error: true,
                message: "❌ Apenas links de *posts* ou *reels* são suportados!"
            });
        }

        const data = await downloadInstagram(cleanUrl);
        const mediaUrl = data.media[0].url;

        res.setHeader("Content-Disposition", `attachment; filename="instagram_media.${data.media[0].type === "video" ? "mp4" : "jpg"}"`);

        const response = await fetch(mediaUrl);
        if (!response.ok) throw new Error("Falha ao baixar mídia do Instagram");

        response.body.pipe(res);

    } catch (err) {
        console.error("Erro no /api/instagramV2:", err.message || err);
        res.status(500).json({ error: true, message: "Erro interno ao processar a mídia." });
    }
});

// Claila AI
app.get("/api/claila", checkApiKey, async (req, res) => {
    try {
        const { message, model = "gpt-4o", sessionId } = req.query;

        if (!message) {
            return res.status(400).json({
                success: false,
                error: "Parâmetro 'message' é obrigatório"
            });
        }

        if (!CLAILA_MODELS[model]) {
            return res.status(400).json({
                success: false,
                error: "Modelo inválido",
                available_models: Object.keys(CLAILA_MODELS)
            });
        }

        const result = await sendClailaMessage(message, sessionId, model);

        res.json({
            success: true,
            data: {
                message: message,
                response: result.response,
                session_id: result.sessionId,
                model: result.model,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error("Erro na rota /api/claila:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GPT-5
app.get("/api/gpt5", checkApiKey, async (req, res) => {
    try {
        const { message, sessionId } = req.query;

        if (!message || message.trim() === "") {
            return res.status(400).json({
                success: false,
                error: "❌ Parâmetro 'message' é obrigatório",
                exemplo: "/api/gpt5?message=Olá, como você está?"
            });
        }

        const promptPortugues = `
IMPORTANTE: Você DEVE responder em PORTUGUÊS do Brasil sempre, de forma natural e direta.
NÃO explique que está respondendo em português. NÃO mencione o idioma.
Apenas responda a pergunta normalmente em português brasileiro.

PERGUNTA DO USUÁRIO: ${message.trim()}

SUA RESPOSTA EM PORTUGUÊS BRASILEIRO:
`.trim();

        console.log(`📨 GPT-5 Request: ${message.substring(0, 50)}...`);

        const result = await sendClailaMessage(promptPortugues, sessionId, "gpt-5");

        const resposta = result.response || "";
        const isPortuguese = /[ãõáéíóúâêîôûàèìòùç]/i.test(resposta);

        if (!isPortuguese) {
            console.warn("⚠️  Resposta possivelmente não está em português:", resposta.substring(0, 100));
        }

        res.json({
            success: true,
            data: {
                pergunta: message.trim(),
                resposta: resposta,
                modelo: "GPT-5 (Português Brasileiro)",
                sessao: result.sessionId,
                portugues: isPortuguese,
                timestamp: new Date().toISOString()
            },
            meta: {
                versao: "1.0",
                idioma: "pt-BR",
                modelo_forcado: "gpt-5"
            }
        });

    } catch (error) {
        console.error("❌ Erro GPT-5:", error.message);
        
        res.status(500).json({
            success: false,
            error: "Erro no GPT-5",
            detalhes: error.message,
            solucao: "Tente novamente em alguns segundos"
        });
    }
});

// GPT-5 Ebook
app.get("/api/gpt5-ebook", checkApiKey, async (req, res) => {
    try {
        const { message, continuacao = true } = req.query;

        if (!message || message.trim() === "") {
            return res.status(400).json({
                success: false,
                error: "❌ Parâmetro 'message' é obrigatório",
                exemplo: "/api/gpt5-ebook?message=me explique sobre a capa do ebook"
            });
        }

        const SESSÃO_EBOOK = "1758628864955";
        
        console.log(`📚 Continuando sessão eBook [${SESSÃO_EBOOK}]: ${message.substring(0, 50)}...`);

        const promptContinuacao = `
CONTEXTO DA SESSÃO ANTERIOR: Estávamos falando sobre criação de ebooks para vender rápido. 
O usuário pediu um plano de 72 horas para criar e vender um ebook rapidamente.

RESUMO DA ÚLTIMA RESPOSTA: Foi fornecido um plano detalhado de 72 horas incluindo:
- Escolha de tema com dor urgente
- Estrutura do ebook (40-80 páginas)
- Diagramação com Canva
- Página de vendas e estratégia de lançamento
- Preços e bônus

AGORA O USUÁRIO PERGUNTA: ${message.trim()}

CONTINUE A CONVERSA MANTENDO O CONTEXTO DO EBOOK. 
Responda em PORTUGUÊS, seja prático e direto, focando no assunto de criação e venda de ebooks.
`.trim();

        const result = await sendClailaMessage(promptContinuacao, SESSÃO_EBOOK, "gpt-5");

        const resposta = result.response || "";
        const isPortuguese = /[ãõáéíóúâêîôûàèìòùç]/i.test(resposta);

        res.json({
            success: true,
            data: {
                pergunta: message.trim(),
                resposta: resposta,
                modelo: "GPT-5 Sessão eBook",
                sessao: SESSÃO_EBOOK,
                sessao_fixa: true,
                portugues: isPortuguese,
                contexto: "continuacao_ebook",
                timestamp: new Date().toISOString()
            },
            meta: {
                versao: "1.0",
                idioma: "pt-BR",
                tema: "criacao_venda_ebooks"
            }
        });

    } catch (error) {
        console.error("❌ Erro GPT-5 eBook:", error.message);
        
        res.status(500).json({
            success: false,
            error: "Erro ao continuar conversa sobre ebooks",
            detalhes: error.message,
            sessao: "1758628864955"
        });
    }
});

// Novo Ebook
app.get("/api/gpt5-ebook-novo", checkApiKey, async (req, res) => {
    try {
        const { message, tema } = req.query;

        if (!message) {
            return res.status(400).json({
                success: false,
                error: "Parâmetro 'message' é obrigatório"
            });
        }

        const SESSÃO_EBOOK_NOVA = Date.now().toString();
        
        const promptNovo = `
INICIAR NOVA CONVERSA SOBRE CRIAÇÃO DE EBOOKS:

TEMA SOLICITADO: ${tema || "geral"}
PERGUNTA DO USUÁRIO: ${message.trim()}

Você é um especialista em criação e venda de ebooks. 
Responda em PORTUGUÊS, seja prático e direto, focando em:
- reescrever PLRs 
- Estratégias de criação rápida
- Formatação e design
- Vendas online
- Plataformas como Kiwify/Hotmart
- Marketing digital para ebooks
`.trim();

        const result = await sendClailaMessage(promptNovo, SESSÃO_EBOOK_NOVA, "gpt-5");

        res.json({
            success: true,
            data: {
                pergunta: message.trim(),
                resposta: result.response,
                modelo: "GPT-5 Novo eBook",
                sessao: SESSÃO_EBOOK_NOVA,
                sessao_fixa: false,
                tema: tema || "reescrever PLRs",
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Erro ao iniciar nova sessão eBook"
        });
    }
});

// Upscale Image
app.get("/api/upscale-imagem", checkApiKey, async (req, res) => {
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

        const respostaDownload = await axios.get(imageUrl, { 
            responseType: "arraybuffer",
            timeout: 15000 
        });

        const mimeType = respostaDownload.headers["content-type"] || "image/jpeg";
        const buffer = Buffer.from(respostaDownload.data);

        console.log(`📥 Imagem baixada: ${(buffer.length / 1024).toFixed(2)} KB`);

        const resultado = await aumentarImagem(buffer, mimeType, escalaNum);

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
});

// Teste Upscale
app.get("/api/upscale-test", checkApiKey, async (req, res) => {
    try {
        const imagemTeste = "https://files.catbox.moe/m452d3.jpg";
        
        const resultado = await aumentarImagem(
            Buffer.from((await axios.get(imagemTeste, { responseType: "arraybuffer" })).data),
            "image/jpeg",
            2
        );

        res.json({
            success: resultado.status === "sucesso",
            teste: "Upscale ImgLarger",
            status: resultado.status === "sucesso" ? "✅ OPERACIONAL" : "❌ FALHOU",
            resultado: resultado
        });

    } catch (erro) {
        res.json({
            success: false,
            teste: "Upscale ImgLarger",
            status: "❌ ERRO",
            erro: erro.message
        });
    }
});

// Info Upscale
app.get("/api/upscale-info", checkApiKey, (req, res) => {
    res.json({
        success: true,
        info: {
            nome: "Upscale de Imagem com IA",
            descricao: "Aumenta a qualidade e resolução de imagens usando ImgLarger",
            parametros: {
                imageUrl: "URL da imagem (obrigatório)",
                escala: "2, 3 ou 4 (padrão: 2)"
            },
            limites: {
                tempo_processamento: "até 2 minutos",
                tamanho_imagem: "até 10MB",
                formatos: "JPG, PNG, GIF, WEBP"
            },
            exemplo: "/api/upscale-imagem?imageUrl=https://exemplo.com/foto.jpg&escala=2"
        }
    });
});

// ==================== ROTAS INSTAGRAM SCRAPER ====================

// Rota principal do Instagram Scraper
app.get("/api/instagram-scraper", checkApiKey, async (req, res) => {
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

        const resultado = await igScraper(url);

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
});

// Rota de download direto do Instagram
app.get("/api/instagram-download", checkApiKey, async (req, res) => {
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
});

// Rota de teste do Instagram Scraper
app.get("/api/instagram-test", checkApiKey, async (req, res) => {
    try {
        const testUrl = "https://www.instagram.com/reel/DLzVjkAzMOh/?igsh=dzU2cDVob2o1Nmtq";
        
        console.log("🧪 Testando Instagram Scraper...");
        
        const resultado = await igScraper(testUrl);

        res.json({
            success: resultado.success,
            teste: "Instagram Scraper (GramFetchr)",
            status: resultado.success ? "✅ OPERACIONAL" : "❌ FALHOU",
            url_teste: testUrl,
            resultado: resultado,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.json({
            success: false,
            teste: "Instagram Scraper",
            status: "❌ ERRO",
            erro: error.message
        });
    }
});

// Rota de informações do Instagram Scraper
app.get("/api/instagram-info", checkApiKey, (req, res) => {
    res.json({
        success: true,
        info: {
            nome: "Instagram Scraper - GramFetchr",
            descricao: "Baixa mídias do Instagram (fotos, vídeos, reels, stories)",
            recursos: [
                "✅ Posts públicos",
                "✅ Reels", 
                "✅ Stories públicos",
                "✅ Fotos e vídeos",
                "✅ Download direto",
                "✅ Thumbnails e previews"
            ],
            rotas: {
                scraper: "/api/instagram-scraper?url=URL_INSTAGRAM",
                download: "/api/instagram-download?url=URL_INSTAGRAM&download=true",
                teste: "/api/instagram-test"
            },
            parametros: {
                url: "URL do Instagram (obrigatório)",
                tipo: "todos, video, ou image (opcional)",
                download: "true para download direto (opcional)",
                item: "Número do item para download (opcional)"
            },
            exemplos: [
                "/api/instagram-scraper?url=https://www.instagram.com/p/ABC123/",
                "/api/instagram-download?url=https://www.instagram.com/reel/XYZ456/&tipo=video&download=true",
                "/api/instagram-download?url=https://www.instagram.com/p/DEF789/&item=2&download=true"
            ],
            limites: "Sujeito aos limites do GramFetchr.com"
        }
    });
});
// ==================== ROTAS YOUTUBE DOWNLOADER ====================

// Rota principal do YouTube Downloader
app.get("/api/ytdown", checkApiKey, async (req, res) => {
    try {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({
                success: false,
                error: "Parâmetro 'url' do YouTube é obrigatório",
                exemplo: "/api/ytdown?url=https://youtu.be/eyUhucvGvDE"
            });
        }

        // Validar URL do YouTube
        if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
            return res.status(400).json({
                success: false,
                error: "URL deve ser do YouTube",
                dominios_validos: ["youtube.com", "youtu.be", "www.youtube.com"]
            });
        }

        console.log(`🎬 YouTube Downloader: ${url.substring(0, 60)}...`);

        const resultado = await ytdown(url);

        if (!resultado.success) {
            return res.status(500).json({
                success: false,
                error: resultado.error,
                url: url
            });
        }

        res.json({
            success: true,
            data: resultado.data
        });

    } catch (error) {
        console.error("❌ Erro no YouTube Downloader:", error.message);
        
        res.status(500).json({
            success: false,
            error: "Erro ao processar URL do YouTube",
            detalhes: error.message
        });
    }
});

// Rota de download direto do YouTube
app.get("/api/ytdown/download", checkApiKey, async (req, res) => {
    try {
        const { url, qualidade = '720p', download } = req.query;
        
        if (!url) {
            return res.status(400).json({
                success: false,
                error: "Parâmetro 'url' do YouTube é obrigatório"
            });
        }

        console.log(`📥 YouTube Download Direto: ${url.substring(0, 60)} [${qualidade}]`);

        const resultado = await downloadYouTubeDirect(url, qualidade);

        // Se não for para download direto, retorna informações
        if (!download || download === "false") {
            return res.json({
                success: true,
                data: resultado,
                download_direto: `${req.protocol}://${req.get("host")}/api/ytdown/download?url=${encodeURIComponent(url)}&qualidade=${qualidade}&download=true&apikey=${req.query.apikey || ""}`
            });
        }

        // Download direto
        const response = await axios.get(resultado.download_url, { 
            responseType: 'stream',
            timeout: 30000
        });

        // Configurar headers para download
        const filename = `youtube_${resultado.title.replace(/[^a-zA-Z0-9]/g, '_')}_${qualidade}.mp4`;
        
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', response.headers['content-length']);
        
        response.data.pipe(res);

    } catch (error) {
        console.error("❌ Erro no YouTube Download Direto:", error.message);
        
        res.status(500).json({
            success: false,
            error: "Erro ao baixar vídeo do YouTube",
            detalhes: error.message
        });
    }
});

// Rota para listar qualidades disponíveis
app.get("/api/ytdown/qualidades", checkApiKey, async (req, res) => {
    try {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({
                success: false,
                error: "Parâmetro 'url' do YouTube é obrigatório"
            });
        }

        const resultado = await ytdown(url);

        if (!resultado.success) {
            return res.status(500).json({
                success: false,
                error: resultado.error
            });
        }

        const qualidades = {
            video: resultado.data.downloads.video ? resultado.data.downloads.video.map(item => ({
                qualidade: item.quality,
                resolucao: item.resolution,
                tamanho: item.size,
                url_download: `${req.protocol}://${req.get("host")}/api/ytdown/download?url=${encodeURIComponent(url)}&qualidade=${item.quality.split(' ')[0]}&download=true&apikey=${req.query.apikey || ""}`
            })) : [],
            audio: resultado.data.downloads.audio ? resultado.data.downloads.audio.map(item => ({
                formato: item.format,
                qualidade: item.quality,
                tamanho: item.size,
                url_download: `${req.protocol}://${req.get("host")}/api/ytdown/download?url=${encodeURIComponent(url)}&qualidade=audio&download=true&apikey=${req.query.apikey || ""}`
            })) : []
        };

        res.json({
            success: true,
            data: {
                titulo: resultado.data.title,
                thumbnail: resultado.data.thumbnail,
                qualidades: qualidades,
                total_opcoes: qualidades.video.length + qualidades.audio.length
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Rota de teste do YouTube Downloader
app.get("/api/ytdown/test", checkApiKey, async (req, res) => {
    try {
        const testUrl = "https://youtu.be/eyUhucvGvDE?si=hh5ZA7GeQhZonflb";
        
        console.log("🧪 Testando YouTube Downloader...");
        
        const resultado = await ytdown(testUrl);

        res.json({
            success: resultado.success,
            teste: "YouTube Downloader (YTDown.io)",
            status: resultado.success ? "✅ OPERACIONAL" : "❌ FALHOU",
            url_teste: testUrl,
            resultado: resultado.success ? {
                titulo: resultado.data.title,
                qualidades_video: resultado.data.downloads.video?.length || 0,
                qualidades_audio: resultado.data.downloads.audio?.length || 0
            } : resultado.error,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.json({
            success: false,
            teste: "YouTube Downloader",
            status: "❌ ERRO",
            erro: error.message
        });
    }
});

// Rota de informações do YouTube Downloader
app.get("/api/ytdown/info", checkApiKey, (req, res) => {
    res.json({
        success: true,
        info: {
            nome: "YouTube Downloader - YTDown.io",
            descricao: "Baixa vídeos e áudios do YouTube em várias qualidades",
            recursos: [
                "✅ Vídeos até 1080p",
                "✅ Áudio em MP3", 
                "✅ Múltiplas qualidades",
                "✅ Metadados completos",
                "✅ Download direto",
                "✅ Informações do canal"
            ],
            qualidades_suportadas: [
                "360p (Low)",
                "480p (SD)", 
                "720p (HD)",
                "1080p (FHD)",
                "Áudio MP3"
            ],
            rotas: {
                informacoes: "/api/ytdown?url=URL_YOUTUBE",
                download: "/api/ytdown/download?url=URL_YOUTUBE&qualidade=720p&download=true",
                qualidades: "/api/ytdown/qualidades?url=URL_YOUTUBE",
                teste: "/api/ytdown/test"
            },
            parametros: {
                url: "URL do YouTube (obrigatório)",
                qualidade: "360p, 480p, 720p, 1080p, audio (padrão: 720p)",
                download: "true para download direto (opcional)"
            },
            exemplos: [
                "/api/ytdown?url=https://youtu.be/eyUhucvGvDE",
                "/api/ytdown/download?url=https://youtube.com/watch?v=ABC123&qualidade=1080p&download=true",
                "/api/ytdown/qualidades?url=https://youtu.be/XYZ456"
            ],
            limites: "Sujeito aos limites do YTDown.io"
        }
    });
});

// -------------------- START --------------------
app.listen(PORT, () => console.log(`🚀 API rodando na porta ${PORT}`));