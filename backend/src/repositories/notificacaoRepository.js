import {
    camposExame,
    DadosNotificacaoInvalidos,
    validarCaso,
    validarDatasExame,
} from '../services/dadosNotificacao.js';
import { db } from '../config/db.js';

const selecaoNotificacoes = `
    SELECT n.id, n.numero_sinan, n.fk_Paciente_id AS paciente_id,
           n.fk_Doenca_id AS agravo_id, d.nome AS agravo,
           n.fk_Unidade_Notificacao_id AS unidade_id, u.nome AS unidade,
           DATE_FORMAT(n.data_notificacao, '%Y-%m-%d') AS data_notificacao,
           DATE_FORMAT(n.data_1_sintoma, '%Y-%m-%d') AS data_1_sintoma,
           n.semana_epidemiologica, n.ano_epidemiologico,
           CASE
               WHEN n.classificacao_final = 'DESCARTADO' THEN 'DESCARTADO'
               WHEN n.classificacao_final IS NOT NULL AND
                    n.criterio_confirmacao IN ('LABORATORIAL', 'CLINICO_EPIDEMIOLOGICO')
                   THEN 'CONFIRMADO'
               ELSE NULL
           END AS status
`;

const tabelasNotificacoes = `
    FROM Notificacao n
    JOIN Doenca d ON d.id = n.fk_Doenca_id
    JOIN Unidade u ON u.id = n.fk_Unidade_Notificacao_id`;

export async function listarNotificacoes(limite, deslocamento) {
    const [notificacoes] = await db.execute(
        `${selecaoNotificacoes} ${tabelasNotificacoes} ORDER BY n.id DESC LIMIT ? OFFSET ?`,
        [limite, deslocamento]
    );
    return notificacoes;
}

const selecaoDetalhes = `
    ${selecaoNotificacoes},
    n.uf, n.municipio, n.fk_Endereco_id AS endereco_id,
    n.fk_Unidade_Acompanhamento_id AS unidade_acompanhamento_id,
    DATE_FORMAT(n.data_investigacao, '%Y-%m-%d') AS data_investigacao,
    DATE_FORMAT(n.data_encerramento, '%Y-%m-%d') AS data_encerramento,
    n.hospitalizado, n.gestante, n.escolaridade, n.evolucao_caso,
    n.classificacao_final, n.criterio_confirmacao,
    CAST(n.sinais_alarme AS CHAR) AS sinais_alarme,
    CAST(n.sinais_gravidade AS CHAR) AS sinais_gravidade
    ${tabelasNotificacoes} WHERE n.id = ?`;

const colunasPorCampo = {
    paciente_id: 'fk_Paciente_id',
    agravo_id: 'fk_Doenca_id',
    unidade_id: 'fk_Unidade_Notificacao_id',
    endereco_id: 'fk_Endereco_id',
    unidade_acompanhamento_id: 'fk_Unidade_Acompanhamento_id',
};

function colunasNotificacao(campos) {
    return Object.entries(campos).map(([campo, valor]) => {
        if (campo === 'sinais_alarme' || campo === 'sinais_gravidade') {
            return [campo, valor === null ? null : JSON.stringify(valor)];
        }
        return [colunasPorCampo[campo] ?? campo, valor];
    });
}

async function lerExames(conexao, id) {
    const [exames] = await conexao.execute(
        `SELECT id, tipo_exame, resultado, numero_requisicao_gal, situacao_exame,
                observacao, DATE_FORMAT(data_solicitacao, '%Y-%m-%d') AS data_solicitacao,
                DATE_FORMAT(data_coleta, '%Y-%m-%d') AS data_coleta,
                DATE_FORMAT(data_resultado, '%Y-%m-%d') AS data_resultado
         FROM Exame WHERE fk_Notificacao_id = ? ORDER BY id`,
        [id]
    );
    return exames;
}

async function lerCaso(conexao, id, bloquear = false) {
    const [[caso]] = await conexao.execute(
        bloquear ? `${selecaoDetalhes} FOR UPDATE` : selecaoDetalhes,
        [id]
    );
    if (!caso) return null;
    caso.sinais_alarme = JSON.parse(caso.sinais_alarme);
    caso.sinais_gravidade = JSON.parse(caso.sinais_gravidade);
    return caso;
}

