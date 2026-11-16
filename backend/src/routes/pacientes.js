import express from 'express';
import fs from 'fs';

const router = express.Router();
const pacientesFilePath = new URL('../../data/pacientes.json', import.meta.url);

router.post('/api/pacientes', (req, res) => {
    try {
        const novoPaciente = req.body;
        
        novoPaciente.id = Date.now().toString();
        novoPaciente.dataCadastro = new Date().toISOString();

        let pacientes = [];
        if (fs.existsSync(pacientesFilePath)) {
            const fileData = fs.readFileSync(pacientesFilePath, 'utf-8');
            if (fileData) {
                pacientes = JSON.parse(fileData);
            }
        }

        pacientes.push(novoPaciente);
        
        fs.writeFileSync(pacientesFilePath, JSON.stringify(pacientes, null, 4));

        res.status(201).json({ success: true, message: 'Paciente salvo com sucesso' });
    } catch (error) {
        console.error('Erro ao salvar paciente:', error);
        res.status(500).json({ success: false, message: 'Erro interno no servidor' });
    }
});

export default router;