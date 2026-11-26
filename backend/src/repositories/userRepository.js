import { db } from '../config/db.js';

const USER_COLUMNS = 'login, nome, email, perfil, ativo, deve_trocar_senha';

export async function listarUsuarios() {
    const [usuarios] = await db.execute(
        `SELECT ${USER_COLUMNS} FROM Usuario ORDER BY nome, login`
    );

    return usuarios;
}

export async function buscarUsuarioPorLogin(login) {
    const [usuarios] = await db.execute(
        `SELECT ${USER_COLUMNS} FROM Usuario WHERE login = ? LIMIT 1`,
        [login]
    );

    return usuarios[0] || null;
}

export async function buscarUsuarioAtivo(login) {
    const [usuarios] = await db.execute(
        `SELECT id, nome, login, senha_hash, perfil, ativo
         FROM Usuario
         WHERE login = ? AND ativo = TRUE
         LIMIT 1`,
        [login]
    );

    return usuarios[0] || null;
}

export async function criarUsuario(usuario) {
    return db.execute(
        `INSERT INTO Usuario
            (nome, email, perfil, ativo, login, senha_hash, deve_trocar_senha)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            usuario.nome,
            usuario.email,
            usuario.perfil,
            usuario.ativo,
            usuario.login,
            usuario.senhaHash,
            usuario.exigeTrocaSenha,
        ]
    );
}

export async function atualizarUsuario(login, campos) {
    const colunas = {
        nome: 'nome',
        email: 'email',
        perfil: 'perfil',
        ativo: 'ativo',
        exigeTrocaSenha: 'deve_trocar_senha',
        senhaHash: 'senha_hash',
    };
    const alteracoes = Object.entries(colunas).filter(([campo]) =>
        Object.hasOwn(campos, campo)
    );

    if (alteracoes.length === 0) return null;

    const definicoes = alteracoes.map(([, coluna]) => `${coluna} = ?`);
    const valores = alteracoes.map(([campo]) => campos[campo]);

    return db.execute(
        `UPDATE Usuario SET ${definicoes.join(', ')} WHERE login = ?`,
        [...valores, login]
    );
}
