import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { requireRole, PERFIS } from '../middlewares/requireRole.js';
import {
    atualizarUsuario,
    buscarUsuarioPorLogin,
    criarUsuario,
    listarUsuarios,
} from '../repositories/userRepository.js';

const router = Router();
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NOME = 150;
const MAX_EMAIL = 254;
const MAX_LOGIN = 50;
const PERFIS_VALIDOS = new Set(Object.values(PERFIS));

function quantidadeCaracteres(value) {
    return Array.from(value).length;
}

function usuarioPublico(usuario) {
    return {
        usuario: usuario.login,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        ativo: Boolean(usuario.ativo),
        exigeTrocaSenha: Boolean(usuario.deve_trocar_senha),
    };
}

function responderErroBanco(res, error, operacao) {
    if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
            success: false,
            message: 'Já existe um usuário com esse login ou e-mail.',
        });
    }

    console.error(`Erro ao ${operacao}:`, error);
    return res.status(500).json({
        success: false,
        message: 'Erro interno no servidor.',
    });
}

function validarEmail(email) {
    return (
        typeof email === 'string' &&
        email.trim().length > 0 &&
        quantidadeCaracteres(email.trim()) <= MAX_EMAIL &&
        EMAIL_PATTERN.test(email.trim())
    );
}

function obterBody(body) {
    return body && typeof body === 'object' && !Array.isArray(body) ? body : {};
}

router.get('/', requireRole(PERFIS.ADMINISTRADOR), async (req, res) => {
    try {
        const usuarios = await listarUsuarios();
        return res
            .status(200)
            .json({ success: true, users: usuarios.map(usuarioPublico) });
    } catch (error) {
        return responderErroBanco(res, error, 'listar usuários');
    }
});

router.post('/', requireRole(PERFIS.ADMINISTRADOR), async (req, res) => {
    const body = obterBody(req.body);
    const login = typeof body.usuario === 'string' ? body.usuario.trim() : '';
    const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const senha = typeof body.senha === 'string' ? body.senha : '';
    const ativo = body.ativo === undefined ? true : body.ativo;
    const exigeTrocaSenha =
        body.exigeTrocaSenha === undefined ? true : body.exigeTrocaSenha;

    if (!login || !nome || !email || !senha || !body.perfil) {
        return res.status(400).json({
            success: false,
            message: 'Informe nome, e-mail, usuário, senha e perfil.',
        });
    }

    if (
        quantidadeCaracteres(login) > MAX_LOGIN ||
        quantidadeCaracteres(nome) > MAX_NOME ||
        !validarEmail(email) ||
        !PERFIS_VALIDOS.has(body.perfil) ||
        typeof ativo !== 'boolean' ||
        typeof exigeTrocaSenha !== 'boolean'
    ) {
        return res.status(400).json({
            success: false,
            message: 'Os dados informados são inválidos.',
        });
    }

    if (senha.length < 8) {
        return res.status(400).json({
            success: false,
            message: 'A senha deve ter pelo menos 8 caracteres.',
        });
    }

    try {
        const senhaHash = await bcrypt.hash(senha, 10);
        await criarUsuario({
            login,
            nome,
            email,
            perfil: body.perfil,
            ativo,
            senhaHash,
            exigeTrocaSenha,
        });
        return res.status(201).json({ success: true });
    } catch (error) {
        return responderErroBanco(res, error, 'cadastrar usuário');
    }
});

router.get('/:usuario', requireRole(PERFIS.ADMINISTRADOR), async (req, res) => {
    try {
        const usuario = await buscarUsuarioPorLogin(req.params.usuario);
        if (!usuario) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado.',
            });
        }

        return res
            .status(200)
            .json({ success: true, user: usuarioPublico(usuario) });
    } catch (error) {
        return responderErroBanco(res, error, 'consultar usuário');
    }
});

