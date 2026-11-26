import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './src/routes/auth.js';

import {
    purgeExpiredSessions,
    SESSION_TIMEOUT_MS,
    SESSION_WARNING_MS,
    sessions,
} from './src/sessionStore.js';
import {
    getSessionId,
    requireAuth,
    requirePageAuth,
    validarSessao,
} from './src/middlewares/requireAuth.js';
import { PERFIS, requireRole } from './src/middlewares/requireRole.js';
import notificacoesRoutes from './src/routes/notificacoes.js';
import pacientesRoutes from './src/routes/pacientes.js';
import usuariosRoutes from './src/routes/usuarios.js';
import {
    atualizarUsuario,
    buscarUsuarioAtivo,
} from './src/repositories/userRepository.js';

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
            message: 'Acesso restrito para este perfil.',
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
        return res
            .status(401)
            .json({ authenticated: false, message: 'Sessão inválida.' });
    }

    const remainingMs = Math.max(
        0,
        Number(session.expiresAt || 0) - Date.now()
    );
    const warning = remainingMs <= SESSION_WARNING_MS;

    return res.status(200).json({
        authenticated: true,
        warning,
        expiresInMs: remainingMs,
        user: {
            nome: session.usuario,
            perfil: session.perfil,
            exigeTrocaSenha: Boolean(session.exigeTrocaSenha),
        },
    });
});

app.post('/logout', (req, res) => {
    const sessionId = getSessionId(req);

    if (sessionId) {
        sessions.delete(sessionId);
    }

    res.clearCookie('sessionId', { path: '/' });
    return res
        .status(200)
        .json({ success: true, redirect: '/html/login.html' });
});

app.use(authRoutes); // POST /login

// ----- A partir daqui, toda rota /api/* exige sessão (7.3) -----
app.use('/api', requireAuth);

// ----- Restrição por perfil (8.2), conforme a matriz de permissões -----
// Aplicada por prefixo: qualquer rota criada depois dentro desses caminhos já nasce restrita.
// Pacientes: só o Técnico (Gestor e Administrador não recebem nome, CPF nem telefone).
app.use('/api/pacientes', requireRole(PERFIS.TECNICO));
app.use('/api/notificacoes', requireRole(PERFIS.TECNICO), notificacoesRoutes);
// Troca da própria senha: disponível para qualquer perfil autenticado.
app.post('/api/usuarios/trocar-senha', async (req, res) => {
    const senhaAtual =
        typeof req.body?.senhaAtual === 'string' ? req.body.senhaAtual : '';
    const novaSenha =
        typeof req.body?.novaSenha === 'string' ? req.body.novaSenha : '';
    if (!req.session?.usuario || !senhaAtual || !novaSenha) {
        return res.status(400).json({
            success: false,
            message: 'Informe a senha atual e a nova senha.',
        });
    }
    if (novaSenha.length < 8) {
        return res.status(400).json({
            success: false,
            message: 'A nova senha deve ter pelo menos 8 caracteres.',
        });
    }

    try {
        const usuario = await buscarUsuarioAtivo(req.session.usuario);
        if (
            !usuario ||
            !(await bcrypt.compare(senhaAtual, usuario.senha_hash))
        ) {
            return res.status(401).json({
                success: false,
                message: 'Senha provisória atual inválida.',
            });
        }

        const senhaHash = await bcrypt.hash(novaSenha, 10);
        await atualizarUsuario(usuario.login, {
            senhaHash,
            exigeTrocaSenha: false,
        });
        req.session.exigeTrocaSenha = false;
        return res.status(200).json({
            success: true,
            message: 'Senha redefinida com sucesso.',
        });
    } catch (error) {
        console.error('Erro ao alterar senha:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro interno no servidor.',
        });
    }
});
// Gestão de usuários: só o Administrador.
app.use('/api/usuarios', requireRole(PERFIS.ADMINISTRADOR));
app.use(pacientesRoutes);
app.use('/api/usuarios', usuariosRoutes);

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/html/index.html'));
});

app.get('/cadastrar-paciente.html', (req, res) => {
    res.sendFile(
        path.join(__dirname, '../frontend/html/cadastrar-paciente.html')
    );
});

app.get('/usuarios.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/html/usuarios.html'));
});

app.get('/cadastrar-usuario.html', (req, res) => {
    res.sendFile(
        path.join(__dirname, '../frontend/html/cadastrar-usuario.html')
    );
});

app.get('/editar-usuario.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/html/editar-usuario.html'));
});

// Renova a expiracao da sessao atual.
app.post('/api/session/renew', (req, res) => {
    const session = validarSessao(req);

    if (!session) {
        res.clearCookie('sessionId', { path: '/' });
        return res.status(401).json({
            authenticated: false,
            message: 'Sessão inválida ou expirada.',
        });
    }

    session.expiresAt = Date.now() + SESSION_TIMEOUT_MS;

    return res.status(200).json({
        authenticated: true,
        expiresInMs: SESSION_TIMEOUT_MS,
        warning: false,
    });
});

// Renova a expiração da sessão atual para o tempo limite total da sessão.
app.post('/api/session/renew', (req, res) => {
    const session = validarSessao(req);

    if (!session) {
        res.clearCookie('sessionId', { path: '/' });
        return res.status(401).json({
            authenticated: false,
            message: 'Sessão inválida ou expirada.',
        });
    }

    session.expiresAt = Date.now() + SESSION_TIMEOUT_MS;

    return res.status(200).json({
        authenticated: true,
        expiresInMs: SESSION_TIMEOUT_MS,
        warning: false,
    });
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Servidor iniciado na porta ${port}`));
}
