import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { app } from '../server.js';
import { sessions } from '../src/sessionStore.js';
import { CONTAS, db, validarBancoTeste } from '../test-support/mysql-test.js';

const rota = '/api/notificacoes';
const perfisBloqueados = ['ADMINISTRADOR', 'GESTOR', 'ENDEMIAS'];
const cookies = new Map();
const fixture = {};
let server;
let base;

before(async () => {
    await validarBancoTeste();

    const [paciente] = await db.execute(
        'INSERT INTO Paciente (nome) VALUES (?)',
        ['Paciente fictício para notificações']
    );
    fixture.paciente_id = paciente.insertId;

    const [endereco] = await db.execute(
        'INSERT INTO Endereco (logradouro) VALUES (?)',
        ['Logradouro fictício']
    );
    fixture.endereco_id = endereco.insertId;

    const [unidade] = await db.execute(
        'INSERT INTO Unidade (nome, fk_Endereco_id) VALUES (?, ?)',
        ['Unidade fictícia', fixture.endereco_id]
    );
    fixture.unidade_id = unidade.insertId;

    const [agravo] = await db.execute('INSERT INTO Doenca (nome) VALUES (?)', [
        'Dengue',
    ]);
    fixture.agravo_id = agravo.insertId;

    await new Promise((resolve) => {
        server = app.listen(0, '127.0.0.1', resolve);
    });
    base = `http://127.0.0.1:${server.address().port}`;

    for (const perfil of ['TECNICO', ...perfisBloqueados]) {
        const resposta = await fetch(`${base}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(CONTAS[perfil]),
        });
        assert.equal(resposta.status, 200, `Login de ${perfil}`);
        await resposta.json();
        const cookie = resposta.headers
            .get('set-cookie')
            ?.match(/^sessionId=[^;]+/);
        assert.ok(cookie, `Sessão de ${perfil}`);
        cookies.set(perfil, cookie[0]);
    }
});

after(async () => {
    try {
        if (fixture.paciente_id) {
            await db.execute(
                'DELETE e FROM Exame e JOIN Notificacao n ON n.id = e.fk_Notificacao_id WHERE n.fk_Paciente_id = ?',
                [fixture.paciente_id]
            );
            await db.execute(
                'DELETE FROM Notificacao WHERE fk_Paciente_id = ?',
                [fixture.paciente_id]
            );
            await db.execute('DELETE FROM Paciente WHERE id = ?', [
                fixture.paciente_id,
            ]);
        }
        if (fixture.unidade_id) {
            await db.execute('DELETE FROM Unidade WHERE id = ?', [
                fixture.unidade_id,
            ]);
        }
        if (fixture.endereco_id) {
            await db.execute('DELETE FROM Endereco WHERE id = ?', [
                fixture.endereco_id,
            ]);
        }
        if (fixture.agravo_id) {
            await db.execute('DELETE FROM Doenca WHERE id = ?', [
                fixture.agravo_id,
            ]);
        }
    } finally {
        try {
            if (server) {
                await new Promise((resolve, reject) => {
                    server.close((erro) => (erro ? reject(erro) : resolve()));
                });
            }
        } finally {
            sessions.clear();
            await db.end();
        }
    }
});

function dadosNotificacao(alteracoes = {}) {
    return {
        numero_sinan: `TESTE-${randomUUID().slice(0, 8)}`,
        paciente_id: fixture.paciente_id,
        agravo_id: fixture.agravo_id,
        unidade_id: fixture.unidade_id,
        data_notificacao: '2025-01-02',
        data_1_sintoma: '2024-12-31',
        ...alteracoes,
    };
}

function requisitar(metodo, { perfil = 'TECNICO', consulta = '', body } = {}) {
    const headers = {};
    if (perfil) headers.Cookie = cookies.get(perfil);
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    return fetch(base + rota + consulta, {
        method: metodo,
        headers,
        body: JSON.stringify(body),
    });
}

test('cria, persiste e lista uma notificação ainda sem classificação com a semana calculada', async () => {
    const dados = dadosNotificacao();
    const criacao = await requisitar('POST', {
        body: {
            ...dados,
            status: 'DESCARTADO',
            semana_epidemiologica: 52,
            ano_epidemiologico: 2024,
            usuario_id: 4294967295,
        },
    });
    assert.equal(criacao.status, 201);
    const resposta = await criacao.json();
    const { id } = resposta.notificacao;
    assert.ok(Number.isInteger(id) && id > 0);
    const { notificacao } = resposta;
    const resumo = Object.fromEntries(
        [
            'id',
            ...Object.keys(dados),
            'agravo',
            'unidade',
            'status',
            'semana_epidemiologica',
            'ano_epidemiologico',
        ].map((campo) => [campo, notificacao[campo]])
    );
    assert.deepEqual(
        { ...resposta, notificacao: resumo },
        {
            success: true,
            notificacao: {
                id,
                ...dados,
                agravo: 'Dengue',
                unidade: 'Unidade fictícia',
                status: null,
                semana_epidemiologica: 1,
                ano_epidemiologico: 2025,
            },
        }
    );

    const [[persistida]] = await db.execute(
        `SELECT n.fk_Paciente_id, n.fk_Doenca_id, n.fk_Unidade_Notificacao_id,
                n.status, n.semana_epidemiologica, n.ano_epidemiologico, u.login
         FROM Notificacao n JOIN Usuario u ON u.id = n.fk_Usuario_id
         WHERE n.id = ?`,
        [id]
    );
    assert.deepEqual(persistida, {
        fk_Paciente_id: dados.paciente_id,
        fk_Doenca_id: dados.agravo_id,
        fk_Unidade_Notificacao_id: dados.unidade_id,
        status: null,
        semana_epidemiologica: 1,
        ano_epidemiologico: 2025,
        login: CONTAS.TECNICO.usuario,
    });

    const listagem = await requisitar('GET');
    assert.equal(listagem.status, 200);
    const { notificacoes } = await listagem.json();
    assert.deepEqual(
        notificacoes.find((registro) => registro.id === id),
        resumo
    );
});

test('lista as notificações em ordem decrescente de ID, com paginação', async () => {
    const ids = [];
    for (let i = 0; i < 2; i++) {
        const criacao = await requisitar('POST', { body: dadosNotificacao() });
        assert.equal(criacao.status, 201);
        ids.push((await criacao.json()).notificacao.id);
    }

    for (const [pagina, id] of ids.reverse().entries()) {
        const listagem = await requisitar('GET', {
            consulta: `?pagina=${pagina + 1}&limite=1`,
        });
        assert.equal(listagem.status, 200);
        const resposta = await listagem.json();
        assert.equal(resposta.pagina, pagina + 1);
        assert.equal(resposta.limite, 1);
        assert.deepEqual(
            resposta.notificacoes.map((registro) => registro.id),
            [id]
        );
    }
});

test('aceita data de primeiros sintomas desconhecida', async () => {
    const body = dadosNotificacao();
    delete body.data_1_sintoma;
    const resposta = await requisitar('POST', { body });
    assert.equal(resposta.status, 201);
    const { notificacao } = await resposta.json();
    assert.equal(notificacao.data_1_sintoma, null);
    assert.equal(notificacao.semana_epidemiologica, null);
    assert.equal(notificacao.ano_epidemiologico, null);
    assert.equal(notificacao.status, null);
});

test('exige número SINAN, IDs positivos e datas válidas em ordem cronológica', async () => {
    for (const alteracoes of [
        { numero_sinan: '   ' },
        { numero_sinan: 'x'.repeat(31) },
        { paciente_id: undefined },
        { agravo_id: '1' },
        { unidade_id: 0 },
        { data_notificacao: undefined },
        { data_notificacao: '2025-02-29' },
        { data_1_sintoma: '2025-01-03' },
    ]) {
        const resposta = await requisitar('POST', {
            body: dadosNotificacao(alteracoes),
        });
        assert.equal(resposta.status, 400, JSON.stringify(alteracoes));
        assert.equal((await resposta.json()).success, false);
    }
});

test('rejeita referências inexistentes a paciente, agravo ou unidade', async () => {
    for (const campo of ['paciente_id', 'agravo_id', 'unidade_id']) {
        const resposta = await requisitar('POST', {
            body: dadosNotificacao({ [campo]: 4294967295 }),
        });
        assert.equal(resposta.status, 422, campo);
        assert.deepEqual(await resposta.json(), {
            success: false,
            message: 'Paciente, agravo, unidade ou endereço não encontrado.',
        });
    }
});

test('preserva um único registro em criações concorrentes com o mesmo SINAN', async () => {
    const body = dadosNotificacao();
    const respostas = await Promise.all([
        requisitar('POST', { body }),
        requisitar('POST', { body }),
    ]);
    assert.deepEqual(
        respostas.map((resposta) => resposta.status).sort(),
        [201, 409]
    );
    await Promise.all(respostas.map((resposta) => resposta.json()));

    const [registros] = await db.execute(
        'SELECT id FROM Notificacao WHERE numero_sinan = ?',
        [body.numero_sinan]
    );
    assert.equal(registros.length, 1);
});

test('valida os parâmetros de paginação', async () => {
    for (const consulta of ['?pagina=0', '?limite=101', '?limite=1&limite=2']) {
        const resposta = await requisitar('GET', { consulta });
        assert.equal(resposta.status, 400, consulta);
        assert.equal((await resposta.json()).success, false);
    }
});

test('restringe criação e listagem ao Técnico de Vigilância', async () => {
    for (const metodo of ['GET', 'POST']) {
        const body = metodo === 'POST' ? dadosNotificacao() : undefined;
        const anonima = await requisitar(metodo, { perfil: null, body });
        assert.equal(anonima.status, 401);
        assert.equal((await anonima.json()).authenticated, false);

        for (const perfil of perfisBloqueados) {
            const resposta = await requisitar(metodo, { perfil, body });
            assert.equal(resposta.status, 403, `${metodo} ${perfil}`);
            assert.deepEqual(await resposta.json(), {
                authenticated: true,
                message: 'Acesso negado para este perfil.',
            });
        }
    }
});

test('persiste dados clínicos, evolução, exames e classificação e permite reabrir o caso', async () => {
    const criacao = await requisitar('POST', {
        body: dadosNotificacao({
            municipio: 'Município fictício',
            sinais_alarme: ['Dor abdominal intensa'],
            exames: [{ tipo_exame: 'NS1' }],
        }),
    });
    assert.equal(criacao.status, 201);
    const { notificacao: criada } = await criacao.json();
    const consulta = `/${criada.id}`;
    const exame = criada.exames[0];
    const alteracao = await requisitar('PATCH', {
        consulta,
        body: {
            evolucao_caso: 'CURA',
            classificacao_final: 'DENGUE_COM_SINAIS_DE_ALARME',
            criterio_confirmacao: 'LABORATORIAL',
            exames: [
                {
                    id: exame.id,
                    tipo_exame: exame.tipo_exame,
                    resultado: 'POSITIVO',
                },
            ],
        },
    });
    assert.equal(alteracao.status, 200);
    const reabertura = await requisitar('GET', { consulta });
    assert.equal(reabertura.status, 200);
    const { notificacao } = await reabertura.json();
    assert.deepEqual(notificacao, (await alteracao.json()).notificacao);
    assert.equal(notificacao.municipio, 'Município fictício');
    assert.deepEqual(notificacao.sinais_alarme, ['Dor abdominal intensa']);
    assert.equal(notificacao.evolucao_caso, 'CURA');
    assert.equal(
        notificacao.classificacao_final,
        'DENGUE_COM_SINAIS_DE_ALARME'
    );
    assert.equal(notificacao.status, 'CONFIRMADO');
    assert.equal(notificacao.exames[0].id, exame.id);
    assert.equal(notificacao.exames[0].resultado, 'POSITIVO');

    const invalida = await requisitar('PATCH', {
        consulta,
        body: {
            evolucao_caso: 'IGNORADO',
            exames: [{ id: 4294967295, tipo_exame: 'NS1' }],
        },
    });
    assert.equal(invalida.status, 400);
    const aposFalha = await requisitar('GET', { consulta });
    assert.deepEqual((await aposFalha.json()).notificacao, notificacao);
});

test('rejeita classificações inconsistentes e permite confirmar pelo critério clínico-epidemiológico ou descartar', async () => {
    const criacao = await requisitar('POST', { body: dadosNotificacao() });
    const { notificacao } = await criacao.json();
    const consulta = `/${notificacao.id}`;
    for (const body of [
        { classificacao_final: 'PROVAVEL' },
        { classificacao_final: 'DENGUE' },
        { classificacao_final: 'ZIKA', criterio_confirmacao: 'LABORATORIAL' },
    ]) {
        const resposta = await requisitar('PATCH', { consulta, body });
        assert.equal(resposta.status, 400);
    }
    const confirmada = await requisitar('PATCH', {
        consulta,
        body: {
            classificacao_final: 'DENGUE',
            criterio_confirmacao: 'CLINICO_EPIDEMIOLOGICO',
        },
    });
    assert.equal(confirmada.status, 200);
    assert.equal(
        (await confirmada.json()).notificacao.criterio_confirmacao,
        'CLINICO_EPIDEMIOLOGICO'
    );
    const descartada = await requisitar('PATCH', {
        consulta,
        body: { classificacao_final: 'DESCARTADO', criterio_confirmacao: null },
    });
    assert.equal(descartada.status, 200);
    assert.equal((await descartada.json()).notificacao.status, 'DESCARTADO');
});

test('protege a consulta individual e a edição e devolve 404 para caso ausente', async () => {
    for (const metodo of ['GET', 'PATCH']) {
        const consulta = '/4294967295';
        const body = metodo === 'PATCH' ? { evolucao_caso: 'CURA' } : undefined;
        const ausente = await requisitar(metodo, { consulta, body });
        assert.equal(ausente.status, 404);
        for (const perfil of [null, ...perfisBloqueados]) {
            const bloqueada = await requisitar(metodo, {
                consulta,
                body,
                perfil,
            });
            assert.equal(bloqueada.status, perfil ? 403 : 401);
        }
    }
});
