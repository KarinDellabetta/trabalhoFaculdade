const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Importação dos Modelos
const Usuario = require('./models/Usuario');
const Pergunta = require('./models/Pergunta');
const HumorOpcoes = require('./models/HumorOpcoes');
const HumorLog = require('./models/HumorLog');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Serve os arquivos HTML/CSS/JS front-end

// Conexão com o MongoDB Atlas
const mongoURI = 'mongodb+srv://bettaleuck_db_user:JNFwTEB5SSz40Dvj@projetofaculdade.ofrlixt.mongodb.net/teampulse?appName=ProjetoFaculdade';

mongoose.connect(mongoURI)
    .then(() => console.log('✅ MongoDB Atlas Conectado com Sucesso!'))
    .catch(err => console.error('❌ Erro ao conectar no MongoDB:', err));

// =================================================================
// ROTAS - USUÁRIOS
// =================================================================

// Criar novo usuário (Cadastro)
app.post('/api/usuarios', async (req, res) => {
    try {
        const novoUsuario = new Usuario(req.body);
        await novoUsuario.save();
        res.status(201).json({ mensagem: 'Usuário cadastrado com sucesso!', usuario: novoUsuario });
    } catch (err) {
        res.status(400).json({ erro: 'Erro ao cadastrar usuário', detalhe: err.message });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    const { email, senha } = req.body;
    try {
        const usuario = await Usuario.findOne({ email, senha });
        if (!usuario) {
            return res.status(401).json({ erro: 'E-mail ou senha inválidos' });
        }
        res.json({ mensagem: 'Login realizado com sucesso', usuario });
    } catch (err) {
        res.status(500).json({ erro: 'Erro interno no servidor' });
    }
});

// Listar todos os usuários
app.get('/api/usuarios', async (req, res) => {
    try {
        const usuarios = await Usuario.find();
        res.json(usuarios);
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao buscar usuários' });
    }
});

// =================================================================
// ROTAS - PERGUNTAS
// =================================================================

// Listar perguntas ativas
app.get('/api/perguntas', async (req, res) => {
    try {
        const perguntas = await Pergunta.find({ ativa: true });
        res.json(perguntas);
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao buscar perguntas' });
    }
});

// Criar nova pergunta
app.post('/api/perguntas', async (req, res) => {
    try {
        const novaPergunta = new Pergunta(req.body);
        await novaPergunta.save();
        res.status(201).json(novaPergunta);
    } catch (err) {
        res.status(400).json({ erro: 'Erro ao criar pergunta' });
    }
});

// =================================================================
// ROTAS - OPÇÕES DE HUMOR
// =================================================================

// Listar opções de humor
app.get('/api/humor-opcoes', async (req, res) => {
    try {
        const opcoes = await HumorOpcoes.find();
        res.json(opcoes);
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao buscar opções de humor' });
    }
});

// Cadastrar nova opção de humor
app.post('/api/humor-opcoes', async (req, res) => {
    try {
        const novaOpcao = new HumorOpcoes(req.body);
        await novaOpcao.save();
        res.status(201).json(novaOpcao);
    } catch (err) {
        res.status(400).json({ erro: 'Erro ao criar opção de humor' });
    }
});

// =================================================================
// INICIALIZAÇÃO DO SERVIDOR
// =================================================================
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta http://localhost:${PORT}`);
});