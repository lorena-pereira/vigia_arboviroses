import { db } from '../config/db.js';

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
