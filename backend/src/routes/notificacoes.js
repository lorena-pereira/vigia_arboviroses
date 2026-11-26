import { Router } from 'express';
import {
    criarNotificacao,
    listarNotificacoes,
} from '../repositories/notificacaoRepository.js';

const router = Router();
const MAX_ID = 4294967295;

function inteiroPositivo(valor) {
    return Number.isInteger(valor) && valor > 0 && valor <= MAX_ID;
}

function dataValida(valor) {
    if (typeof valor !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(valor)) {
        return false;
    }
    const data = new Date(`${valor}T00:00:00Z`);
    return (
        !Number.isNaN(data.getTime()) &&
        data.toISOString().slice(0, 10) === valor
    );
}

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

router.post('/', async (req, res) => {
    const {
        numero_sinan,
        paciente_id,
        agravo_id,
        unidade_id,
        data_notificacao,
        data_1_sintoma = null,
    } = req.body ?? {};
    const numero = typeof numero_sinan === 'string' ? numero_sinan.trim() : '';

    if (!numero || Array.from(numero).length > 30) {
        return res.status(400).json({
            success: false,
            message: 'Informe um número SINAN de até 30 caracteres.',
        });
    }

    if (![paciente_id, agravo_id, unidade_id].every(inteiroPositivo)) {
        return res.status(400).json({
            success: false,
            message: 'Informe IDs válidos de paciente, agravo e unidade.',
        });
    }

    if (
        !dataValida(data_notificacao) ||
        (data_1_sintoma !== null &&
            (!dataValida(data_1_sintoma) || data_1_sintoma > data_notificacao))
    ) {
        return res.status(400).json({
            success: false,
            message:
                'Use datas válidas no formato AAAA-MM-DD. Os primeiros sintomas devem ser anteriores ou iguais à data da notificação.',
        });
    }

    try {
        const notificacao = await criarNotificacao(
            {
                numero_sinan: numero,
                paciente_id,
                agravo_id,
                unidade_id,
                data_notificacao,
                data_1_sintoma,
            },
            req.session.usuario
        );

        if (!notificacao) {
            return res.status(403).json({
                authenticated: true,
                message: 'Acesso negado para este perfil.',
            });
        }

        return res.status(201).json({ success: true, notificacao });
    } catch (erro) {
        if (erro.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Já existe uma notificação com esse número SINAN.',
            });
        }
        if (erro.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(422).json({
                success: false,
                message: 'Paciente, agravo ou unidade não encontrado.',
            });
        }
        return erroInterno(res, 'criar', erro);
    }
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
