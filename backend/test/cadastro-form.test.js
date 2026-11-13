import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync(new URL('../../frontend/html/cadastrar-paciente.html', import.meta.url), 'utf8');
const script = readFileSync(new URL('../../frontend/javascript/cadastrar-paciente.js', import.meta.url), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
async function setup(t, fetchImpl) {
    const dom = new JSDOM(html, { url: 'http://localhost/html/cadastrar-paciente.html', runScripts: 'outside-only' });
    t.after(() => dom.window.close());
    const { window } = dom;
    if (window.document.readyState === 'loading') await new Promise(resolve => window.document.addEventListener('DOMContentLoaded', resolve, { once: true }));
    const timers = new Map();
    let timerId = 0;
    window.setTimeout = callback => { timers.set(++timerId, callback); return timerId; };
    window.clearTimeout = id => timers.delete(id);
    window.fetch = fetchImpl;
    window.alert = () => assert.fail('Não deve abrir alert()');
    window.eval(script);
    window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
    const form = window.document.querySelector('form');
    for (const input of form.querySelectorAll('[required]')) {
        if (input.tagName === 'SELECT') input.value = [...input.options].find(option => option.value)?.value;
        else input.value = input.type === 'date' ? '2000-01-15' : 'Exemplo';
    }
    form.elements.cpf.value = '123.456.789-00';
    form.elements.numeroSus.value = '123 4567 8901 2345';
    form.elements.telefone.value = '(77) 99999-0000';
    form.elements.cep.value = '45000-000';
    const submit = () => form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    const feedback = () => window.document.getElementById('cadastro-feedback');
    return { window, form, submit, feedback, timers };
}

test('HTML referencia o script renomeado e remove o nome antigo', () => {
    assert.match(html, /javascript\/cadastrar-paciente\.js/);
    assert.doesNotMatch(html, /cadastrar-cliente\.js/);
    assert.equal(existsSync(new URL('../../frontend/javascript/cadastrar-cliente.js', import.meta.url)), false);
    assert.doesNotMatch(script, /\balert\s*\(/);
});

test('cadastro envia campos sem máscaras e mostra sucesso antes de limpar', async t => {
    let request;
    const ctx = await setup(t, async (url, options) => { request = { url, ...options }; return { ok: true, json: async () => ({ success: true }) }; });
    ctx.submit(); await tick();
    assert.equal(request.url, '/api/pacientes');
    assert.equal(request.method, 'POST');
    const body = JSON.parse(request.body);
    assert.equal(body.cpf, '12345678900');
    assert.equal(body.numeroSus, '123456789012345');
    assert.equal(body.telefone, '77999990000');
    assert.equal(body.cep, '45000000');
    assert.match(ctx.feedback().textContent, /cadastrado com sucesso/);
    assert.ok(ctx.feedback().querySelector('.cadastro-toast--success'));
    assert.equal(ctx.form.elements.nome.value, '');
    assert.equal(ctx.form.querySelector('[type=submit]').disabled, false);
});

test('erro da API preserva dados e renderiza mensagem como texto', async t => {
    const message = '<img src=x onerror="alert(1)">';
    const ctx = await setup(t, async () => ({ ok: false, json: async () => ({ message }) }));
    ctx.submit(); await tick();
    assert.equal(ctx.form.elements.nome.value, 'Exemplo');
    assert.ok(ctx.feedback().textContent.includes(message));
    assert.equal(ctx.feedback().querySelector('img'), null);
    assert.equal(ctx.form.hasAttribute('aria-busy'), false);
});

for (const mode of ['rede', 'JSON inválido']) test(`falha de ${mode} mantém dados e libera nova tentativa`, async t => {
    const ctx = await setup(t, async () => { if (mode === 'rede') throw new Error('offline'); return { ok: true, json: async () => { throw new Error('invalid JSON'); } }; });
    ctx.submit(); await tick();
    assert.match(ctx.feedback().textContent, /Não foi possível confirmar/);
    assert.equal(ctx.form.elements.nome.value, 'Exemplo');
    assert.equal(ctx.form.querySelector('[type=submit]').disabled, false);
});

test('bloqueia submissão duplicada enquanto o pedido está pendente', async t => {
    let resolveRequest; let calls = 0;
    const ctx = await setup(t, () => { calls++; return new Promise(resolve => { resolveRequest = resolve; }); });
    ctx.submit(); ctx.submit();
    assert.equal(calls, 1);
    assert.equal(ctx.form.querySelector('[type=submit]').disabled, true);
    resolveRequest({ ok: true, json: async () => ({ success: true }) }); await tick();
    assert.equal(ctx.form.querySelector('[type=submit]').disabled, false);
});

test('formulário inválido não envia requisição', async t => {
    let calls = 0;
    const ctx = await setup(t, async () => { calls++; });
    ctx.form.elements.nome.value = '';
    ctx.submit(); await tick();
    assert.equal(calls, 0);
});

test('toast acessível renova duração, expira e pode ser fechado', async t => {
    const ctx = await setup(t, async () => ({ ok: false, json: async () => ({ message: 'Tente novamente' }) }));
    ctx.submit(); await tick();
    const firstId = [...ctx.timers.keys()][0];
    ctx.submit(); await tick();
    assert.equal(ctx.timers.has(firstId), false);
    assert.equal(ctx.timers.size, 1);
    assert.equal(ctx.feedback().getAttribute('role'), 'status');
    assert.equal(ctx.feedback().getAttribute('aria-live'), 'polite');
    [...ctx.timers.values()][0]();
    assert.equal(ctx.feedback().children.length, 0);
    ctx.submit(); await tick();
    ctx.feedback().querySelector('button').click();
    assert.equal(ctx.feedback().children.length, 0);
});

for (const mode of ['não encontrado', 'HTTP', 'rede']) test(`CEP ${mode} mostra aviso e permite preenchimento manual`, async t => {
    const ctx = await setup(t, async () => {
        if (mode === 'rede') throw new Error('offline');
        return { ok: mode !== 'HTTP', json: async () => ({ erro: true }) };
    });
    ctx.form.elements.cep.dispatchEvent(new ctx.window.Event('blur')); await tick();
    assert.match(ctx.feedback().textContent, /manual/);
    assert.equal(ctx.form.elements.logradouro.value, 'Exemplo');
});
