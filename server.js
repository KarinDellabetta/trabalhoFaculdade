const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// --- MODELOS DO MONGOOSE (Todos centralizados para evitar erros) ---
const UsuarioSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    senha: { type: String, required: true },
    tipo: { type: String, enum: ['admin', 'colaborador'], default: 'colaborador' }
});
const Usuario = mongoose.models.Usuario || mongoose.model('Usuario', UsuarioSchema);

const PerguntaSchema = new mongoose.Schema({
    titulo: { type: String, required: true },
    ativa: { type: Boolean, default: true }
});
const Pergunta = mongoose.models.Pergunta || mongoose.model('Pergunta', PerguntaSchema);

const HumorOpcoesSchema = new mongoose.Schema({
    titulo: { type: String, required: true },
    emoji: { type: String, required: true },
    valor: { type: Number, required: true }
});
const HumorOpcoes = mongoose.models.HumorOpcoes || mongoose.model('HumorOpcoes', HumorOpcoesSchema);

const HumorLogSchema = new mongoose.Schema({
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    perguntaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pergunta', required: true },
    humorId: { type: mongoose.Schema.Types.ObjectId, ref: 'HumorOpcoes', required: true },
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
    atividadeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Atividade', required: true },
    tempoMinutos: { type: Number, default: 0 }
}, { timestamps: true });
const AtividadeLog = mongoose.models.AtividadeLog || mongoose.model('AtividadeLog', AtividadeLogSchema);

// Conexão com o MongoDB Atlas
const mongoURI = 'mongodb+srv://bettaleuck_db_user:JNFwTEB5SSz40Dvj@projetofaculdade.ofrlixt.mongodb.net/teampulse?appName=ProjetoFaculdade';

mongoose.connect(mongoURI)
    .then(async () => {
        console.log('✅ MongoDB Atlas Conectado com Sucesso!');
        await inicializarAdmin();
    })
    .catch(err => console.error('❌ Erro ao conectar no MongoDB:', err));

// Inicialização / Reset Forçado do Admin
async function inicializarAdmin() {
    try {
        await Usuario.findOneAndUpdate(
            { email: 'admin@teampulse.com' },
            {
                nome: 'Administrador',
                email: 'admin@teampulse.com',
                senha: '123',
                tipo: 'admin'
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        console.log('👑 Admin garantido no banco! (E-mail: admin@teampulse.com | Senha: 123)');
    } catch (err) {
        console.error('❌ Erro ao inicializar admin:', err.message);
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
app.post('/api/usuarios', async (req, res) => {
    try {
        const { nome, email, senha, tipo } = req.body;
        const novoUsuario = new Usuario({
            nome,
            email: email.trim().toLowerCase(),
            senha,
            tipo: tipo || 'colaborador'
        });
        await novoUsuario.save();
        res.status(201).json({ mensagem: 'Usuário cadastrado com sucesso!', usuario: novoUsuario });
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ erro: 'Este e-mail já está cadastrado.' });
        res.status(400).json({ erro: 'Erro ao cadastrar', detalhe: err.message });
    }
});

app.get('/api/usuarios', async (req, res) => {
    try { res.json(await Usuario.find()); } catch (e) { res.status(500).json({ erro: 'Erro' }); }
});

app.put('/api/usuarios/:id', async (req, res) => {
    try {
        const { nome, email, senha, tipo } = req.body;
        const dadosAtualizados = { nome, email: email?.trim().toLowerCase(), tipo };
        if (senha && senha.trim() !== '') {
            dadosAtualizados.senha = senha;
        }
        const usuarioAtualizado = await Usuario.findByIdAndUpdate(req.params.id, dadosAtualizados, { new: true });
        res.json({ mensagem: 'Usuário atualizado com sucesso!', usuario: usuarioAtualizado });
    } catch (err) {
        res.status(400).json({ erro: 'Erro ao atualizar usuário', detalhe: err.message });
    }
});

app.delete('/api/usuarios/:id', async (req, res) => {
    try {
        await Usuario.findByIdAndDelete(req.params.id);
        res.json({ mensagem: 'Usuário excluído com sucesso' });
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao excluir' });
    }
});

// --- ROTAS DE PERGUNTAS ---
app.get('/api/perguntas', async (req, res) => {
    try { res.json(await Pergunta.find()); } catch (e) { res.status(500).json({ erro: 'Erro' }); }
});
app.post('/api/perguntas', async (req, res) => {
    try { res.status(201).json(await new Pergunta(req.body).save()); } catch (e) { res.status(400).json({ erro: 'Erro' }); }
});
app.put('/api/perguntas/:id', async (req, res) => {
    try {
        const atualizada = await Pergunta.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(atualizada);
    } catch (e) { res.status(400).json({ erro: 'Erro ao atualizar pergunta' }); }
});
app.delete('/api/perguntas/:id', async (req, res) => {
    try { await Pergunta.findByIdAndDelete(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ erro: 'Erro' }); }
});

// --- ROTAS DE HUMORES / RESPOSTAS (Máx 5) ---
app.get(['/api/humores', '/api/humor-opcoes'], async (req, res) => {
    try { res.json(await HumorOpcoes.find()); } catch (e) { res.status(500).json({ erro: 'Erro' }); }
});
app.post('/api/humores', async (req, res) => {
    try {
        const total = await HumorOpcoes.countDocuments();
        if (total >= 5) {
            return res.status(400).json({ erro: 'Limite máximo de 5 respostas/humores atingido!' });
        }
        res.status(201).json(await new HumorOpcoes(req.body).save());
    } catch (e) { res.status(400).json({ erro: 'Erro ao cadastrar humor' }); }
});
app.put('/api/humores/:id', async (req, res) => {
    try {
        const atualizado = await HumorOpcoes.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(atualizado);
    } catch (e) { res.status(400).json({ erro: 'Erro ao atualizar humor' }); }
});
app.delete('/api/humores/:id', async (req, res) => {
    try { await HumorOpcoes.findByIdAndDelete(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ erro: 'Erro' }); }
});

