import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './src/routes/auth.js';
import pacientesRoutes from './src/routes/pacientes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/html/login.html'));
});

app.use(authRoutes);
app.use(pacientesRoutes);

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/html/index.html'));
});

app.get('/cadastrar-paciente.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/html/cadastrar-paciente.html'));
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Servidor iniciado na porta ${port}`));
}
