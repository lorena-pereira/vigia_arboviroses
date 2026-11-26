import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

// Carrega o .env da raiz, quando existir.
// No GitHub Actions, as variáveis já serão fornecidas pelo workflow.
dotenv.config({
    path: fileURLToPath(new URL('../../.env', import.meta.url)),
});

const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3307),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
});

try {
    // Cria todas as tabelas e relacionamentos do projeto.
    const schema = await readFile(
        new URL('../database/migrations/001_schema.sql', import.meta.url),
        'utf8'
    );

    const expectedTables = Array.from(
        schema.matchAll(/\bCREATE\s+TABLE\s+([A-Za-z_]\w*)/gi),
        (match) => match[1]
    );
    const [tableRows] = await connection.query(
        `SELECT TABLE_NAME AS tableName
         FROM information_schema.tables
         WHERE table_schema = DATABASE()`
    );
    const existingTables = new Set(tableRows.map((row) => row.tableName));

    if (existingTables.size === 0) {
        await connection.query(schema);
    } else {
        const missingTables = expectedTables.filter(
            (table) => !existingTables.has(table)
        );
        if (missingTables.length > 0) {
            throw new Error(
                `Schema incompleto; faltam tabelas: ${missingTables.join(', ')}.`
            );
        }
    }

    // Contas fictícias exclusivas para os testes automatizados.
    const usuarios = [
        {
            nome: 'Administrador de teste',
            email: 'admin-ci@example.test',
            perfil: 'ADMINISTRADOR',
            login: 'admin',
            senha: 'admin123',
        },
        {
            nome: 'Gestor de teste',
            email: 'gestor-ci@example.test',
            perfil: 'GESTOR',
            login: '111111',
            senha: '5678',
        },
        {
            nome: 'Técnico de teste',
            email: 'tecnico-ci@example.test',
            perfil: 'TECNICO',
            login: '1202255',
            senha: '1234',
        },
        {
            nome: 'Endemias de teste',
            email: 'endemias-ci@example.test',
            perfil: 'ENDEMIAS',
            login: '2202308',
            senha: '2202308',
        },
    ];

    for (const usuario of usuarios) {
        const senhaHash = await bcrypt.hash(usuario.senha, 10);
        const [existentes] = await connection.execute(
            `SELECT id, login, email
             FROM Usuario
             WHERE login = ? OR email = ?
             LIMIT 1`,
            [usuario.login, usuario.email]
        );

        if (existentes.length > 0) {
            const existente = existentes[0];
            if (
                existente.login !== usuario.login ||
                existente.email !== usuario.email
            ) {
                throw new Error(
                    `Conflito com conta existente ao preparar o usuário de teste ${usuario.login}.`
                );
            }
            await connection.execute(
                `UPDATE Usuario
                 SET nome = ?, perfil = ?, ativo = TRUE, senha_hash = ?,
                     deve_trocar_senha = FALSE
                 WHERE id = ?`,
                [usuario.nome, usuario.perfil, senhaHash, existente.id]
            );
        } else {
            await connection.execute(
                `INSERT INTO Usuario
                    (nome, email, perfil, ativo, login, senha_hash, deve_trocar_senha)
                 VALUES (?, ?, ?, TRUE, ?, ?, FALSE)`,
                [
                    usuario.nome,
                    usuario.email,
                    usuario.perfil,
                    usuario.login,
                    senhaHash,
                ]
            );
        }
    }

    console.log('Schema e usuários de teste preparados com sucesso.');
} finally {
    await connection.end();
}
