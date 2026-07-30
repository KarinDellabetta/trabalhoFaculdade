const mongoose = require('mongoose');

const HumorLogSchema = new mongoose.Schema({
    usuarioId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Usuario', 
        required: true 
    },
    humorId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'HumorOpcoes', 
        required: true 
    },
    perguntaId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Pergunta' 
    },
    comentario: { 
        type: String 
    }
}, { timestamps: true });

module.exports = mongoose.model('HumorLog', HumorLogSchema);