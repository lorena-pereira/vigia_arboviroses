// testes de integração de login e sessão
import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { app } from '../server.js';

import {
    sessions,
    SESSION_TIMEOUT_MS,
    SESSION_WARNING_MS,
} from '../src/sessionStore.js';

import { tentativas } from '../src/services/authService.js';

import { db, CONTAS, validarBancoTeste } from '../test-support/mysql-test.js';

let server;
let base;

const admin = CONTAS.ADMINISTRADOR;

const perfisEsperados = {
    ADMINISTRADOR: 'admin',
    TECNICO: 'agente_vigilancia_epidemiologica',
    GESTOR: 'municipio',
    ENDEMIAS: 'agente_combate_endemias',
};

// configuração do ambiente
before(async () => {
    await validarBancoTeste();

    await new Promise((resolve) => {
        server = app.listen(0, '127.0.0.1', resolve);
    });

    base = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(() => {
    tentativas.clear();
    sessions.clear();
});

after(async () => {
    try {
        if (server) {
            await new Promise((resolve, reject) => {
                server.close((erro) => (erro ? reject(erro) : resolve()));
            });
        }
    } finally {
        sessions.clear();
        tentativas.clear();

        await db.end();
    }
});

// funções auxiliares
function requisitar(rota, { metodo = 'GET', cookie, body } = {}) {
    const headers = {};

    if (cookie) {
        headers.Cookie = cookie;
    }

    if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
    }

    return fetch(base + rota, {
        method: metodo,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        redirect: 'manual',
    });
}

function login(conta = admin) {
    return requisitar('/login', {
        metodo: 'POST',
        body: conta,
    });
}

async function loginComCookie(conta = admin) {
    const resposta = await login(conta);

    assert.equal(resposta.status, 200);

    const setCookie = resposta.headers.get('set-cookie') || '';

    const match = setCookie.match(/sessionId=([^;]+)/);

    assert.ok(match, 'Cookie de sessão não foi enviado.');

    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Lax/i);
    assert.match(setCookie, /Path=\//i);
    assert.match(setCookie, /Max-Age=1800/i);

    await resposta.json();
    return { sessionId: match[1], cookie: `sessionId=${match[1]}` };
}

// login válido
for (const [perfil, esperado] of Object.entries(perfisEsperados)) {
    test(`${perfil}: login válido retorna HTTP 200`, async () => {
        const resposta = await login(CONTAS[perfil]);

        assert.equal(resposta.status, 200);

        const data = await resposta.json();

        assert.equal(data.success, true);
        assert.equal(data.profile, esperado);
        assert.equal(data.redirect, '/index.html');

        assert.equal(data.user.nome, CONTAS[perfil].usuario);

        assert.equal(data.user.perfil, esperado);
        assert.equal(data.user.exigeTrocaSenha, false);

        assert.ok(resposta.headers.get('set-cookie'));
    });
}

// login inválido
test('usuário inexistente e senha incorreta retornam erro genérico', async () => {
    const inexistente = await login({
        usuario: 'usuario_que_nao_existe',
        senha: 'SenhaInvalida',
    });

    const senhaErrada = await login({
        usuario: admin.usuario,
        senha: 'SenhaInvalida',
    });

    assert.equal(inexistente.status, 401);
    assert.equal(senhaErrada.status, 401);

    const a = await inexistente.json();
    const b = await senhaErrada.json();

    assert.deepEqual(a, b);

    assert.deepEqual(a, {
        success: false,
        message: 'Usuário ou senha inválidos.',
    });

    assert.equal(inexistente.headers.get('set-cookie'), null);

    assert.equal(senhaErrada.headers.get('set-cookie'), null);

    assert.equal(sessions.size, 0);
});

test('campos obrigatórios vazios retornam HTTP 400', async () => {
    const resposta = await login({
        usuario: '',
        senha: '',
    });

    assert.equal(resposta.status, 400);

    assert.deepEqual(await resposta.json(), {
        success: false,
        message: 'Informe usuário e senha.',
    });

    assert.equal(sessions.size, 0);
});

test('usuário inativo não consegue realizar login', async () => {
    const resposta = await login(CONTAS.INATIVO);

    assert.equal(resposta.status, 401);

    assert.deepEqual(await resposta.json(), {
        success: false,
        message: 'Usuário ou senha inválidos.',
    });

    assert.equal(resposta.headers.get('set-cookie'), null);

    assert.equal(sessions.size, 0);
});

// controle de tentativas
test('quinta tentativa incorreta bloqueia o usuário', async () => {
    const contaInvalida = {
        usuario: admin.usuario,
        senha: 'SenhaInvalida',
    };

    for (let i = 0; i < 4; i++) {
        assert.equal((await login(contaInvalida)).status, 401);
    }

    const quinta = await login(contaInvalida);

    assert.equal(quinta.status, 429);

    const data = await quinta.json();

    assert.equal(data.bloqueado, true);

    assert.equal((await login()).status, 429);

    assert.equal(sessions.size, 0);
});

test('após expirar o bloqueio o login volta a funcionar', async () => {
    const contaInvalida = {
        usuario: admin.usuario,
        senha: 'SenhaInvalida',
    };

    for (let i = 0; i < 5; i++) {
        await login(contaInvalida);
    }

    const estado = tentativas.get(admin.usuario);

    assert.ok(estado);
    assert.ok(estado.bloqueadoAte > Date.now());

    estado.bloqueadoAte = Date.now() - 1000;

    assert.equal((await login()).status, 200);

    assert.equal(tentativas.has(admin.usuario), false);
});

test('login correto limpa o contador de tentativas', async () => {
    const contaInvalida = {
        usuario: admin.usuario,
        senha: 'SenhaInvalida',
    };

    for (let i = 0; i < 4; i++) {
        assert.equal((await login(contaInvalida)).status, 401);
    }

    assert.equal((await login()).status, 200);

    assert.equal(tentativas.has(admin.usuario), false);

    for (let i = 0; i < 4; i++) {
        assert.equal((await login(contaInvalida)).status, 401);
    }
});

// criação e validação da sessão
test('login cria cookie e sessão válida de 30 minutos', async () => {
    const { sessionId, cookie } = await loginComCookie();

    const session = sessions.get(sessionId);

    assert.ok(session);
    assert.equal(session.usuario, admin.usuario);
    assert.equal(session.perfil, 'admin');
    assert.equal(session.exigeTrocaSenha, false);

    assert.ok(session.expiresAt > Date.now());

    assert.equal(SESSION_TIMEOUT_MS, 30 * 60 * 1000);

    assert.ok(
        Math.abs(session.expiresAt - session.createdAt - SESSION_TIMEOUT_MS) <=
            1000
    );

    const resposta = await requisitar('/api/session', { cookie });

    assert.equal(resposta.status, 200);

    const data = await resposta.json();

    assert.equal(data.authenticated, true);
    assert.equal(data.warning, false);

    assert.equal(data.user.nome, admin.usuario);
    assert.equal(data.user.perfil, 'admin');
    assert.equal(data.user.exigeTrocaSenha, false);

    assert.ok(data.expiresInMs > 0);

    assert.ok(data.expiresInMs <= SESSION_TIMEOUT_MS);
});

// proteção de rota
test('página protegida exige sessão válida', async () => {
    const semSessao = await requisitar('/index.html');

    assert.equal(semSessao.status, 302);

    assert.equal(semSessao.headers.get('location'), '/');

    const { cookie } = await loginComCookie();

    const comSessao = await requisitar('/index.html', { cookie });

    assert.equal(comSessao.status, 200);
});

test('API protegida rejeita cookie de sessão inexistente', async () => {
    const resposta = await requisitar('/api/pacientes', {
        cookie: 'sessionId=inexistente',
    });

    assert.equal(resposta.status, 401);

    const data = await resposta.json();

    assert.equal(data.authenticated, false);
});

test('gestor não pode acessar o dashboard conforme regra existente', async () => {
    const { cookie } = await loginComCookie(CONTAS.GESTOR);

    const resposta = await requisitar('/index.html', { cookie });

    assert.equal(resposta.status, 403);

    const data = await resposta.json();

    assert.equal(data.accessDenied, true);
    assert.equal(data.perfil, 'municipio');
});

// logout
test('logout encerra a sessão e impede reutilização do cookie', async () => {
    const { sessionId, cookie } = await loginComCookie();
    const apiAntes = await requisitar('/api/usuarios', { cookie });
    assert.equal(apiAntes.status, 200);
    await apiAntes.json();

    const resposta = await requisitar('/logout', {
        metodo: 'POST',
        cookie,
    });

    assert.equal(resposta.status, 200);
    assert.deepEqual(await resposta.json(), {
        success: true,
        redirect: '/html/login.html',
    });

    assert.equal(sessions.has(sessionId), false);

    const cookieLimpo = resposta.headers.get('set-cookie') || '';
    assert.match(cookieLimpo, /^sessionId=;/);
    assert.match(cookieLimpo, /(?:^|;\s*)Path=\/(?:;|$)/i);
    const expiracao = cookieLimpo.match(/Expires=([^;]+)/i);
    assert.ok(expiracao && Date.parse(expiracao[1]) < Date.now());

    const sessaoDepois = await requisitar('/api/session', { cookie });

    assert.equal(sessaoDepois.status, 401);

    assert.equal((await sessaoDepois.json()).authenticated, false);

    const apiDepois = await requisitar('/api/usuarios', { cookie });

    assert.equal(apiDepois.status, 401);

    const paginaDepois = await requisitar('/index.html', { cookie });

    assert.equal(paginaDepois.status, 302);
});

// expiração da sessão
test('sessão expirada é removida e não autoriza acesso', async () => {
    const { sessionId, cookie } = await loginComCookie();

    sessions.get(sessionId).expiresAt = Date.now() - 1000;

    const resposta = await requisitar('/api/session', { cookie });

    assert.equal(resposta.status, 401);

    assert.equal((await resposta.json()).authenticated, false);

    assert.equal(sessions.has(sessionId), false);

    const pagina = await requisitar('/index.html', { cookie });

    assert.equal(pagina.status, 302);
});

// aviso da expiração
test('sessão apresenta aviso nos últimos cinco minutos', async () => {
    const { sessionId, cookie } = await loginComCookie();

    assert.equal(SESSION_WARNING_MS, 5 * 60 * 1000);

    sessions.get(sessionId).expiresAt = Date.now() + 4 * 60 * 1000;

    const resposta = await requisitar('/api/session', { cookie });

    assert.equal(resposta.status, 200);

    const data = await resposta.json();

    assert.equal(data.authenticated, true);
    assert.equal(data.warning, true);

    assert.ok(data.expiresInMs > 0);

    assert.ok(data.expiresInMs <= SESSION_WARNING_MS);
});

// renovação da sessão

test('sessão válida pode ser renovada para 30 minutos', async () => {
    const { sessionId, cookie } = await loginComCookie();

    const session = sessions.get(sessionId);

    session.expiresAt = Date.now() + 60 * 1000;

    const expiracaoAnterior = session.expiresAt;

    const resposta = await requisitar('/api/session/renew', {
        metodo: 'POST',
        cookie,
    });

    assert.equal(resposta.status, 200);

    const data = await resposta.json();

    assert.equal(data.authenticated, true);
    assert.equal(data.warning, false);

    assert.equal(data.expiresInMs, SESSION_TIMEOUT_MS);

    assert.ok(sessions.get(sessionId).expiresAt > expiracaoAnterior);

    const sessaoRenovada = await requisitar('/api/session', { cookie });

    assert.equal(sessaoRenovada.status, 200);

    assert.equal((await sessaoRenovada.json()).warning, false);
});

test('sessão expirada não pode ser renovada', async () => {
    const { sessionId, cookie } = await loginComCookie();

    sessions.get(sessionId).expiresAt = Date.now() - 1000;

    const resposta = await requisitar('/api/session/renew', {
        metodo: 'POST',
        cookie,
    });

    assert.equal(resposta.status, 401);

    assert.equal((await resposta.json()).authenticated, false);

    assert.equal(sessions.has(sessionId), false);
});
