import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { app } from '../server.js';
import { SESSION_TIMEOUT_MS, sessions } from '../src/sessionStore.js';
import { db } from '../src/config/db.js';

let server;
let base;
const usuariosCriados = new Set();
const sessoesCriadas = new Set();

const criarSessao = (usuario, perfil) => {
    const id = randomUUID();
    const agora = Date.now();
    sessions.set(id, {
        usuario,
        perfil,
        createdAt: agora,
        expiresAt: agora + SESSION_TIMEOUT_MS,
    });
    sessoesCriadas.add(id);
    return `sessionId=${id}`;
};

let cookieAdmin;

before(async () => {
    await new Promise((resolve) => {
        server = app.listen(0, '127.0.0.1', resolve);
    });
    base = `http://127.0.0.1:${server.address().port}`;
    cookieAdmin = criarSessao('admin_teste_crud', 'ADMINISTRADOR');
});

after(async () => {
    for (const usuario of usuariosCriados) {
        await db.execute('DELETE FROM Usuario WHERE login = ?', [usuario]);
    }
    for (const sessao of sessoesCriadas) sessions.delete(sessao);
    await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
    });
    await db.end();
});

async function requisitar(caminho, { method = 'GET', body, cookie } = {}) {
    const headers = { Cookie: cookie || cookieAdmin };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    return fetch(base + caminho, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
    });
}

async function criarUsuarioFixture({
    senha = 'SenhaInicial1!',
    exigeTrocaSenha = false,
} = {}) {
    const login = `crud_${randomUUID().replaceAll('-', '')}`;
    const email = `${login}@example.test`;
    const senhaHash = await bcrypt.hash(senha, 10);
    await db.execute(
        `INSERT INTO Usuario
            (nome, email, perfil, ativo, login, senha_hash, deve_trocar_senha)
         VALUES (?, ?, 'TECNICO', TRUE, ?, ?, ?)`,
        [`Usuário ${login}`, email, login, senhaHash, exigeTrocaSenha]
    );
    usuariosCriados.add(login);
    return { login, email, senha };
}

const semCredenciais = (objeto) => {
    assert.equal(Object.hasOwn(objeto, 'senha_hash'), false);
    assert.equal(Object.hasOwn(objeto, 'password'), false);
    assert.equal(Object.hasOwn(objeto, 'senha'), false);
};

test('cria, lista e consulta usuários sem expor senha ou hash', async () => {
    const usuario = `crud_${randomUUID().replaceAll('-', '')}`;
    const email = `${usuario}@example.test`;
    const senha = 'SenhaSegura1!';
    const criado = await requisitar('/api/usuarios', {
        method: 'POST',
        body: {
            usuario,
            nome: 'Operador de teste',
            email,
            senha,
            perfil: 'TECNICO',
            ativo: true,
            exigeTrocaSenha: true,
        },
    });
    usuariosCriados.add(usuario);

    assert.equal(criado.status, 201);
    assert.deepEqual(await criado.json(), { success: true });

    const [rows] = await db.execute(
        'SELECT senha_hash, deve_trocar_senha FROM Usuario WHERE login = ?',
        [usuario]
    );
    assert.equal(rows.length, 1);
    assert.notEqual(rows[0].senha_hash, senha);
    assert.equal(await bcrypt.compare(senha, rows[0].senha_hash), true);
    assert.equal(Boolean(rows[0].deve_trocar_senha), true);

    const listaResponse = await requisitar('/api/usuarios');
    assert.equal(listaResponse.status, 200);
    const lista = await listaResponse.json();
    const usuarioDaLista = lista.users.find((item) => item.usuario === usuario);
    assert.ok(usuarioDaLista);
    assert.deepEqual(Object.keys(usuarioDaLista).sort(), [
        'ativo',
        'email',
        'exigeTrocaSenha',
        'nome',
        'perfil',
        'usuario',
    ]);
    semCredenciais(usuarioDaLista);

    const detalheResponse = await requisitar(
        `/api/usuarios/${encodeURIComponent(usuario)}`
    );
    assert.equal(detalheResponse.status, 200);
    const detalhe = await detalheResponse.json();
    assert.equal(detalhe.user.usuario, usuario);
    semCredenciais(detalhe.user);
});

test('rejeita dados fora dos limites e valores aceitos pelo schema', async () => {
    const payload = {
        usuario: 'login_teste',
        nome: 'Nome de teste',
        email: 'teste@example.test',
        senha: 'SenhaValida1!',
        perfil: 'TECNICO',
    };
    const casosInvalidos = [
        { ...payload, usuario: 'x'.repeat(51) },
        { ...payload, nome: 'x'.repeat(151) },
        { ...payload, email: 'x'.repeat(250) + '@a.test' },
        { ...payload, email: 'email-invalido' },
        { ...payload, senha: 'curta' },
        { ...payload, perfil: 'PERFIL_INVALIDO' },
        { ...payload, ativo: 'true' },
    ];

    for (const body of casosInvalidos) {
        const response = await requisitar('/api/usuarios', {
            method: 'POST',
            body,
        });
        assert.equal(response.status, 400);
    }
});

