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
        'Agravo fictício para notificações',
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

test('cria, persiste e lista uma notificação provável com a semana calculada', async () => {
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
    assert.deepEqual(resposta, {
        success: true,
        notificacao: {
            id,
            ...dados,
            agravo: 'Agravo fictício para notificações',
            unidade: 'Unidade fictícia',
            status: 'PROVAVEL',
            semana_epidemiologica: 1,
            ano_epidemiologico: 2025,
        },
    });

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
        status: 'PROVAVEL',
        semana_epidemiologica: 1,
        ano_epidemiologico: 2025,
        login: CONTAS.TECNICO.usuario,
    });

    const listagem = await requisitar('GET');
    assert.equal(listagem.status, 200);
    const { notificacoes } = await listagem.json();
    assert.deepEqual(
        notificacoes.find((registro) => registro.id === id),
        resposta.notificacao
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
    assert.equal(notificacao.status, 'PROVAVEL');
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
            message: 'Paciente, agravo ou unidade não encontrado.',
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
