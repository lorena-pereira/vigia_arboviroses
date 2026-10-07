import { Router } from 'express';
import { autenticar } from '../services/authService.js';

const router = Router();

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
            return res.status(200).json({
                success: true,
                message: 'Login validado',
                profile: r.perfil,
                redirect: '/index.html' // dashboard
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
