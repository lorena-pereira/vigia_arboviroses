import { randomUUID } from 'crypto';
import { Router } from 'express';
import { SESSION_TIMEOUT_MS, sessions } from '../sessionStore.js';
import { autenticar } from '../services/authService.js';

const router = Router();

const createSessionCookie = (sessionId) => (
    `sessionId=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=1800`
);

// POST /login  { usuario, senha }
router.post('/login', async (req, res) => {
    const usuario = String(req.body?.usuario ?? '').trim();
    const senha = String(req.body?.senha ?? '');

    if (!usuario || !senha) {
        return res.status(400).json({ success: false, message: 'Informe usuário e senha.' });
    }

    try {
        const r = autenticar(usuario, senha);

        if (r.ok) {
            const sessionId = randomUUID();
            const session = {
                usuario,
                perfil: r.perfil,
                createdAt: Date.now(),
                expiresAt: Date.now() + SESSION_TIMEOUT_MS
            };

            sessions.set(sessionId, session);

            res.setHeader('Set-Cookie', createSessionCookie(sessionId));

            return res.status(200).json({
                success: true,
                message: 'Login validado',
                profile: r.perfil,
                user: {
                    nome: usuario,
                    perfil: r.perfil
                },
                redirect: '/index.html'
            });
        }

        if (r.motivo === 'bloqueado') {
            return res.status(429).json({
                success: false,
                bloqueado: true,
                message: `Muitas tentativas incorretas. Tente novamente em ${r.minutosRestantes} minuto(s).`
            });
        }

        // mensagem generica: nao diz se o erro foi no usuario ou na senha
        return res.status(401).json({ success: false, message: 'Usuário ou senha inválidos.' });
    } catch (error) {
        console.error('Erro interno no login:', error);
        return res.status(500).json({ success: false, message: 'Erro no servidor.' });
    }
});

export default router;
