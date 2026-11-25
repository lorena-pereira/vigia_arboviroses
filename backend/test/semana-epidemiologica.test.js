import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/config/db.js';

after(async () => {
    await db.end();
});

// Datas de referencia e seus resultados esperados.
const casos = [
    ['2024-02-29', 9, 2024],
    ['2024-03-15', 11, 2024],
    ['2024-12-28', 52, 2024],
    ['2024-12-29', 1, 2025],
    ['2024-12-31', 1, 2025],
    ['2025-01-01', 1, 2025],
    ['2025-01-04', 1, 2025],
    ['2025-01-05', 2, 2025],
    ['2025-12-31', 53, 2025],
    ['2026-01-01', 53, 2025],
    ['2026-01-03', 53, 2025],
    ['2026-01-04', 1, 2026],
    ['2026-11-24', 47, 2026],
    [null, null, null],
];

test('SE: calcula corretamente as datas de referencia', async () => {
    for (const [data, semana, ano] of casos) {
        const [rows] = await db.execute(
            `SELECT
                MOD(YEARWEEK(?, 6), 100) AS semana,
                YEARWEEK(?, 6) DIV 100 AS ano`,
            [data, data]
        );

        assert.equal(rows[0].semana, semana, `Semana incorreta para ${data}`);

        assert.equal(rows[0].ano, ano, `Ano incorreto para ${data}`);
    }
});

test('SE: calcula e atualiza automaticamente os campos da notificacao', async (t) => {
    // Impede alteracoes no banco de desenvolvimento ou producao.
    assert.equal(process.env.DB_NAME, 'vigia_test');

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Cria os registros necessarios para as chaves estrangeiras.
        const [endereco] = await connection.execute(
            'INSERT INTO Endereco (logradouro) VALUES (?)',
            ['Rua de Teste SE']
        );

        const [unidade] = await connection.execute(
            'INSERT INTO Unidade (nome, fk_Endereco_id) VALUES (?, ?)',
            ['Unidade Teste SE', endereco.insertId]
        );

        const [paciente] = await connection.execute(
            'INSERT INTO Paciente (nome) VALUES (?)',
            ['Paciente Teste SE']
        );

        const [doenca] = await connection.execute(
            'INSERT INTO Doenca (nome) VALUES (?)',
            ['Doenca Teste SE']
        );

        const [usuario] = await connection.execute(
            `INSERT INTO Usuario
                (nome, email, perfil, login, senha_hash, ativo)
             VALUES (?, ?, ?, ?, ?, FALSE)`,
            [
                'Usuario Teste SE',
                'semana-epidemiologica@example.test',
                'TECNICO',
                'teste.se',
                'HASH_FICTICIO',
            ]
        );

        // Insere a notificacao sem informar semana ou ano.
        const [notificacao] = await connection.execute(
            `INSERT INTO Notificacao (
                data_notificacao,
                data_1_sintoma,
                fk_Unidade_Notificacao_id,
                fk_Paciente_id,
                fk_Doenca_id,
                fk_Usuario_id
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
                '2025-01-02',
                '2024-12-31',
                unidade.insertId,
                paciente.insertId,
                doenca.insertId,
                usuario.insertId,
            ]
        );

        const id = notificacao.insertId;

        const consultarSE = async () => {
            const [rows] = await connection.execute(
                `SELECT semana_epidemiologica, ano_epidemiologico
                 FROM Notificacao
                 WHERE id = ?`,
                [id]
            );

            return rows[0];
        };

        const atualizarData = async (data) => {
            await connection.execute(
                `UPDATE Notificacao
                 SET data_1_sintoma = ?
                 WHERE id = ?`,
                [data, id]
            );
        };

        await t.test('calcula a SE durante a insercao', async () => {
            const resultado = await consultarSE();

            assert.equal(resultado.semana_epidemiologica, 1);
            assert.equal(resultado.ano_epidemiologico, 2025);
        });

        await t.test('recalcula a SE apos atualizar a data', async () => {
            await atualizarData('2024-03-15');

            const resultado = await consultarSE();

            assert.equal(resultado.semana_epidemiologica, 11);
            assert.equal(resultado.ano_epidemiologico, 2024);
        });

        await t.test('considera o ano epidemiologico anterior', async () => {
            await atualizarData('2022-01-01');

            const resultado = await consultarSE();

            assert.equal(resultado.semana_epidemiologica, 52);
            assert.equal(resultado.ano_epidemiologico, 2021);
        });

        await t.test('considera o ano epidemiologico seguinte', async () => {
            await atualizarData('2023-12-31');

            const resultado = await consultarSE();

            assert.equal(resultado.semana_epidemiologica, 1);
            assert.equal(resultado.ano_epidemiologico, 2024);
        });

        await t.test('retorna NULL quando a data e desconhecida', async () => {
            await atualizarData(null);

            const resultado = await consultarSE();

            assert.equal(resultado.semana_epidemiologica, null);
            assert.equal(resultado.ano_epidemiologico, null);
        });

        await t.test('impede alteracao manual da semana', async () => {
            await assert.rejects(
                connection.execute(
                    `UPDATE Notificacao
                     SET semana_epidemiologica = 30
                     WHERE id = ?`,
                    [id]
                ),
                { errno: 3105 }
            );
        });

        await t.test('impede alteracao manual do ano', async () => {
            await assert.rejects(
                connection.execute(
                    `UPDATE Notificacao
                     SET ano_epidemiologico = 2026
                     WHERE id = ?`,
                    [id]
                ),
                { errno: 3105 }
            );
        });
    } finally {
        try {
            await connection.rollback();
        } finally {
            connection.release();
        }
    }
});
