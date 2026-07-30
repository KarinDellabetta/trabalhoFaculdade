const mongoose = require('mongoose');

const HumorOpcoesSchema = new mongoose.Schema({
    titulo: { 
        type: String, 
        required: true 
    },
    emoji: { 
        type: String, 
        required: true 
    },
    valor: { 
        type: Number, 
        required: true 
    }
});

module.exports = mongoose.model('HumorOpcoes', HumorOpcoesSchema);