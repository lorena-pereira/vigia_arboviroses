// Rode: npm test  (nao precisa de banco)
import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.js';
import { tentativas } from '../src/services/authService.js';

let server, base;
const post = (body) => fetch(base + '/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
}).then(async r => ({ status: r.status, data: await r.json() }));

before(() => { server = app.listen(0); base = `http://127.0.0.1:${server.address().port}`; });
after(() => server.close());
beforeEach(() => tentativas.clear());

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
