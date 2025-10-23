// controllers/adminController.js
import { 
    loadKeys, 
    saveKeys, 
    createKey, 
    removeKey, 
    resetKeyUsage,
    getUsageStats 
} from '../utils/keyManager.js';

// Rota para servir o painel administrativo
export const adminPanel = (req, res) => {
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Painel Administrativo - API Manager</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        .gradient-bg {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .stats-card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
    </style>
</head>
<body class="gradient-bg min-h-screen text-white">
    <div class="container mx-auto px-4 py-8">
        <!-- Header -->
        <div class="text-center mb-8">
            <h1 class="text-4xl font-bold mb-2">
                <i class="fas fa-key mr-3"></i>
                Painel Administrativo
            </h1>
            <p class="text-xl opacity-80">Gerenciamento de API Keys</p>
        </div>

        <!-- Stats Cards -->
        <div id="stats" class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <!-- Stats serão carregados via JavaScript -->
        </div>

        <!-- Actions -->
        <div class="stats-card rounded-lg p-6 mb-8">
            <h2 class="text-2xl font-bold mb-4">
                <i class="fas fa-plus-circle mr-2"></i>
                Criar Nova API Key
            </h2>
            <form id="createKeyForm" class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input type="text" id="keyName" placeholder="Nome/Proprietário" 
                       class="bg-gray-800 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                <input type="number" id="keyLimit" placeholder="Limite de uso" value="1000"
                       class="bg-gray-800 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                <input type="number" id="keyExpiry" placeholder="Expira em (dias)" 
                       class="bg-gray-800 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <button type="submit" 
                        class="bg-green-600 hover:bg-green-700 rounded px-4 py-2 font-bold transition duration-200">
                    <i class="fas fa-plus mr-2"></i>
                    Criar Key
                </button>
            </form>
        </div>

        <!-- Keys List -->
        <div class="stats-card rounded-lg p-6">
            <h2 class="text-2xl font-bold mb-4">
                <i class="fas fa-list mr-2"></i>
                API Keys Cadastradas
            </h2>
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead>
                        <tr class="border-b border-gray-600">
                            <th class="text-left py-3 px-4">Key</th>
                            <th class="text-left py-3 px-4">Proprietário</th>
                            <th class="text-left py-3 px-4">Uso</th>
                            <th class="text-left py-3 px-4">Status</th>
                            <th class="text-left py-3 px-4">Criada em</th>
                            <th class="text-left py-3 px-4">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="keysList">
                        <!-- Keys serão carregadas via JavaScript -->
                    </tbody>
                </table>
            </div>
        </div>

        <!-- API Documentation -->
        <div class="stats-card rounded-lg p-6 mt-8">
            <h2 class="text-2xl font-bold mb-4">
                <i class="fas fa-book mr-2"></i>
                Como usar as API Keys
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <h3 class="text-lg font-bold mb-2">Via Query Parameter:</h3>
                    <code class="bg-gray-800 p-2 rounded block text-sm">
                        GET /api/weather?city=Rio&apikey=SUA_CHAVE_AQUI
                    </code>
                </div>
                <div>
                    <h3 class="text-lg font-bold mb-2">Via Header:</h3>
                    <code class="bg-gray-800 p-2 rounded block text-sm">
                        x-api-key: SUA_CHAVE_AQUI
                    </code>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Carregar estatísticas e keys
        async function loadAdminData() {
            try {
                const response = await fetch('/admin/api/keys?apikey=admin_lv08h2i1g3');
                const data = await response.json();
                
                updateStats(data.stats);
                updateKeysList(data.keys);
            } catch (error) {
                console.error('Erro ao carregar dados:', error);
            }
        }

        function updateStats(stats) {
            const statsContainer = document.getElementById('stats');
            statsContainer.innerHTML = 
                '<div class="stats-card rounded-lg p-4 text-center">' +
                    '<div class="text-3xl font-bold">' + stats.total_keys + '</div>' +
                    '<div class="text-sm opacity-80">Total de Keys</div>' +
                '</div>' +
                '<div class="stats-card rounded-lg p-4 text-center">' +
                    '<div class="text-3xl font-bold">' + stats.active_keys + '</div>' +
                    '<div class="text-sm opacity-80">Keys Ativas</div>' +
                '</div>' +
                '<div class="stats-card rounded-lg p-4 text-center">' +
                    '<div class="text-3xl font-bold">' + stats.total_usage + '</div>' +
                    '<div class="text-sm opacity-80">Total de Usos</div>' +
                '</div>' +
                '<div class="stats-card rounded-lg p-4 text-center">' +
                    '<div class="text-3xl font-bold">' + stats.keys_near_limit.length + '</div>' +
                    '<div class="text-sm opacity-80">Perto do Limite</div>' +
                '</div>';
        }

        function updateKeysList(keys) {
            const keysContainer = document.getElementById('keysList');
            
            if (keys.length === 0) {
                keysContainer.innerHTML = '<tr><td colspan="6" class="py-4 text-center">Nenhuma API key cadastrada</td></tr>';
                return;
            }

            keysContainer.innerHTML = keys.map(key => 
                '<tr class="border-b border-gray-700 hover:bg-gray-800">' +
                    '<td class="py-3 px-4">' +
                        '<code class="bg-gray-900 px-2 py-1 rounded text-sm">' + key.key.substring(0, 8) + '...</code>' +
                    '</td>' +
                    '<td class="py-3 px-4">' + key.owner + '</td>' +
                    '<td class="py-3 px-4">' +
                        '<div class="flex items-center">' +
                            '<div class="w-24 bg-gray-700 rounded-full h-2 mr-2">' +
                                '<div class="bg-' + (key.used >= key.limit ? 'red' : 'green') + '-500 h-2 rounded-full" ' +
                                     'style="width: ' + Math.min((key.used / key.limit) * 100, 100) + '%"></div>' +
                            '</div>' +
                            '<span>' + key.used + '/' + key.limit + '</span>' +
                        '</div>' +
                    '</td>' +
                    '<td class="py-3 px-4">' +
                        '<span class="px-2 py-1 rounded text-xs ' + (key.status === 'active' ? 'bg-green-600' : 'bg-red-600') + '">' +
                            key.status +
                        '</span>' +
                    '</td>' +
                    '<td class="py-3 px-4">' + new Date(key.createdAt).toLocaleDateString('pt-BR') + '</td>' +
                    '<td class="py-3 px-4">' +
                        '<button onclick="resetKey(\\'' + key.key + '\\')" ' +
                                'class="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm mr-2">' +
                            '<i class="fas fa-redo mr-1"></i>Reset' +
                        '</button>' +
                        '<button onclick="deleteKey(\\'' + key.key + '\\')" ' +
                                'class="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm">' +
                            '<i class="fas fa-trash mr-1"></i>Excluir' +
                        '</button>' +
                    '</td>' +
                '</tr>'
            ).join('');
        }

        // Form para criar nova key
        document.getElementById('createKeyForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                owner: document.getElementById('keyName').value,
                limit: parseInt(document.getElementById('keyLimit').value),
                expiresInDays: document.getElementById('keyExpiry').value ? parseInt(document.getElementById('keyExpiry').value) : null
            };

            try {
                const response = await fetch('/admin/api/keys?apikey=admin_lv08h2i1g3', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();
                
                if (result.success) {
                    alert('API Key criada com sucesso!\\nKey: ' + result.key);
                    document.getElementById('createKeyForm').reset();
                    loadAdminData();
                } else {
                    alert('Erro: ' + result.error);
                }
            } catch (error) {
                alert('Erro ao criar key: ' + error.message);
            }
        });

        // Funções de ação
        async function resetKey(key) {
            if (confirm('Resetar o contador de uso desta key?')) {
                try {
                    const response = await fetch('/admin/api/keys/' + key, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ used: 0 })
                    });
                    
                    const result = await response.json();
                    if (result.success) {
                        loadAdminData();
                    } else {
                        alert('Erro: ' + result.error);
                    }
                } catch (error) {
                    alert('Erro ao resetar key: ' + error.message);
                }
            }
        }

        async function deleteKey(key) {
            if (confirm('Tem certeza que deseja excluir esta API key?')) {
                try {
                    const response = await fetch('/admin/api/keys/' + key, {
                        method: 'DELETE'
                    });
                    
                    const result = await response.json();
                    if (result.success) {
                        loadAdminData();
                    } else {
                        alert('Erro: ' + result.error);
                    }
                } catch (error) {
                    alert('Erro ao excluir key: ' + error.message);
                }
            }
        }

        // Carregar dados ao abrir a página
        loadAdminData();
        
        // Atualizar a cada 30 segundos
        setInterval(loadAdminData, 30000);
    </script>