async function atualizarDados(req, res) {
    const body = obterBody(req.body);
    const campos = {};

    if (Object.hasOwn(body, 'nome')) {
        if (
            typeof body.nome !== 'string' ||
            !body.nome.trim() ||
            quantidadeCaracteres(body.nome.trim()) > MAX_NOME
        ) {
            return res.status(400).json({
                success: false,
                message: 'O nome informado é inválido.',
            });
        }
        campos.nome = body.nome.trim();
    }

    if (Object.hasOwn(body, 'email')) {
        if (!validarEmail(body.email)) {
            return res.status(400).json({
                success: false,
                message: 'O e-mail informado é inválido.',
            });
        }
        campos.email = body.email.trim();
    }

    if (Object.hasOwn(body, 'perfil')) {
        if (!PERFIS_VALIDOS.has(body.perfil)) {
            return res.status(400).json({
                success: false,
                message: 'O perfil informado é inválido.',
            });
        }
        campos.perfil = body.perfil;
    }

    for (const campo of ['ativo', 'exigeTrocaSenha']) {
        if (Object.hasOwn(body, campo)) {
            if (typeof body[campo] !== 'boolean') {
                return res.status(400).json({
                    success: false,
                    message: `O campo ${campo} deve ser booleano.`,
                });
            }
            campos[campo] = body[campo];
        }
    }

    if (Object.keys(campos).length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Informe ao menos um campo válido para atualizar.',
        });
    }

    try {
        const usuario = await buscarUsuarioPorLogin(req.params.usuario);
        if (!usuario) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado.',
            });
        }
        await atualizarUsuario(req.params.usuario, campos);
        return res
            .status(200)
            .json({ success: true, message: 'Usuário atualizado.' });
    } catch (error) {
        return responderErroBanco(res, error, 'atualizar usuário');
    }
}

router.put('/:usuario', requireRole(PERFIS.ADMINISTRADOR), atualizarDados);
router.patch('/:usuario', requireRole(PERFIS.ADMINISTRADOR), atualizarDados);

async function alterarStatus(req, res, ativo) {
    try {
        const usuario = await buscarUsuarioPorLogin(req.params.usuario);
        if (!usuario) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado.',
            });
        }
        await atualizarUsuario(req.params.usuario, { ativo });
        return res.status(200).json({
            success: true,
            message: ativo ? 'Usuário ativado.' : 'Usuário desativado.',
        });
    } catch (error) {
        return responderErroBanco(res, error, 'alterar status do usuário');
    }
}

router.patch(
    '/:usuario/ativar',
    requireRole(PERFIS.ADMINISTRADOR),
    (req, res) => alterarStatus(req, res, true)
);

router.patch(
    '/:usuario/desativar',
    requireRole(PERFIS.ADMINISTRADOR),
    (req, res) => alterarStatus(req, res, false)
);

router.patch(
    '/:usuario/perfil',
    requireRole(PERFIS.ADMINISTRADOR),
    async (req, res) => {
        const { perfil } = obterBody(req.body);
        if (!PERFIS_VALIDOS.has(perfil)) {
            return res.status(400).json({
                success: false,
                message: 'O perfil informado é inválido.',
            });
        }

        try {
            const usuario = await buscarUsuarioPorLogin(req.params.usuario);
            if (!usuario) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuário não encontrado.',
                });
            }
            await atualizarUsuario(req.params.usuario, { perfil });
            return res.status(200).json({
                success: true,
                message: 'Perfil do usuário atualizado.',
            });
        } catch (error) {
            return responderErroBanco(
                res,
                error,
                'atualizar perfil do usuário'
            );
        }
    }
);

async function redefinirSenha(req, res) {
    const body = obterBody(req.body);
    const senha = typeof body.senha === 'string' ? body.senha : '';
    if (senha.length < 8) {
        return res.status(400).json({
            success: false,
            message: 'A senha deve ter pelo menos 8 caracteres.',
        });
    }

    try {
        const usuario = await buscarUsuarioPorLogin(req.params.usuario);
        if (!usuario) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado.',
            });
        }
        const senhaHash = await bcrypt.hash(senha, 10);
        await atualizarUsuario(req.params.usuario, {
            senhaHash,
            exigeTrocaSenha: true,
        });
        return res.status(200).json({
            success: true,
            message: 'Redefinição de senha configurada.',
        });
    } catch (error) {
        return responderErroBanco(res, error, 'redefinir senha do usuário');
    }
}

router.post(
    '/:usuario/redefinir-senha',
    requireRole(PERFIS.ADMINISTRADOR),
    redefinirSenha
);
router.patch(
    '/:usuario/redefinir-senha',
    requireRole(PERFIS.ADMINISTRADOR),
    redefinirSenha
);

export default router;
