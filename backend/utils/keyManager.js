// utils/keyManager.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEYS_FILE = path.join(__dirname, '../data/api-keys.json');

// Garante que o diretório data existe
const ensureDataDirectory = () => {
    const dataDir = path.dirname(KEYS_FILE);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
};

/**
 * Carrega as API keys do arquivo
 * @returns {Array} Lista de keys
 */
export const loadKeys = () => {
    try {
        ensureDataDirectory();
        
        if (!fs.existsSync(KEYS_FILE)) {
            // Cria arquivo com array vazio se não existir
            saveKeys([]);
            return [];
        }
        
        const data = fs.readFileSync(KEYS_FILE, 'utf8');
        const keys = JSON.parse(data);
        
        // Filtra keys expiradas
        const validKeys = keys.filter(key => {
            if (key.expiresAt) {
                return new Date(key.expiresAt) > new Date();
            }
            return true; // Keys sem expiração são sempre válidas
        });
        
        // Se houve remoção de keys expiradas, salva o arquivo
        if (validKeys.length !== keys.length) {
            saveKeys(validKeys);
        }
        
        return validKeys;
    } catch (error) {
        console.error('❌ Erro ao carregar keys:', error);
        return [];
    }
};

/**
 * Salva as API keys no arquivo
 * @param {Array} keys - Lista de keys
 */
export const saveKeys = (keys) => {
    try {
        ensureDataDirectory();
        fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2));
    } catch (error) {
        console.error('❌ Erro ao salvar keys:', error);
    }
};

/**
 * Incrementa o uso de uma API key
 * @param {string} apiKey - API Key
 */
export const incrementKeyUsage = (apiKey) => {
    try {
        const keys = loadKeys();
        const keyIndex = keys.findIndex(k => k.key === apiKey);
        
        if (keyIndex !== -1) {
            keys[keyIndex].used = (keys[keyIndex].used || 0) + 1;
            keys[keyIndex].lastUsed = new Date().toISOString();
            saveKeys(keys);
        }
    } catch (error) {
        console.error('❌ Erro ao incrementar uso da key:', error);
    }
};

/**
 * Cria uma nova API key
 * @param {string} key - Chave
 * @param {number} limit - Limite de uso
 * @param {string} owner - Proprietário
 * @param {Object} options - Opções adicionais
 * @returns {Object} Key criada
 */
export const createKey = (key, limit, owner = 'unknown', options = {}) => {
    const newKey = {
        key,
        limit,
        used: 0,
        owner,
        status: 'active',
        createdAt: new Date().toISOString(),
        lastUsed: null,
        ...options
    };
    
    if (options.expiresInDays) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + options.expiresInDays);
        newKey.expiresAt = expiryDate.toISOString();
    }
    
    const keys = loadKeys();
    
    // Verifica se a key já existe
    if (keys.find(k => k.key === key)) {
        throw new Error('API Key já existe');
    }
    
    keys.push(newKey);
    saveKeys(keys);
    
    return newKey;
};

/**
 * Remove uma API key
 * @param {string} apiKey - API Key para remover
 * @returns {boolean} True se removida
 */
export const removeKey = (apiKey) => {
    try {
        const keys = loadKeys();
        const filteredKeys = keys.filter(k => k.key !== apiKey);
        
        if (filteredKeys.length !== keys.length) {
            saveKeys(filteredKeys);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('❌ Erro ao remover key:', error);
        return false;
    }
};

/**
 * Reseta o uso de uma API key
 * @param {string} apiKey - API Key
 * @returns {boolean} True se resetada
 */
export const resetKeyUsage = (apiKey) => {
    try {
        const keys = loadKeys();
        const keyIndex = keys.findIndex(k => k.key === apiKey);
        
        if (keyIndex !== -1) {
            keys[keyIndex].used = 0;
            keys[keyIndex].lastUsed = null;
            saveKeys(keys);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('❌ Erro ao resetar key:', error);
        return false;
    }
};

/**
 * Obtém estatísticas de uso
 * @returns {Object} Estatísticas
 */
export const getUsageStats = () => {
    const keys = loadKeys();
    
    return {
        total_keys: keys.length,
        active_keys: keys.filter(k => k.status === 'active').length,
        total_usage: keys.reduce((sum, key) => sum + (key.used || 0), 0),
        keys_near_limit: keys.filter(k => k.used >= k.limit * 0.8), // 80% do limite
        recent_activity: keys
            .filter(k => k.lastUsed)
            .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))
            .slice(0, 10)
    };
};