export async function buscarNotificacao(id) {
    const conexao = await db.getConnection();
    try {
        await conexao.beginTransaction();
        const caso = await lerCaso(conexao, id);
        if (caso) caso.exames = await lerExames(conexao, id);
        await conexao.commit();
        return caso;
    } catch (erro) {
        await conexao.rollback();
        throw erro;
    } finally {
        conexao.release();
    }
}

async function salvarExames(conexao, id, tecnicoId, exames) {
    const existentes = new Map(
        (await lerExames(conexao, id)).map((exame) => [exame.id, exame])
    );
    const idsMantidos = new Set();
    for (const { id: exameId, ...campos } of exames) {
        if (exameId !== undefined && !existentes.has(exameId)) {
            throw new DadosNotificacaoInvalidos(
                'O exame informado não pertence à notificação.'
            );
        }
        const exame = { ...existentes.get(exameId), ...campos };
        validarDatasExame(exame);

        const colunas = Object.keys(camposExame);
        const valores = colunas.map((campo) => exame[campo] ?? null);
        if (exameId === undefined) {
            await conexao.execute(
                `INSERT INTO Exame (${colunas.join(', ')}, fk_Notificacao_id, fk_Usuario_id)
                 VALUES (${colunas.map(() => '?').join(', ')}, ?, ?)`,
                [...valores, id, tecnicoId]
            );
        } else {
            await conexao.execute(
                `UPDATE Exame SET ${colunas.map((coluna) => `${coluna} = ?`).join(', ')}
                 WHERE id = ? AND fk_Notificacao_id = ?`,
                [...valores, exameId, id]
            );
            idsMantidos.add(exameId);
        }
    }
    for (const exameId of existentes.keys()) {
        if (!idsMantidos.has(exameId)) {
            await conexao.execute(
                'DELETE FROM Exame WHERE id = ? AND fk_Notificacao_id = ?',
                [exameId, id]
            );
        }
    }
}

export async function salvarNotificacao({ campos, exames }, login, id) {
    const conexao = await db.getConnection();
    try {
        await conexao.beginTransaction();
        const [[tecnico]] = await conexao.execute(
            "SELECT id FROM Usuario WHERE login = ? AND ativo = TRUE AND perfil = 'TECNICO' LOCK IN SHARE MODE",
            [login]
        );
        if (!tecnico) {
            await conexao.rollback();
            return { semPermissao: true };
        }

        const edicao = id !== undefined;
        const anterior = edicao ? await lerCaso(conexao, id, true) : null;
        if (edicao && !anterior) {
            await conexao.rollback();
            return { inexistente: true };
        }

        const caso = { ...anterior, ...campos };
        const [[agravo]] = await conexao.execute(
            'SELECT nome FROM Doenca WHERE id = ?',
            [caso.agravo_id]
        );
        if (!agravo) {
            await conexao.rollback();
            return { referenciaInvalida: true };
        }
        const status = validarCaso({ ...caso, agravo: agravo.nome });
        const colunas = colunasNotificacao({ ...campos, status });
        const valores = colunas.map(([, valor]) => valor);
        if (edicao) {
            await conexao.execute(
                `UPDATE Notificacao SET ${colunas.map(([coluna]) => `${coluna} = ?`).join(', ')}
                 WHERE id = ?`,
                [...valores, id]
            );
        } else {
            const [insercao] = await conexao.execute(
                `INSERT INTO Notificacao (${colunas.map(([coluna]) => coluna).join(', ')}, fk_Usuario_id)
                 VALUES (${colunas.map(() => '?').join(', ')}, ?)`,
                [...valores, tecnico.id]
            );
            id = insercao.insertId;
        }

        if (exames !== undefined)
            await salvarExames(conexao, id, tecnico.id, exames);
        const notificacao = await lerCaso(conexao, id);
        notificacao.exames = await lerExames(conexao, id);
        await conexao.commit();
        return { notificacao };
    } catch (erro) {
        await conexao.rollback();
        throw erro;
    } finally {
        conexao.release();
    }
}