// --- ROTAS DE ATIVIDADES ---
app.get('/api/atividades', async (req, res) => {
    try { res.json(await Atividade.find()); } catch (e) { res.status(500).json({ erro: 'Erro' }); }
});
app.post('/api/atividades', async (req, res) => {
    try { res.status(201).json(await new Atividade(req.body).save()); } catch (e) { res.status(400).json({ erro: 'Erro' }); }
});
app.put('/api/atividades/:id', async (req, res) => {
    try {
        const atualizada = await Atividade.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(atualizada);
    } catch (e) { res.status(400).json({ erro: 'Erro ao atualizar atividade' }); }
});
app.delete('/api/atividades/:id', async (req, res) => {
    try { await Atividade.findByIdAndDelete(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ erro: 'Erro' }); }
});

// Registrar log de tempo em atividade
app.post('/api/atividade-logs', async (req, res) => {
    try {
        const novoLog = new AtividadeLog(req.body);
        await novoLog.save();
        res.status(201).json(novoLog);
    } catch (e) { res.status(400).json({ erro: 'Erro ao registrar log de atividade' }); }
});

// --- RELATÓRIOS COM FILTROS ---
app.post('/api/relatorios/filtrar', async (req, res) => {
    try {
        const { tipoRelatorio, itemId, dataInicio, dataFim } = req.body;
        
        let filtroData = {};
        if (dataInicio && dataFim) {
            filtroData.createdAt = {
                $gte: new Date(dataInicio),
                $lte: new Date(new Date(dataFim).setHours(23, 59, 59))
            };
        }

        if (tipoRelatorio === 'respostas') {
            let query = { ...filtroData };
            if (itemId) query.perguntaId = itemId;

            const logs = await HumorLog.find(query)
                .populate('usuarioId humorId perguntaId')
                .sort({ createdAt: -1 });
            return res.json(logs);
        } 
        else if (tipoRelatorio === 'tempo_atividade') {
            let query = { ...filtroData };
            if (itemId) query.atividadeId = itemId;

            const logs = await AtividadeLog.find(query)
                .populate('usuarioId atividadeId')
                .sort({ createdAt: -1 });
            return res.json(logs);
        }

        res.json([]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao gerar relatório filtrado' });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando perfeitamente em http://localhost:${PORT}`);
});