import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './src/routes/auth.js';
import { purgeExpiredSessions, SESSION_WARNING_MS, sessions } from './src/sessionStore.js';
import { getSessionId, requireAuth, requirePageAuth, validarSessao } from './src/middlewares/requireAuth.js';

// mantido para quem já importava validarSessao do server.js
export { validarSessao };

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const app = express();

app.use((req, res, next) => {
    purgeExpiredSessions();
    next();
});

app.use(cors());
app.use(express.json());

// Páginas internas só são entregues com sessão válida (7.3).
// Deve vir antes do express.static, senão /html/index.html seria servido sem login.
app.use(requirePageAuth);

app.use((req, res, next) => {
    if (req.path !== '/index.html' && req.path !== '/html/index.html') {
        return next();
    }

    if (req.session?.perfil === 'municipio') {
        return res.status(403).json({
            authenticated: true,
            accessDenied: true,
            perfil: 'municipio',
            message: 'Acesso restrito para este perfil.'
        });
    }

    return next();
});

app.use(express.static(path.join(__dirname, '../frontend')));

// ----- Rotas públicas (exceções documentadas da 7.3) -----

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/html/login.html'));
});

// Usada pelo front para saber se há sessão; responde 401 por conta própria.
app.get('/api/session', (req, res) => {
    const session = validarSessao(req);

    if (!session) {
        res.clearCookie('sessionId', { path: '/' });
        return res.status(401).json({ authenticated: false, message: 'Sessão inválida.' });
    }

    const remainingMs = Math.max(0, Number(session.expiresAt || 0) - Date.now());
    const warning = remainingMs <= SESSION_WARNING_MS;

    return res.status(200).json({
        authenticated: true,
        warning,
        expiresInMs: remainingMs,
        user: {
            nome: session.usuario,
            perfil: session.perfil
        }
    });
});

app.post('/logout', (req, res) => {
    const sessionId = getSessionId(req);

    if (sessionId) {
        sessions.delete(sessionId);
    }

    res.clearCookie('sessionId', { path: '/' });
    return res.status(200).json({ success: true, redirect: '/html/login.html' });
});

app.use(authRoutes); // POST /login

// ----- A partir daqui, toda rota /api/* exige sessão (7.3) -----
app.use('/api', requireAuth);

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/html/index.html'));
});

// so sobe a porta quando executado diretamente (permite testar sem subir servidor)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Servidor iniciado na porta ${port}`));
}
