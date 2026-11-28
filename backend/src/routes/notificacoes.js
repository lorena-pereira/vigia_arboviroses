import { Router } from 'express';
import {
    buscarNotificacao,
    salvarNotificacao,
    listarNotificacoes,
} from '../repositories/notificacaoRepository.js';

import {
    DadosNotificacaoInvalidos,
    inteiroPositivo,
    validarDadosNotificacao,
} from '../services/dadosNotificacao.js';

const router = Router();

function parametroInteiro(valor, padrao) {
    if (valor === undefined) return padrao;
    return typeof valor === 'string' && /^\d+$/.test(valor)
        ? Number(valor)
        : NaN;
}

function erroInterno(res, operacao, erro) {
    console.error(`Erro ao ${operacao} notificação:`, erro.code ?? erro.name);
    return res
        .status(500)
        .json({ success: false, message: 'Erro interno no servidor.' });
}

async function salvar(req, res, id) {
    try {
        const dados = validarDadosNotificacao(req.body, id !== undefined);
        const resultado = await salvarNotificacao(
            dados,
            req.session.usuario,
            id
        );

        if (resultado.semPermissao) {
            return res.status(403).json({
                authenticated: true,
                message: 'Acesso negado para este perfil.',
            });
        }
        if (resultado.inexistente) return notificacaoInexistente(res);
        if (resultado.referenciaInvalida) return referenciaInvalida(res);
        return res.status(id === undefined ? 201 : 200).json({
            success: true,
            notificacao: resultado.notificacao,
        });
    } catch (erro) {
        if (erro instanceof DadosNotificacaoInvalidos) {
            return res
                .status(400)
                .json({ success: false, message: erro.message });
        }
        if (erro.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Já existe uma notificação com esse número SINAN.',
            });
        }
        if (erro.code === 'ER_NO_REFERENCED_ROW_2')
            return referenciaInvalida(res);
        return erroInterno(res, 'salvar', erro);
    }
}

function notificacaoInexistente(res) {
    return res
        .status(404)
        .json({ success: false, message: 'Notificação não encontrada.' });
}

function referenciaInvalida(res) {
    return res.status(422).json({
        success: false,
        message: 'Paciente, agravo, unidade ou endereço não encontrado.',
    });
}

function idInvalido(res) {
    return res.status(400).json({
        success: false,
        message: 'Informe um ID válido de notificação.',
    });
}

router.post('/', (req, res) => salvar(req, res));

router.get('/:id', async (req, res) => {
    const id = parametroInteiro(req.params.id);
    if (!inteiroPositivo(id)) return idInvalido(res);

    try {
        const notificacao = await buscarNotificacao(id);
        if (!notificacao) return notificacaoInexistente(res);
        return res.json({ success: true, notificacao });
    } catch (erro) {
        return erroInterno(res, 'consultar', erro);
    }
});

router.patch('/:id', (req, res) => {
    const id = parametroInteiro(req.params.id);
    if (!inteiroPositivo(id)) return idInvalido(res);
    return salvar(req, res, id);
});

router.get('/', async (req, res) => {
    const pagina = parametroInteiro(req.query.pagina, 1);
    const limite = parametroInteiro(req.query.limite, 50);
    if (!inteiroPositivo(pagina) || !inteiroPositivo(limite) || limite > 100) {
        return res.status(400).json({
            success: false,
            message: 'Informe uma página positiva e um limite entre 1 e 100.',
        });
    }

    try {
        const notificacoes = await listarNotificacoes(
            limite,
            (pagina - 1) * limite
        );
        return res.json({ success: true, notificacoes, pagina, limite });
    } catch (erro) {
        return erroInterno(res, 'listar', erro);
    }
});

export default router;
