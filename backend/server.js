import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './src/routes/auth.js';
import { purgeExpiredSessions, SESSION_WARNING_MS, sessions } from './src/sessionStore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const app = express();

app.use((req, res, next) => {
    purgeExpiredSessions();
    next();
});

const parseCookies = (cookieHeader = '') => {
    return Object.fromEntries(
        (cookieHeader.split(';').map(v => v.trim()).filter(Boolean).map(cookie => {
            const [name, ...rest] = cookie.split('=');
            return [name, decodeURIComponent(rest.join('='))];
        }))
    );
};

const getSessionId = (req) => parseCookies(req.headers.cookie || '').sessionId || null;

export const validarSessao = (req) => {
    const sessionId = getSessionId(req);
    if (!sessionId) return null;
    const session = sessions.get(sessionId);
    if (!session) return null;
    return session;
};

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/html/login.html'));
});

app.get('/api/session', (req, res) => {
    const session = validarSessao(req);

    if (!session) {
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

app.use(authRoutes);

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/html/index.html'));
});

// so sobe a porta quando executado diretamente (permite testar sem subir servidor)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Servidor iniciado na porta ${port}`));
}
