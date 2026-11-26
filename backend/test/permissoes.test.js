import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.js';
import { sessions } from '../src/sessionStore.js';
import { CONTAS, db, validarBancoTeste } from '../test-support/mysql-test.js';

let server;
let base;

const perfisSemGestao = ['TECNICO', 'GESTOR', 'ENDEMIAS'];
const perfisSemPacientes = ['ADMINISTRADOR', 'GESTOR', 'ENDEMIAS'];
const perfis = ['ADMINISTRADOR', ...perfisSemGestao];
const cookies = new Map();
const usuarioAlvo = `/api/usuarios/${CONTAS.TECNICO.usuario}`;

const rotasUsuarios = [
    ['GET', '/api/usuarios'],
    ['HEAD', '/api/usuarios'],
    ['GET', usuarioAlvo],
    ['HEAD', usuarioAlvo],
    [
        'POST',
        '/api/usuarios',
        {
            usuario: 'tentativa_permissao',
            nome: 'Conta fictícia',
            email: 'tentativa_permissao@example.invalid',
            senha: 'SenhaFicticia123',
            perfil: 'ADMINISTRADOR',
        },
    ],
    ['PUT', usuarioAlvo, { nome: 'Nome fictício atualizado' }],
    ['PATCH', usuarioAlvo, { nome: 'Nome fictício atualizado' }],
    ['PATCH', `${usuarioAlvo}/ativar`],
    ['PATCH', `${usuarioAlvo}/desativar`],
    ['PATCH', `${usuarioAlvo}/perfil`, { perfil: 'ADMINISTRADOR' }],
    ['POST', `${usuarioAlvo}/redefinir-senha`, { senha: 'SenhaTemporaria123' }],
    [
        'PATCH',
        `${usuarioAlvo}/redefinir-senha`,
        { senha: 'SenhaTemporaria123' },
    ],
    ['DELETE', usuarioAlvo],
];

const rotasPacientes = [
    ['GET', '/api/pacientes'],
    ['GET', '/api/pacientes?cpf=00000000000'],
    ['GET', '/api/pacientes/1'],
    ['POST', '/api/pacientes', { nome: 'Paciente fictício' }],
];

before(async () => {
    await validarBancoTeste();
    await new Promise((resolve) => {
        server = app.listen(0, '127.0.0.1', resolve);
    });
    base = `http://127.0.0.1:${server.address().port}`;

    for (const perfil of perfis) {
        const resposta = await requisitar('POST', '/login', {
            body: CONTAS[perfil],
        });
        assert.equal(resposta.status, 200, `Login de ${perfil}`);
        await resposta.json();
        const cookie = resposta.headers
            .get('set-cookie')
            ?.match(/^sessionId=[^;]+/);
        assert.ok(cookie, `Login de ${perfil} deve criar uma sessão`);
        cookies.set(perfil, cookie[0]);
    }
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
        await db.end();
    }
});

function requisitar(metodo, rota, { perfil, body } = {}) {
    const headers = {};
    if (perfil) headers.Cookie = cookies.get(perfil);
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    return fetch(base + rota, {
        method: metodo,
        headers,
        body: JSON.stringify(body),
        redirect: 'manual',
    });
}

async function verificarBloqueio(perfil, metodo, rota, body) {
    const resposta = await requisitar(metodo, rota, { perfil, body });

    assert.equal(resposta.status, 403);

    assert.match(
        resposta.headers.get('content-type') || '',
        /application\/json/
    );

    if (metodo === 'HEAD') {
        assert.equal(await resposta.text(), '');
        return;
    }

    assert.deepEqual(await resposta.json(), {
        authenticated: true,
        message: 'Acesso negado para este perfil.',
    });
}

for (const perfil of perfisSemGestao) {
    for (const [metodo, rota, body] of rotasUsuarios) {
        test(`${perfil}: ${metodo} ${rota} -> 403`, async () => {
            await verificarBloqueio(perfil, metodo, rota, body);
        });
    }
}

for (const perfil of perfisSemPacientes) {
    for (const [metodo, rota, body] of rotasPacientes) {
        test(`${perfil}: ${metodo} ${rota} -> 403`, async () => {
            await verificarBloqueio(perfil, metodo, rota, body);
        });
    }
}

test('ADMINISTRADOR recebe 404 ao tentar excluir uma conta existente', async () => {
    const admin = { perfil: 'ADMINISTRADOR' };
    const exclusao = await requisitar('DELETE', usuarioAlvo, admin);
    assert.equal(exclusao.status, 404);
    await exclusao.text();

    const consulta = await requisitar('GET', usuarioAlvo, admin);
    assert.equal(consulta.status, 200);
    const { user } = await consulta.json();
    assert.equal(user.usuario, CONTAS.TECNICO.usuario);
    assert.deepEqual(Object.keys(user).sort(), [
        'ativo',
        'email',
        'exigeTrocaSenha',
        'nome',
        'perfil',
        'usuario',
    ]);
});

for (const perfil of perfis) {
    test(`${perfil}: pode acessar a troca da própria senha`, async () => {
        const resposta = await requisitar(
            'POST',
            '/api/usuarios/trocar-senha',
            {
                perfil,
                body: { senhaAtual: CONTAS[perfil].senha, novaSenha: 'curta' },
            }
        );
        assert.equal(resposta.status, 400);
        assert.deepEqual(await resposta.json(), {
            success: false,
            message: 'A nova senha deve ter pelo menos 8 caracteres.',
        });
    });
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
