// Testes da Subtask 8.2 — middleware de perfil.  Rode: npm test
import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { app } from '../server.js';
import { sessions } from '../src/sessionStore.js';
import { tentativas } from '../src/services/authService.js';
import { db } from '../src/config/db.js';
import {
    PERFIS,
    normalizarPerfil,
    requireRole,
    removerDadosPessoais,
} from '../src/middlewares/requireRole.js';

let server, base;

before(() => {
    server = app.listen(0);
    base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
    await new Promise((resolve, reject) => {
        server.close((error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });

    await db.end();
});
beforeEach(() => {
    tentativas.clear();
    sessions.clear();
});

// usuários do backend/data/users.json (um por perfil)
const CONTAS = {
    ADMINISTRADOR: { usuario: 'admin', senha: 'admin123' },
    GESTOR: { usuario: '111111', senha: '5678' },
    TECNICO: { usuario: '1202255', senha: '1234' },
    ENDEMIAS: { usuario: '2202308', senha: '2202308' },
};

const login = async (perfil) => {
    const r = await fetch(base + '/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(CONTAS[perfil]),
    });
    const m = (r.headers.get('set-cookie') || '').match(/sessionId=([^;]+)/);
    assert.ok(m, `login de ${perfil} falhou`);
    return `sessionId=${m[1]}`;
};

const get = (p, cookie) =>
    fetch(base + p, { headers: cookie ? { Cookie: cookie } : {} });

// Status esperado: 403 = barrado pelo perfil; 404 = rota ainda não existe;
// 200 = rota implementada e disponível para o Administrador.
const MATRIZ = {
    '/api/usuarios': {
        ADMINISTRADOR: 200,
        TECNICO: 403,
        GESTOR: 403,
        ENDEMIAS: 403,
    },
    '/api/pacientes': {
        ADMINISTRADOR: 403,
        TECNICO: 404,
        GESTOR: 403,
        ENDEMIAS: 403,
    },
};

for (const [rota, esperado] of Object.entries(MATRIZ)) {
    for (const [perfil, status] of Object.entries(esperado)) {
        test(`${perfil} em ${rota} -> ${status}`, async () => {
            const r = await get(rota, await login(perfil));
            assert.equal(r.status, status);
        });
    }
}

test('403 não devolve dados do recurso, só a mensagem', async () => {
    const r = await get('/api/pacientes', await login('GESTOR'));
    assert.equal(r.status, 403);
    assert.deepEqual(Object.keys(await r.json()).sort(), [
        'authenticated',
        'message',
    ]);
});

test('acesso direto à URL sem permissão: subcaminho, query e maiúsculas também são barrados', async () => {
    const gestor = await login('GESTOR');
    assert.equal((await get('/api/pacientes/1', gestor)).status, 403);
    assert.equal(
        (await get('/api/pacientes?cpf=12345678900', gestor)).status,
        403
    );
    assert.equal((await get('/API/PACIENTES', gestor)).status, 403);
    assert.equal(
        (await get('/api/usuarios/1', await login('TECNICO'))).status,
        403
    );
});

test('sem sessão continua 401 (requireAuth vem antes do requireRole)', async () => {
    assert.equal((await get('/api/pacientes')).status, 401);
    assert.equal((await get('/api/usuarios')).status, 401);
});

test('requireRole sem sessão no request responde 401', async () => {
    const mini = express();
    mini.get('/x', requireRole(PERFIS.TECNICO), (req, res) =>
        res.sendStatus(200)
    );
    const s = mini.listen(0);
    try {
        assert.equal(
            (await fetch(`http://127.0.0.1:${s.address().port}/x`)).status,
            401
        );
    } finally {
        s.close();
    }
});

test('requireRole recusa nome de perfil inválido ao configurar a rota', () => {
    assert.throws(() => requireRole('ADMIN'));
    assert.throws(() => requireRole());
});

test('normalizarPerfil aceita os nomes novos e os do users.json', () => {
    assert.equal(normalizarPerfil('TECNICO'), 'TECNICO');
    assert.equal(normalizarPerfil('admin'), 'ADMINISTRADOR');
    assert.equal(normalizarPerfil('municipio'), 'GESTOR');
    assert.equal(
        normalizarPerfil('agente_vigilancia_epidemiologica'),
        'TECNICO'
    );
    assert.equal(normalizarPerfil('agente_combate_endemias'), 'ENDEMIAS');
    assert.equal(normalizarPerfil('qualquer'), null);
});

test('removerDadosPessoais tira nome, CPF, telefone e afins, sem alterar o original', () => {
    const paciente = {
        id: 7,
        nome: 'Fulano',
        cpf: '12345678900',
        telefone: '77999999999',
        telefones: ['1'],
        cartao_sus: '123',
        nome_mae: 'Mae',
        data_nascimento: '2000-01-01',
        fk_Bairro_id: 3,
    };
    assert.deepEqual(removerDadosPessoais(paciente), {
        id: 7,
        fk_Bairro_id: 3,
    });
    assert.equal(paciente.nome, 'Fulano');
    assert.deepEqual(removerDadosPessoais([paciente, paciente]), [
        { id: 7, fk_Bairro_id: 3 },
        { id: 7, fk_Bairro_id: 3 },
    ]);
});
