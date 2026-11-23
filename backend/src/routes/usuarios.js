import fs from 'fs';
import { Router } from 'express';
import { requireRole, PERFIS } from '../middlewares/requireRole.js';

const router = Router();
const usersFilePath = new URL('../../data/users.json', import.meta.url);

function readUsers() {
    return JSON.parse(fs.readFileSync(usersFilePath, 'utf-8'));
}

function writeUsers(users) {
    fs.writeFileSync(usersFilePath, `${JSON.stringify(users, null, 4)}\n`);
}

router.get('/', requireRole(PERFIS.ADMINISTRADOR), (req, res) => {
    const users = readUsers().map((user) => ({
        usuario: user.user,
        nome: user.nome || user.user,
        email: user.email || '',
        perfil: user.profile,
        ativo: user.ativo !== false,
        exigeTrocaSenha: Boolean(user.exigeTrocaSenha),
    }));
    return res.status(200).json({ success: true, users });
});

router.post('/', requireRole(PERFIS.ADMINISTRADOR), (req, res) => {
    const body = req.body || {};
    const usuario = String(body.usuario || '').trim();
    const senha = String(body.senha || '');
    if (!usuario || !senha || !body.perfil) {
        return res.status(400).json({
            success: false,
            message: 'Informe usuário, senha e perfil.',
        });
    }

    const users = readUsers();
    if (users.some((user) => user.user === usuario)) {
        return res.status(409).json({
            success: false,
            message: 'Já existe um usuário com esse identificador.',
        });
    }

    users.push({
        user: usuario,
        password: senha,
        profile: body.perfil,
        nome: String(body.nome || usuario),
        email: String(body.email || ''),
        ativo: body.ativo !== false,
        exigeTrocaSenha: body.exigeTrocaSenha !== false,
    });
    writeUsers(users);
    return res.status(201).json({ success: true });
});

router.get('/:usuario', requireRole(PERFIS.ADMINISTRADOR), (req, res) => {
    const usuario = String(req.params.usuario || '');
    const user = readUsers().find((item) => item.user === usuario);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'Usuário não encontrado.',
        });
    }
    return res.status(200).json({
        success: true,
        user: {
            usuario: user.user,
            nome: user.nome || user.user,
            email: user.email || '',
            perfil: user.profile,
            ativo: user.ativo !== false,
            exigeTrocaSenha: Boolean(user.exigeTrocaSenha),
        },
    });
});

router.put('/:usuario', requireRole(PERFIS.ADMINISTRADOR), (req, res) => {
    const usuario = String(req.params.usuario || '');
    const users = readUsers();
    const user = users.find((item) => item.user === usuario);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'Usuário não encontrado.',
        });
    }

    const body = req.body || {};
    user.nome = String(body.nome || user.nome || user.user).trim();
    user.email = String(body.email || '').trim();
    if (body.perfil) user.profile = String(body.perfil);
    if (typeof body.ativo === 'boolean') user.ativo = body.ativo;
    if (typeof body.exigeTrocaSenha === 'boolean') {
        user.exigeTrocaSenha = body.exigeTrocaSenha;
    }
    writeUsers(users);
    return res.status(200).json({ success: true, message: 'Usuário atualizado.' });
});

router.post('/:usuario/redefinir-senha', requireRole(PERFIS.ADMINISTRADOR), (req, res) => {
    const usuario = String(req.params.usuario || '');
    const users = readUsers();
    const user = users.find((item) => item.user === usuario);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'Usuário não encontrado.',
        });
    }

    const senha = String(req.body?.senha || '');
    if (senha) user.password = senha;
    user.exigeTrocaSenha = true;
    writeUsers(users);
    return res.status(200).json({
        success: true,
        message: 'Redefinição de senha configurada.',
    });
});

export default router;
