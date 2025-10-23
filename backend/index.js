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
import FormData from "form-data"
import multer from "multer";

// index.js
import { instagramScraper, instagramDownload } from './controllers/instagramScraperController.js';
import { toFigureV1, toFigureV2, toFigureUpload } from './controllers/tofigureController.js';
import { upscaleImageHandler } from './controllers/upscaleController.js';
import { chatWithClaila, getClailaInfo } from './controllers/clailaController.js';
import { getInstagramMedia, getInstagramMediaV2 } from './controllers/instagramController.js';
import { getWeather } from './controllers/weatherController.js';
import { searchYouTube, searchOneYouTube, downloadYouTubeAudio, downloadiPhoneAudio, testServices } from './controllers/youtubeController.js';
import { handleEromeAlbum, handleEromeProxy } from "./controllers/eromeController.js";
import { adminPanel, listarKeys, criarKey, atualizarKey, deletarKey } from './controllers/adminController.js';
import { checkApiKey, checkAdminKey, apiLogger } from './middleware/checkApiKey.js';
import { loadKeys, createKey } from './utils/keyManager.js';
import { tiktokController } from './controllers/tiktokController.js';
import { youtubeConverterController } from './controllers/youtubeConverterController.js';





const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas imagens são permitidas'), false);
        }
    }
});



const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

const tempDir = path.join(__dirname, "downloads");
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

// API endpoints do admin (protegidos com checkAdminKey)
app.get("/admin", checkAdminKey, adminPanel);
app.get("/admin/api/keys", checkAdminKey, listarKeys);
app.post("/admin/api/keys", checkAdminKey, criarKey);
app.put("/admin/api/keys/:key", checkAdminKey, atualizarKey);
app.delete("/admin/api/keys/:key", checkAdminKey, deletarKey);
// -------------------- ROTAS PÚBLICAS --------------------
// Rota de Health Check
app.get('/api/health', (req, res) => {
    try {
        res.status(200).json({
            status: 'ok',
            uptime: process.uptime(),    // tempo que o servidor está rodando em segundos
            timestamp: Date.now()
        });
    } catch (err) {
        res.status(500).json({
            status: 'error',
            error: err.message
        });
    }
});
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "../frontend", "start.html")));
app.get("/api/erome", checkApiKey, handleEromeAlbum);
app.get("/api/erome/proxy", checkApiKey, handleEromeProxy);

app.get("/api/yt/search", checkApiKey, searchYouTube);           // Múltiplos resultados
app.get("/api/yt/search/one", checkApiKey, searchOneYouTube);    // ✅ 1 resultado preciso
app.get("/api/yt/download", checkApiKey, downloadYouTubeAudio);
app.get("/api/iphone-audio", checkApiKey, downloadiPhoneAudio);
app.get("/api/yt/test", checkApiKey, testServices);
app.get("/api/iphone-audio", checkApiKey, downloadiPhoneAudio);

app.get("/api/weather", checkApiKey, getWeather);

app.get("/api/instagram", checkApiKey, getInstagramMedia);
app.get("/api/instagramV2", checkApiKey, getInstagramMediaV2);

app.get("/api/claila", checkApiKey, chatWithClaila);
app.get("/api/claila/info", checkApiKey, getClailaInfo);

app.get("/api/upscale-imagem", checkApiKey, upscaleImageHandler);

app.post('/tofigure1', upload.single('image'), toFigureV1);
app.post('/tofigure', upload.single('image'), toFigureV2);
app.post('/tofigure/upload', upload.single('image'), toFigureUpload);

app.get("/api/instagram-scraper", checkApiKey, instagramScraper);
app.get("/api/instagram-download", checkApiKey, instagramDownload);

app.get("/api/tiktok/info", checkApiKey, tiktokController.getTikTokInfo);
app.get("/api/tiktok/download", checkApiKey, tiktokController.getDownloadUrl);
app.get("/api/tiktok/basic", checkApiKey, tiktokController.getBasicInfo);
app.get("/api/tiktok/validate", checkApiKey, tiktokController.validateUrl);
app.get("/api/tiktok/health", checkApiKey, tiktokController.healthCheck);

app.get("/api/youtube/convert", checkApiKey, youtubeConverterController.convertMedia);
app.get("/api/youtube/convert/direct", checkApiKey, youtubeConverterController.convertDirect);
app.get("/api/youtube/convert/info", checkApiKey, youtubeConverterController.getConversionInfo);
app.get("/api/youtube/convert/health", checkApiKey, youtubeConverterController.healthCheck);


// -------------------- START --------------------
app.listen(PORT, () => console.log(`🚀 API rodando na porta ${PORT}`));