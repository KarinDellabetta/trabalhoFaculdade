const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// --- MODELOS DO MONGOOSE ---
const UsuarioSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    senha: { type: String, required: true },
    tipo: { type: String, enum: ['admin', 'colaborador'], default: 'colaborador' }
});
const Usuario = mongoose.models.Usuario || mongoose.model('Usuario', UsuarioSchema);

const OpcaoSchema = new mongoose.Schema({
    texto: { type: String, required: true },
    emoji: { type: String, default: '' },
    valor: { type: Number, default: 1 }
});

const PerguntaSchema = new mongoose.Schema({
    titulo: { type: String, required: true },
    opcoes: [OpcaoSchema],
    ativa: { type: Boolean, default: true }
});
const Pergunta = mongoose.models.Pergunta || mongoose.model('Pergunta', PerguntaSchema);

const HumorLogSchema = new mongoose.Schema({
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    perguntaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pergunta', required: true },
    opcaoId: { type: mongoose.Schema.Types.ObjectId, required: true },
    comentario: { type: String, default: '' }
}, { timestamps: true });
const HumorLog = mongoose.models.HumorLog || mongoose.model('HumorLog', HumorLogSchema);

const AtividadeSchema = new mongoose.Schema({
    descricao: { type: String, required: true },
    concluida: { type: Boolean, default: false }
});
const Atividade = mongoose.models.Atividade || mongoose.model('Atividade', AtividadeSchema);

const AtividadeLogSchema = new mongoose.Schema({
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    atividadeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Atividade', required: true }
}, { timestamps: true });
const AtividadeLog = mongoose.models.AtividadeLog || mongoose.model('AtividadeLog', AtividadeLogSchema);

// Conexão com o MongoDB Atlas
const mongoURI = 'mongodb+srv://bettaleuck_db_user:JNFwTEB5SSz40Dvj@projetofaculdade.ofrlixt.mongodb.net/teampulse?appName=ProjetoFaculdade';

mongoose.connect(mongoURI)
    .then(async () => {
        console.log('✅ MongoDB Atlas Conectado com Sucesso!');
        await inicializarSistema();
    })
    .catch(err => console.error('❌ Erro ao conectar no MongoDB:', err));

// Inicialização de Admin, Pergunta Padrão e Atividades Padrão
async function inicializarSistema() {
    try {
        await Usuario.findOneAndUpdate(
            { email: 'admin@teampulse.com' },
            { nome: 'Administrador', email: 'admin@teampulse.com', senha: '123', tipo: 'admin' },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        const totalPerguntas = await Pergunta.countDocuments();
        if (totalPerguntas === 0) {
            await Pergunta.create({
                titulo: "Como você está se sentindo em relação ao seu trabalho hoje?",
                ativa: true,
                opcoes: [
                    { texto: "Excelente", emoji: "🤩", valor: 5 },
                    { texto: "Muito bem", emoji: "😁", valor: 4 },
                    { texto: "Bem", emoji: "🙃", valor: 3 },
                    { texto: "Não estou bem", emoji: "😐", valor: 2 },
                    { texto: "Mal", emoji: "😫", valor: 1 }
                ]
            });
            console.log('📌 Pergunta padrão inicializada!');
        }

        const totalAtiv = await Atividade.countDocuments();
        if (totalAtiv === 0) {
            await Atividade.insertMany([
                { descricao: "Lanche", concluida: false },
                { descricao: "Reunião de alinhamento", concluida: false },
                { descricao: "Treinamento de segurança", concluida: false }
            ]);
            console.log('📌 Atividades padrão inicializadas!');
        }
    } catch (err) {
        console.error('❌ Erro ao inicializar sistema:', err.message);
    }
}

// --- ROTAS DE AUTENTICAÇÃO ---
app.post('/api/login', async (req, res) => {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ erro: 'Informe o e-mail e a senha.' });

    try {
        const user = await Usuario.findOne({ email: email.trim().toLowerCase() });
        if (!user || user.senha !== senha) {
            return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
        }
        res.json({ mensagem: 'Login realizado com sucesso', usuario: user });
    } catch (err) {
        res.status(500).json({ erro: 'Erro interno no servidor' });
    }
});

