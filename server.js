const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// --- SCHEMAS MONGOOSE ---
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
    limiteSimultaneo: { type: Number, default: 0 }, // 0 = Sem limite
    concluida: { type: Boolean, default: false }
});
const Atividade = mongoose.models.Atividade || mongoose.model('Atividade', AtividadeSchema);

const AtividadeAtivaSchema = new mongoose.Schema({
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, unique: true },
    atividadeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Atividade', required: true },
    inicio: { type: Date, default: Date.now }
});
const AtividadeAtiva = mongoose.models.AtividadeAtiva || mongoose.model('AtividadeAtiva', AtividadeAtivaSchema);

const AtividadeLogSchema = new mongoose.Schema({
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    atividadeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Atividade', required: true },
    duracaoSegundos: { type: Number, default: 0 }
}, { timestamps: true });
const AtividadeLog = mongoose.models.AtividadeLog || mongoose.model('AtividadeLog', AtividadeLogSchema);

// Conexão MongoDB Atlas
const mongoURI = process.env.MONGO_URI || 'mongodb+srv://bettaleuck_db_user:JNFwTEB5SSz40Dvj@projetofaculdade.ofrlixt.mongodb.net/teampulse?appName=ProjetoFaculdade';

mongoose.connect(mongoURI)
    .then(async () => {
        console.log('✅ MongoDB Atlas Conectado!');
        await inicializarSistema();
    })
    .catch(err => console.error('❌ Erro no MongoDB:', err));

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
        }

        const totalAtiv = await Atividade.countDocuments();
        if (totalAtiv === 0) {
            await Atividade.insertMany([
                { descricao: "Lanche", limiteSimultaneo: 2 },
                { descricao: "Reunião de alinhamento", limiteSimultaneo: 0 },
                { descricao: "Treinamento de segurança", limiteSimultaneo: 0 }
            ]);
        }
    } catch (err) {
        console.error('❌ Erro na inicialização:', err.message);
    }
}

// --- ROTAS AUTENTICAÇÃO E USUÁRIOS ---
app.post(['/login', '/api/login'], async (req, res) => {
    const { email, senha } = req.body;
    try {
        const user = await Usuario.findOne({ email: email.trim().toLowerCase() });
        if (!user || user.senha !== senha) return res.status(401).json({ erro: 'Credenciais inválidas.' });
        res.json({ mensagem: 'Login com sucesso', usuario: user });
    } catch (err) {
        res.status(500).json({ erro: 'Erro no servidor' });
    }
});

app.get(['/usuarios', '/api/usuarios'], async (req, res) => {
    try { res.json(await Usuario.find()); } catch (e) { res.status(500).json({ erro: 'Erro ao buscar usuários' }); }
});

app.post(['/usuarios', '/api/usuarios'], async (req, res) => {
    try {
        const { nome, email, senha, tipo } = req.body;
        const novo = new Usuario({ nome, email: email.trim().toLowerCase(), senha, tipo: tipo || 'colaborador' });
        await novo.save();
        res.status(201).json(novo);
    } catch (e) { res.status(400).json({ erro: 'Erro ao criar usuário' }); }
});

app.put(['/usuarios/:id', '/api/usuarios/:id'], async (req, res) => {
    try {
        const { nome, email, senha, tipo } = req.body;
        const dados = { nome, email: email?.trim().toLowerCase(), tipo };
        if (senha && senha.trim() !== '') dados.senha = senha;
        res.json(await Usuario.findByIdAndUpdate(req.params.id, dados, { new: true }));
    } catch (e) { res.status(400).json({ erro: 'Erro ao atualizar' }); }
});

app.delete(['/usuarios/:id', '/api/usuarios/:id'], async (req, res) => {
    try { await Usuario.findByIdAndDelete(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ erro: 'Erro ao excluir' }); }
});

// --- ROTAS PERGUNTAS ---
app.get(['/perguntas', '/api/perguntas'], async (req, res) => {
    try { res.json(await Pergunta.find()); } catch (e) { res.status(500).json({ erro: 'Erro ao buscar perguntas' }); }
});

