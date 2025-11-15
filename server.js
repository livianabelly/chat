// Importando os módulos necessários
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const multer = require('multer'); // Importa o multer
const path = require('path'); // Módulo para trabalhar com caminhos de arquivo

// Configuração de Armazenamento para o Multer
// Garante que a pasta 'uploads' exista na raiz do seu projeto
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Salva os arquivos na pasta 'uploads'
    },
    filename: (req, file, cb) => {
        // Renomeia o arquivo para evitar conflitos (ex: user-1636732800000.png)
        cb(null, 'user-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Configura a pasta 'img' E a pasta 'uploads' como estáticas (públicas)
app.use(express.static('img')); 
app.use(express.static('uploads')); // NOVO: Permite acesso às imagens salvas

// Rota para a página inicial
app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

// NOVO: Rota para Upload de Imagem
app.post('/upload', upload.single('avatar-file'), (req, res) => {
    if (!req.file) {
    return res.status(400).send('Nenhum arquivo enviado.');
  }
    // SOLUÇÃO: Retorna SOMENTE o nome do arquivo.
    // Exemplo: Se o filename for 'user-12345.png', a URL retornada será '/user-12345.png'
    const publicPath = '/' + req.file.filename; 
    
    res.json({ success: true, url: publicPath });
});


// Lógica do Socket.IO (mantida)
const activeUsers = {};

function updateActiveUsers() {
    const usersArray = Object.values(activeUsers);
    io.emit('active users', usersArray);
}

io.on('connection', (socket) => {
    console.log('Usuário conectado');

    // 1. REGISTRO DE NOVO USUÁRIO
    socket.on('user login', (userData) => {
        activeUsers[socket.id] = {
            id: socket.id,
            nome: userData.nome,
            foto: userData.foto 
        };
        console.log(`Usuário logado: ${userData.nome}`);
        updateActiveUsers();
    });

    // 2. MENSAGENS DE CHAT
    socket.on('chat message', (data) => {
        const sender = activeUsers[socket.id];
        
        if (sender) {
             const messageData = {
                 nome: data.nome,
                 mensagem: data.mensagem,
                 timestamp: Date.now()
             };
             io.emit('chat message', messageData);
        }
    });

    // 3. DESCONEXÃO DO USUÁRIO
    socket.on('disconnect', () => {
        const disconnectedUser = activeUsers[socket.id];
        if (disconnectedUser) {
            console.log(`Usuário desconectado: ${disconnectedUser.nome}`);
            delete activeUsers[socket.id];
            updateActiveUsers();
        } else {
             console.log('Usuário desconectado (não logado)');
        }
    });
});

// Inicia o servidor na porta 3000
http.listen(3000, () => {
    console.log(`Servidor rodando na porta 3000 - Link http://localhost:3000`);
});