test('retorna conflito para login ou e-mail duplicado', async () => {
    const usuario = await criarUsuarioFixture();
    const loginDuplicado = await requisitar('/api/usuarios', {
        method: 'POST',
        body: {
            usuario: usuario.login,
            nome: 'Outro nome',
            email: `outro_${usuario.email}`,
            senha: 'SenhaValida1!',
            perfil: 'GESTOR',
        },
    });
    assert.equal(loginDuplicado.status, 409);

    const emailDuplicado = await requisitar('/api/usuarios', {
        method: 'POST',
        body: {
            usuario: `outro_${usuario.login}`,
            nome: 'Outro nome',
            email: usuario.email,
            senha: 'SenhaValida1!',
            perfil: 'GESTOR',
        },
    });
    assert.equal(emailDuplicado.status, 409);
});

test('edita dados, perfil e status do usuário', async () => {
    const usuario = await criarUsuarioFixture();
    const emailNovo = `atualizado_${usuario.email}`;
    const atualizado = await requisitar(
        `/api/usuarios/${encodeURIComponent(usuario.login)}`,
        {
            method: 'PUT',
            body: {
                nome: 'Nome atualizado',
                email: emailNovo,
                perfil: 'GESTOR',
                ativo: false,
                exigeTrocaSenha: true,
            },
        }
    );
    assert.equal(atualizado.status, 200);

    const desativado = await requisitar(
        `/api/usuarios/${encodeURIComponent(usuario.login)}/desativar`,
        { method: 'PATCH' }
    );
    assert.equal(desativado.status, 200);

    const ativado = await requisitar(
        `/api/usuarios/${encodeURIComponent(usuario.login)}/ativar`,
        { method: 'PATCH' }
    );
    assert.equal(ativado.status, 200);

    const perfil = await requisitar(
        `/api/usuarios/${encodeURIComponent(usuario.login)}/perfil`,
        { method: 'PATCH', body: { perfil: 'ENDEMIAS' } }
    );
    assert.equal(perfil.status, 200);

    const detalheResponse = await requisitar(
        `/api/usuarios/${encodeURIComponent(usuario.login)}`
    );
    const detalhe = await detalheResponse.json();
    assert.equal(detalheResponse.status, 200);
    assert.deepEqual(detalhe.user, {
        usuario: usuario.login,
        nome: 'Nome atualizado',
        email: emailNovo,
        perfil: 'ENDEMIAS',
        ativo: true,
        exigeTrocaSenha: true,
    });
});

test('redefine senha com hash e permite ao próprio usuário trocá-la', async () => {
    const usuario = await criarUsuarioFixture({
        senha: 'SenhaInicial1!',
        exigeTrocaSenha: true,
    });
    const senhaTemporaria = 'SenhaTemporaria1!';
    const redefinida = await requisitar(
        `/api/usuarios/${encodeURIComponent(usuario.login)}/redefinir-senha`,
        {
            method: 'POST',
            body: { senha: senhaTemporaria },
        }
    );
    assert.equal(redefinida.status, 200);
    semCredenciais(await redefinida.json());

    const cookieUsuario = criarSessao(usuario.login, 'TECNICO');
    const senhaNova = 'SenhaNovaSegura1!';
    const trocada = await requisitar('/api/usuarios/trocar-senha', {
        method: 'POST',
        cookie: cookieUsuario,
        body: { senhaAtual: senhaTemporaria, novaSenha: senhaNova },
    });
    assert.equal(trocada.status, 200);

    const [rows] = await db.execute(
        'SELECT senha_hash, deve_trocar_senha FROM Usuario WHERE login = ?',
        [usuario.login]
    );
    assert.equal(
        await bcrypt.compare(senhaTemporaria, rows[0].senha_hash),
        false
    );
    assert.equal(await bcrypt.compare(senhaNova, rows[0].senha_hash), true);
    assert.equal(Boolean(rows[0].deve_trocar_senha), false);
});

test('recusa senha atual inválida e nova senha curta', async () => {
    const usuario = await criarUsuarioFixture();
    const cookieUsuario = criarSessao(usuario.login, 'TECNICO');

    const senhaAtualInvalida = await requisitar('/api/usuarios/trocar-senha', {
        method: 'POST',
        cookie: cookieUsuario,
        body: { senhaAtual: 'incorreta', novaSenha: 'SenhaNova1!' },
    });
    assert.equal(senhaAtualInvalida.status, 401);

    const senhaCurta = await requisitar('/api/usuarios/trocar-senha', {
        method: 'POST',
        cookie: cookieUsuario,
        body: { senhaAtual: usuario.senha, novaSenha: 'curta' },
    });
    assert.equal(senhaCurta.status, 400);
});