</body>
</html>`;

    res.send(html);
};

// API endpoints para o painel admin
export const listarKeys = (req, res) => {
    const keys = loadKeys();
    const stats = getUsageStats();
    
    res.json({
        success: true,
        keys: keys,
        stats: stats
    });
};

export const criarKey = (req, res) => {
    const { owner, limit, expiresInDays } = req.body;
    
    if (!owner || !limit) {
        return res.status(400).json({ 
            success: false, 
            error: "Proprietário e limite são obrigatórios" 
        });
    }

    try {
        // Gerar key aleatória
        const newKey = 'sk_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        
        const keyData = createKey(newKey, limit, owner, { expiresInDays });
        
        res.json({
            success: true,
            message: "Key criada com sucesso",
            key: newKey,
            data: keyData
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

export const atualizarKey = (req, res) => {
    const { key } = req.params;
    const { limit, used, status } = req.body;
    
    const keys = loadKeys();
    const keyIndex = keys.findIndex(k => k.key === key);
    
    if (keyIndex === -1) {
        return res.status(404).json({ 
            success: false, 
            error: "Key não encontrada" 
        });
    }

    if (limit !== undefined) keys[keyIndex].limit = limit;
    if (used !== undefined) keys[keyIndex].used = used;
    if (status !== undefined) keys[keyIndex].status = status;
    
    saveKeys(keys);
    
    res.json({ 
        success: true, 
        message: "Key atualizada",
        key: keys[keyIndex]
    });
};

export const deletarKey = (req, res) => {
    const { key } = req.params;
    
    const removed = removeKey(key);
    
    if (removed) {
        res.json({ 
            success: true, 
            message: "Key removida" 
        });
    } else {
        res.status(404).json({ 
            success: false, 
            error: "Key não encontrada" 
        });
    }
};