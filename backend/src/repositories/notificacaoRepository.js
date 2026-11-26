import { db } from '../config/db.js';

const selecaoNotificacoes = `
    SELECT n.id, n.numero_sinan, n.fk_Paciente_id AS paciente_id,
           n.fk_Doenca_id AS agravo_id, d.nome AS agravo,
           n.fk_Unidade_Notificacao_id AS unidade_id, u.nome AS unidade,
           DATE_FORMAT(n.data_notificacao, '%Y-%m-%d') AS data_notificacao,
           DATE_FORMAT(n.data_1_sintoma, '%Y-%m-%d') AS data_1_sintoma,
           n.semana_epidemiologica, n.ano_epidemiologico, n.status
    FROM Notificacao n
    JOIN Doenca d ON d.id = n.fk_Doenca_id
    JOIN Unidade u ON u.id = n.fk_Unidade_Notificacao_id`;

export async function listarNotificacoes(limite, deslocamento) {
    const [notificacoes] = await db.execute(
        `${selecaoNotificacoes} ORDER BY n.id DESC LIMIT ? OFFSET ?`,
        [limite, deslocamento]
    );
    return notificacoes;
}

export async function criarNotificacao(notificacao, login) {
    const conexao = await db.getConnection();
    try {
        await conexao.beginTransaction();
        const [insercao] = await conexao.execute(
            `INSERT INTO Notificacao (
                 numero_sinan, fk_Paciente_id, fk_Doenca_id,
                 fk_Unidade_Notificacao_id, data_notificacao, data_1_sintoma,
                 status, fk_Usuario_id
             )
             SELECT ?, ?, ?, ?, ?, ?, 'PROVAVEL', id
             FROM Usuario WHERE login = ? AND ativo = TRUE AND perfil = 'TECNICO'`,
            [
                notificacao.numero_sinan,
                notificacao.paciente_id,
                notificacao.agravo_id,
                notificacao.unidade_id,
                notificacao.data_notificacao,
                notificacao.data_1_sintoma,
                login,
            ]
        );

        if (insercao.affectedRows === 0) {
            await conexao.rollback();
            return null;
        }

        const [[criada]] = await conexao.execute(
            `${selecaoNotificacoes} WHERE n.id = ?`,
            [insercao.insertId]
        );
        await conexao.commit();
        return criada;
    } catch (erro) {
        await conexao.rollback();
        throw erro;
    } finally {
        conexao.release();
    }
}
