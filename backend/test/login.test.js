// Rode: npm test  (nao precisa de banco)
import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.js';
import { sessions } from '../src/sessionStore.js';
import { tentativas } from '../src/services/authService.js';

let server, base;
const post = (body) => fetch(base + '/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
}).then(async r => ({ status: r.status, data: await r.json() }));

before(() => { server = app.listen(0); base = `http://127.0.0.1:${server.address().port}`; });
after(() => server.close());
beforeEach(() => tentativas.clear());

const loginComCookie = async () => {
    const r = await fetch(base + '/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: 'admin', senha: 'admin123' })
    });

    const setCookie = r.headers.get('set-cookie') || '';
    const match = setCookie.match(/sessionId=([^;]+)/);
    assert.ok(match, 'Cookie de sessão não foi enviado no login.');

    return { status: r.status, data: await r.json(), sessionId: match[1] };
};

test('credenciais corretas -> 200, perfil e redirect ao dashboard', async () => {
    const r = await post({ usuario: 'admin', senha: 'admin123' });
    assert.equal(r.status, 200);
    assert.equal(r.data.profile, 'admin');
    assert.equal(r.data.redirect, '/index.html');
});

test('mensagem de erro e generica (usuario inexistente = senha errada)', async () => {
    const a = await post({ usuario: 'naoexiste', senha: 'x' });
    const b = await post({ usuario: 'admin', senha: 'errada' });
    assert.equal(a.status, 401);
    assert.equal(b.status, 401);
    assert.equal(a.data.message, b.data.message);
});

test('campos vazios -> 400', async () => {
    assert.equal((await post({ usuario: '', senha: '' })).status, 400);
});

test('bloqueia na 5a tentativa errada e recusa mesmo com a senha certa', async () => {
    for (let i = 1; i <= 4; i++) {
        assert.equal((await post({ usuario: 'admin', senha: 'errada' })).status, 401, `tentativa ${i}`);
    }
    const quinta = await post({ usuario: 'admin', senha: 'errada' });
    assert.equal(quinta.status, 429);
    assert.equal(quinta.data.bloqueado, true);
    assert.equal((await post({ usuario: 'admin', senha: 'admin123' })).status, 429);
});

test('apos os 15 min o bloqueio expira', async () => {
    for (let i = 0; i < 5; i++) await post({ usuario: 'admin', senha: 'errada' });
    tentativas.get('admin').bloqueadoAte = Date.now() - 1000; // simula 15 min depois
    assert.equal((await post({ usuario: 'admin', senha: 'admin123' })).status, 200);
    assert.equal(tentativas.has('admin'), false);
});

test('login certo no meio zera o contador', async () => {
    for (let i = 0; i < 4; i++) await post({ usuario: 'admin', senha: 'errada' });
    await post({ usuario: 'admin', senha: 'admin123' });
    for (let i = 0; i < 4; i++) assert.equal((await post({ usuario: 'admin', senha: 'errada' })).status, 401);
});

test('login cria sessão válida e endpoint de sessão aceita a requisição', async () => {
    const login = await loginComCookie();
    assert.equal(login.status, 200);

    const sessao = await fetch(base + '/api/session', {
        headers: { Cookie: `sessionId=${login.sessionId}` }
    });

    const data = await sessao.json();
    assert.equal(sessao.status, 200);
    assert.equal(data.authenticated, true);
    assert.equal(data.user.nome, 'admin');
    assert.equal(data.user.perfil, 'admin');
});

test('municipio nao pode acessar o dashboard pelo servidor', async () => {
    const login = await fetch(base + '/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: '111111', senha: '5678' })
    });

    const setCookie = login.headers.get('set-cookie') || '';
    const match = setCookie.match(/sessionId=([^;]+)/);
    assert.ok(match, 'Cookie de sessão não foi enviado para o perfil de município.');

    const resp = await fetch(base + '/index.html', {
        headers: { Cookie: `sessionId=${match[1]}` }
    });

    assert.equal(resp.status, 403);
    const data = await resp.json();
    assert.equal(data.accessDenied, true);
    assert.equal(data.perfil, 'municipio');
});

test('logout encerra a sessão e invalida a validação posterior', async () => {
    const login = await loginComCookie();

    const logout = await fetch(base + '/logout', {
        method: 'POST',
        headers: { Cookie: `sessionId=${login.sessionId}` }
    });

    const logoutData = await logout.json();
    assert.equal(logout.status, 200);
    assert.equal(logoutData.success, true);

    const sessaoDepois = await fetch(base + '/api/session', {
        headers: { Cookie: `sessionId=${login.sessionId}` }
    });

    assert.equal(sessaoDepois.status, 401);
    const data = await sessaoDepois.json();
    assert.equal(data.authenticated, false);
});

test('sessão expira automaticamente após 30 minutos', async () => {
    const login = await loginComCookie();
    const session = sessions.get(login.sessionId);
    assert.ok(session);
    assert.ok(session.expiresAt > Date.now());

    session.expiresAt = Date.now() - 1000;

    const resp = await fetch(base + '/api/session', {
        headers: { Cookie: `sessionId=${login.sessionId}` }
    });

    assert.equal(resp.status, 401);
    const data = await resp.json();
    assert.equal(data.authenticated, false);
    assert.equal(sessions.has(login.sessionId), false);
});

test('cookie antigo não autoriza acesso após logout', async () => {
    const login = await loginComCookie();
    const sessionId = login.sessionId;

    sessions.delete(sessionId);

    const resp = await fetch(base + '/api/session', {
        headers: { Cookie: `sessionId=${sessionId}` }
    });

    assert.equal(resp.status, 401);
    const data = await resp.json();
    assert.equal(data.authenticated, false);
    assert.equal(sessions.has(sessionId), false);
});
