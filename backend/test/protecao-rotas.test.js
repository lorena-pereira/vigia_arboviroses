// Testes da Subtask 7.3 — proteção de rotas e páginas.  Rode: npm test
import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { app } from '../server.js';
import { sessions } from '../src/sessionStore.js';
import { tentativas } from '../src/services/authService.js';
import { requireAuth } from '../src/middlewares/requireAuth.js';
import { db, CONTAS, validarBancoTeste } from '../test-support/mysql-test.js';
let server, base;

before(async () => {
    await validarBancoTeste();

    await new Promise((resolve) => {
        server = app.listen(0, '127.0.0.1', resolve);
    });

    base = `http://127.0.0.1:${server.address().port}`;
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
beforeEach(() => {
    tentativas.clear();
    sessions.clear();
});

const get = (p, cookie) =>
    fetch(base + p, {
        redirect: 'manual',
        headers: cookie ? { Cookie: cookie } : {},
    });

const login = async () => {
    const r = await fetch(base + '/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(CONTAS.ADMINISTRADOR),
    });

    assert.equal(r.status, 200);

    const m = (r.headers.get('set-cookie') || '').match(/sessionId=([^;]+)/);

    assert.ok(m, 'Login não devolveu cookie de sessão');

    return `sessionId=${m[1]}`;
};

// ---------- sem sessão ----------

test('sem sessão: página interna acessada direto pelo caminho real redireciona ao login', async () => {
    const r = await get('/html/index.html');
    assert.equal(r.status, 302);
    assert.equal(r.headers.get('location'), '/');
});

test('sem sessão: atalho /index.html redireciona ao login', async () => {
    const r = await get('/index.html');
    assert.equal(r.status, 302);
    assert.equal(r.headers.get('location'), '/');
});

test('sem sessão: páginas de gestão de usuários redirecionam ao login', async () => {
    for (const rota of [
        '/usuarios.html',
        '/cadastrar-usuario.html',
        '/editar-usuario.html',
    ]) {
        const resposta = await get(rota);
        assert.equal(resposta.status, 302, rota);
        assert.equal(resposta.headers.get('location'), '/', rota);
    }
});

test('sem sessão: qualquer rota /api/* responde 401 em JSON', async () => {
    const r = await get('/api/pacientes');
    assert.equal(r.status, 401);
    const body = await r.json();
    assert.equal(body.authenticated, false);
});

test('cookie com sessão inexistente é tratado como sem sessão', async () => {
    assert.equal(
        (await get('/html/index.html', 'sessionId=falso')).status,
        302
    );
    assert.equal((await get('/api/pacientes', 'sessionId=falso')).status, 401);
});

test('sessão expirada é recusada', async () => {
    const cookie = await login();
    const id = cookie.split('=')[1];
    sessions.get(id).expiresAt = Date.now() - 1;
    assert.equal((await get('/api/pacientes', cookie)).status, 401);
    assert.equal((await get('/html/index.html', cookie)).status, 302);
});

// ---------- exceções públicas ----------

test('páginas e arquivos públicos continuam acessíveis sem login', async () => {
    assert.equal((await get('/')).status, 200);
    assert.equal((await get('/html/login.html')).status, 200);
    assert.equal((await get('/css/login.css')).status, 200);
    assert.equal((await get('/javascript/login.js')).status, 200);
});

test('/api/session sem login continua respondendo 401 próprio (usado pelo front)', async () => {
    const r = await get('/api/session');
    assert.equal(r.status, 401);
    assert.equal((await r.json()).authenticated, false);
});

// ---------- com sessão ----------

test('com sessão: página interna é entregue', async () => {
    const cookie = await login();
    assert.equal((await get('/html/index.html', cookie)).status, 200);
    assert.equal((await get('/index.html', cookie)).status, 200);
});

test('com sessão: atalhos para as páginas de gestão de usuários funcionam', async () => {
    const cookie = await login();
    for (const rota of [
        '/usuarios.html',
        '/cadastrar-usuario.html',
        '/editar-usuario.html',
    ]) {
        assert.equal((await get(rota, cookie)).status, 200, rota);
    }
});

test('com sessão: requireAuth deixa passar e expõe req.session', async () => {
    // app de teste isolado, para não depender de rotas /api que ainda não existem
    const mini = express();
    mini.get('/api/eu', requireAuth, (req, res) =>
        res.json({ perfil: req.session.perfil })
    );
    const s = mini.listen(0);
    try {
        const cookie = await login();
        const sessionId = cookie.split('=')[1];
        const r = await fetch(`http://127.0.0.1:${s.address().port}/api/eu`, {
            headers: { Cookie: cookie },
        });
        assert.equal(r.status, 200);
        assert.equal((await r.json()).perfil, sessions.get(sessionId).perfil);

        const semLogin = await fetch(
            `http://127.0.0.1:${s.address().port}/api/eu`
        );
        assert.equal(semLogin.status, 401);
    } finally {
        s.close();
    }
});
