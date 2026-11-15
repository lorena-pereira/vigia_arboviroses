import { sessions } from '../sessionStore.js';

// Páginas e arquivos que podem ser acessados sem login (exceções documentadas da 7.3).
// Tudo que não estiver aqui e for uma página .html exige sessão válida.
export const PAGINAS_PUBLICAS = ['/', '/html/login.html'];

const parseCookies = (cookieHeader = '') => Object.fromEntries(
    cookieHeader.split(';').map(v => v.trim()).filter(Boolean).map(cookie => {
        const [name, ...rest] = cookie.split('=');
        return [name, decodeURIComponent(rest.join('='))];
    })
);

export const getSessionId = (req) => parseCookies(req.headers.cookie || '').sessionId || null;

// Retorna a sessão do cookie, ou null se não existir ou estiver expirada.
export const validarSessao = (req) => {
    const sessionId = getSessionId(req);
    if (!sessionId) return null;

    const session = sessions.get(sessionId);
    if (!session) return null;

    if (!session.expiresAt || Number(session.expiresAt) <= Date.now()) {
        sessions.delete(sessionId);
        return null;
    }

    return session;
};

// Para rotas de API: sem sessão responde 401 em JSON.
// Com sessão, deixa os dados em req.session para os próximos middlewares (ex.: requireRole, 8.2).
export function requireAuth(req, res, next) {
    const session = validarSessao(req);

    if (!session) {
        res.clearCookie('sessionId', { path: '/' });
        return res.status(401).json({ authenticated: false, message: 'Sessão inválida ou expirada.' });
    }

    req.session = session;
    return next();
}

// Para páginas internas: sem sessão, volta para a tela de login.
// Só atua em requisições de página (.html); CSS, JS e imagens passam direto.
export function requirePageAuth(req, res, next) {
    const ehPagina = req.path === '/' || req.path.endsWith('.html');

    if (!ehPagina || PAGINAS_PUBLICAS.includes(req.path)) {
        return next();
    }

    const session = validarSessao(req);
    if (!session) {
        return res.redirect(302, '/');
    }

    req.session = session;
    return next();
}