app.post(['/perguntas', '/api/perguntas'], async (req, res) => {
    try {
        if (await Pergunta.countDocuments() >= 4) return res.status(400).json({ erro: 'Máximo de 4 perguntas atingido!' });
        res.status(201).json(await new Pergunta(req.body).save());
    } catch (e) { res.status(400).json({ erro: 'Erro ao criar pergunta' }); }
});

app.put(['/perguntas/:id', '/api/perguntas/:id'], async (req, res) => {
    try { res.json(await Pergunta.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (e) { res.status(400).json({ erro: 'Erro ao atualizar pergunta' }); }
});

app.delete(['/perguntas/:id', '/api/perguntas/:id'], async (req, res) => {
    try { await Pergunta.findByIdAndDelete(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ erro: 'Erro ao excluir pergunta' }); }
});

// --- RESPOSTAS DE HUMOR (BLOQUEIO 1 POR DIA) ---
app.post(['/responder-pergunta', '/api/responder-pergunta'], async (req, res) => {
    try {
        const { usuarioId, perguntaId, opcaoId, comentario } = req.body;
        const hojeInicio = new Date(); hojeInicio.setHours(0,0,0,0);
        const hojeFim = new Date(); hojeFim.setHours(23,59,59,999);

        const existente = await HumorLog.findOne({
            usuarioId, perguntaId, createdAt: { $gte: hojeInicio, $lte: hojeFim }
        });

        if (existente) {
            return res.status(403).json({ erro: 'Você já respondeu a esta pergunta hoje. Tente novamente amanhã!' });
        }

        const log = new HumorLog({ usuarioId, perguntaId, opcaoId, comentario: comentario || '' });
        await log.save();
        res.status(201).json({ mensagem: 'Resposta salva!' });
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao salvar resposta' });
    }
});

// --- ROTAS ATIVIDADES & CONTROLE DE SIMULTANEIDADE ---
app.get(['/atividades', '/api/atividades'], async (req, res) => {
    try { res.json(await Atividade.find()); } catch (e) { res.status(500).json({ erro: 'Erro ao buscar atividades' }); }
});

app.post(['/atividades', '/api/atividades'], async (req, res) => {
    try { res.status(201).json(await new Atividade(req.body).save()); } catch (e) { res.status(400).json({ erro: 'Erro ao salvar atividade' }); }
});

app.put(['/atividades/:id', '/api/atividades/:id'], async (req, res) => {
    try { res.json(await Atividade.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (e) { res.status(400).json({ erro: 'Erro ao atualizar atividade' }); }
});

app.delete(['/atividades/:id', '/api/atividades/:id'], async (req, res) => {
    try { await Atividade.findByIdAndDelete(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ erro: 'Erro ao excluir atividade' }); }
});

// Iniciar Atividade no Colaborador
app.post(['/iniciar-atividade', '/api/iniciar-atividade'], async (req, res) => {
    try {
        const { usuarioId, atividadeId } = req.body;
        const atividade = await Atividade.findById(atividadeId);
        if (!atividade) return res.status(404).json({ erro: 'Atividade não encontrada' });

        if (atividade.limiteSimultaneo > 0) {
            const pessoasAtivas = await AtividadeAtiva.countDocuments({ atividadeId });
            if (pessoasAtivas >= atividade.limiteSimultaneo) {
                return res.status(400).json({
                    erro: `Limite máximo de ${atividade.limiteSimultaneo} pessoa(s) em "${atividade.descricao}" atingido no momento. Por favor, aguarde!`
                });
            }
        }

        await AtividadeAtiva.deleteMany({ usuarioId });
        const novaSessao = new AtividadeAtiva({ usuarioId, atividadeId, inicio: new Date() });
        await novaSessao.save();

        res.status(201).json({ mensagem: 'Atividade iniciada!' });
    } catch (e) {
        res.status(500).json({ erro: 'Erro ao iniciar atividade' });
    }
});

// Finalizar Atividade no Colaborador
app.post(['/finalizar-atividade', '/api/finalizar-atividade'], async (req, res) => {
    try {
        const { usuarioId, atividadeId, duracaoSegundos } = req.body;
        await AtividadeAtiva.deleteMany({ usuarioId });

        const log = new AtividadeLog({ usuarioId, atividadeId, duracaoSegundos: duracaoSegundos || 0 });
        await log.save();

        res.json({ mensagem: 'Atividade finalizada!' });
    } catch (e) {
        res.status(500).json({ erro: 'Erro ao finalizar atividade' });
    }
});

// --- DASHBOARD METRICS & TEMPO REAL ---
app.get(['/dashboard/estatisticas', '/api/dashboard/estatisticas'], async (req, res) => {
    try {
        const totalUsuarios = await Usuario.countDocuments({ tipo: 'colaborador' });
        const atividadesAndamento = await AtividadeAtiva.find().populate('usuarioId atividadeId');
        
        const hojeInicio = new Date(); hojeInicio.setHours(0,0,0,0);
        const logsHoje = await HumorLog.find({ createdAt: { $gte: hojeInicio } }).populate('perguntaId');

        res.json({
            totalUsuarios,
            emAndamentoCount: atividadesAndamento.length,
            atividadesEmAndamento: atividadesAndamento,
            totalRespostasHoje: logsHoje.length
        });
    } catch (e) {
        res.status(500).json({ erro: 'Erro ao carregar estatísticas' });
    }
});

// --- RELATÓRIOS ---
app.get(['/respostas/relatorio', '/api/respostas/relatorio', '/api/relatorios/perguntas'], async (req, res) => {
    try {
        const { perguntaId, itemId, inicio, dataInicio, fim, dataFim } = req.query;
        const targetPergunta = perguntaId || itemId;
        const targetInicio = inicio || dataInicio;
        const targetFim = fim || dataFim;

        let filtro = {};

        if (targetInicio || targetFim) {
            filtro.createdAt = {};
            if (targetInicio) filtro.createdAt.$gte = new Date(targetInicio);
            if (targetFim) filtro.createdAt.$lte = new Date(new Date(targetFim).setHours(23, 59, 59, 999));
        }

        if (targetPergunta) filtro.perguntaId = targetPergunta;

        const logs = await HumorLog.find(filtro).populate('usuarioId perguntaId').sort({ createdAt: -1 }).lean();

        // Mapeia o texto e emoji da opção selecionada
        const logsFormatados = logs.map(log => {
            let opcaoTexto = '-';
            if (log.perguntaId && Array.isArray(log.perguntaId.opcoes)) {
                const opcaoEncontrada = log.perguntaId.opcoes.find(op => op._id.toString() === log.opcaoId?.toString());
                if (opcaoEncontrada) {
                    opcaoTexto = `${opcaoEncontrada.emoji ? opcaoEncontrada.emoji + ' ' : ''}${opcaoEncontrada.texto}`;
                }
            }
            return { ...log, opcaoTexto };
        });

        res.json(logsFormatados);
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao gerar relatório de perguntas' });
    }
});

app.get(['/atividades/relatorio', '/api/atividades/relatorio', '/api/relatorios/atividades'], async (req, res) => {
    try {
        const { atividadeId, itemId, inicio, dataInicio, fim, dataFim } = req.query;
        const targetAtividade = atividadeId || itemId;
        const targetInicio = inicio || dataInicio;
        const targetFim = fim || dataFim;

        let filtro = {};

        if (targetInicio || targetFim) {
            filtro.createdAt = {};
            if (targetInicio) filtro.createdAt.$gte = new Date(targetInicio);
            if (targetFim) filtro.createdAt.$lte = new Date(new Date(targetFim).setHours(23, 59, 59, 999));
        }

        if (targetAtividade) filtro.atividadeId = targetAtividade;

        const logs = await AtividadeLog.find(filtro).populate('usuarioId atividadeId').sort({ createdAt: -1 });
        res.json(logs);
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao gerar relatório de atividades' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));