// --- ROTAS DE USUÁRIOS ---
app.get('/api/usuarios', async (req, res) => {
    try { res.json(await Usuario.find()); } catch (e) { res.status(500).json({ erro: 'Erro' }); }
});
app.post('/api/usuarios', async (req, res) => {
    try {
        const { nome, email, senha, tipo } = req.body;
        const novo = new Usuario({ nome, email: email.trim().toLowerCase(), senha, tipo: tipo || 'colaborador' });
        await novo.save();
        res.status(201).json(novo);
    } catch (e) { res.status(400).json({ erro: 'Erro ao cadastrar usuário' }); }
});
app.put('/api/usuarios/:id', async (req, res) => {
    try {
        const { nome, email, senha, tipo } = req.body;
        const dados = { nome, email: email?.trim().toLowerCase(), tipo };
        if (senha && senha.trim() !== '') dados.senha = senha;
        const atualizado = await Usuario.findByIdAndUpdate(req.params.id, dados, { new: true });
        res.json(atualizado);
    } catch (e) { res.status(400).json({ erro: 'Erro ao atualizar usuário' }); }
});
app.delete('/api/usuarios/:id', async (req, res) => {
    try { await Usuario.findByIdAndDelete(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ erro: 'Erro' }); }
});

// --- ROTAS DE PERGUNTAS E RESPOSTAS ---
app.get('/api/perguntas', async (req, res) => {
    try { res.json(await Pergunta.find()); } catch (e) { res.status(500).json({ erro: 'Erro' }); }
});

app.post('/api/perguntas', async (req, res) => {
    try {
        const total = await Pergunta.countDocuments();
        if (total >= 4) {
            return res.status(400).json({ erro: 'Limite máximo de 4 perguntas atingido!' });
        }
        const { titulo, opcoes, ativa } = req.body;
        if (!opcoes || opcoes.length === 0 || opcoes.length > 5) {
            return res.status(400).json({ erro: 'Cada pergunta deve ter entre 1 e 5 respostas.' });
        }
        const nova = new Pergunta({ titulo, opcoes, ativa: ativa !== undefined ? ativa : true });
        await nova.save();
        res.status(201).json(nova);
    } catch (e) { res.status(400).json({ erro: 'Erro ao cadastrar pergunta' }); }
});

app.put('/api/perguntas/:id', async (req, res) => {
    try {
        const { titulo, opcoes, ativa } = req.body;
        if (opcoes && (opcoes.length === 0 || opcoes.length > 5)) {
            return res.status(400).json({ erro: 'Cada pergunta deve ter entre 1 e 5 respostas.' });
        }
        const atualizada = await Pergunta.findByIdAndUpdate(req.params.id, { titulo, opcoes, ativa }, { new: true });
        res.json(atualizada);
    } catch (e) { res.status(400).json({ erro: 'Erro ao atualizar pergunta' }); }
});

app.delete('/api/perguntas/:id', async (req, res) => {
    try { await Pergunta.findByIdAndDelete(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ erro: 'Erro' }); }
});

// --- ROTAS DE ATIVIDADES ---
app.get('/api/atividades', async (req, res) => {
    try { res.json(await Atividade.find()); } catch (e) { res.status(500).json({ erro: 'Erro' }); }
});
app.post('/api/atividades', async (req, res) => {
    try { res.status(201).json(await new Atividade(req.body).save()); } catch (e) { res.status(400).json({ erro: 'Erro' }); }
});
app.put('/api/atividades/:id', async (req, res) => {
    try { res.json(await Atividade.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (e) { res.status(400).json({ erro: 'Erro' }); }
});
app.delete('/api/atividades/:id', async (req, res) => {
    try { await Atividade.findByIdAndDelete(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ erro: 'Erro' }); }
});

// --- RELATÓRIOS ---
app.post('/api/relatorios/perguntas', async (req, res) => {
    try {
        const { itemId, dataInicio, dataFim } = req.body;
        let filtroData = {};
        if (dataInicio && dataFim) {
            filtroData.createdAt = {
                $gte: new Date(dataInicio),
                $lte: new Date(new Date(dataFim).setHours(23, 59, 59))
            };
        }
        let query = { ...filtroData };
        if (itemId) query.perguntaId = itemId;
        const logs = await HumorLog.find(query).populate('usuarioId perguntaId').sort({ createdAt: -1 });
        return res.json(logs);
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao gerar relatório de perguntas' });
    }
});

app.post('/api/relatorios/atividades', async (req, res) => {
    try {
        const { itemId, dataInicio, dataFim } = req.body;
        let filtroData = {};
        if (dataInicio && dataFim) {
            filtroData.createdAt = {
                $gte: new Date(dataInicio),
                $lte: new Date(new Date(dataFim).setHours(23, 59, 59))
            };
        }
        let query = { ...filtroData };
        if (itemId) query.atividadeId = itemId;
        const logs = await AtividadeLog.find(query).populate('usuarioId atividadeId').sort({ createdAt: -1 });
        return res.json(logs);
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao gerar relatório de atividades' });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});