const mongoose = require('mongoose');

const PerguntaSchema = new mongoose.Schema({
    titulo: { 
        type: String, 
        required: true 
    },
    ativa: { 
        type: Boolean, 
        default: true 
    }
}, { timestamps: true });

module.exports = mongoose.model('Pergunta', PerguntaSchema);