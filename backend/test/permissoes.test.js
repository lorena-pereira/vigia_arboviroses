// testes HTTP de autorização por perfil
import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { app } from '../server.js';
import { sessions, SESSION_TIMEOUT_MS } from '../src/sessionStore.js';

let server;
let base;

const perfisSemGestao = ['TECNICO', 'GESTOR', 'ENDEMIAS'];
const perfisSemPacientes = ['ADMINISTRADOR', 'GESTOR', 'ENDEMIAS'];

// caminhos previstos para gestão
const rotasUsuarios = [
    ['GET', '/api/usuarios'],
    ['GET', '/api/usuarios/1'],
    ['POST', '/api/usuarios'],
    ['PUT', '/api/usuarios/1'],
    ['PATCH', '/api/usuarios/1'],
    ['PATCH', '/api/usuarios/1/ativar'],
    ['PATCH', '/api/usuarios/1/desativar'],
    ['PATCH', '/api/usuarios/1/perfil'],
    ['POST', '/api/usuarios/1/redefinir-senha'],
    ['PATCH', '/api/usuarios/1/redefinir-senha'],
    ['DELETE', '/api/usuarios/1'],
];

const rotasPacientes = [
    ['GET', '/api/pacientes'],
    ['GET', '/api/pacientes/1'],
    ['POST', '/api/pacientes'],
];

before(async () => {
    await new Promise((resolve) => {
        server = app.listen(0, '127.0.0.1', resolve);
    });
    base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    sessions.clear();
    await new Promise((resolve, reject) => {
        server.close((erro) => (erro ? reject(erro) : resolve()));
    });
});

beforeEach(() => sessions.clear());

// sessões fictícias
function criarSessao(perfil) {
    const id = randomUUID();
    const agora = Date.now();

    sessions.set(id, {
        usuario: `teste_${perfil.toLowerCase()}`,
        perfil,
        createdAt: agora,
        expiresAt: agora + SESSION_TIMEOUT_MS,
    });

    return `sessionId=${id}`;
}

function requisitar(metodo, rota, cookie) {
    return fetch(base + rota, {
        method: metodo,
        headers: cookie ? { Cookie: cookie } : {},
        redirect: 'manual',
    });
}

async function verificarBloqueio(perfil, metodo, rota) {
    const resposta = await requisitar(metodo, rota, criarSessao(perfil));

    assert.equal(resposta.status, 403);

    assert.match(
        resposta.headers.get('content-type') || '',
        /application\/json/
    );

    // não pode incluir dados pessoais, credenciais ou outros campos
    assert.deepEqual(await resposta.json(), {
        authenticated: true,
        message: 'Acesso negado para este perfil.',
    });
}

for (const perfil of perfisSemGestao) {
    for (const [metodo, rota] of rotasUsuarios) {
        test(`${perfil}: ${metodo} ${rota} -> 403`, async () => {
            await verificarBloqueio(perfil, metodo, rota);
        });
    }
}

for (const perfil of perfisSemPacientes) {
    for (const [metodo, rota] of rotasPacientes) {
        test(`${perfil}: ${metodo} ${rota} -> 403`, async () => {
            await verificarBloqueio(perfil, metodo, rota);
        });
    }
}

for (const rota of ['/api/usuarios', '/api/pacientes']) {
    test(`Sem sessão: GET ${rota} -> 401`, async () => {
        const resposta = await requisitar('GET', rota);

        assert.equal(resposta.status, 401);

        assert.deepEqual(await resposta.json(), {
            authenticated: false,
            message: 'Sessão inválida ou expirada.',
        });
    });
}
