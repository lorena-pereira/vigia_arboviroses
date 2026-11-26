import { readFile } from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import {
    CONTAS,
    validarBancoTeste,
    validarConfiguracaoBancoTeste,
} from '../test-support/mysql-test.js';

validarConfiguracaoBancoTeste();

const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3307),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
});

try {
    await validarBancoTeste(connection);

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

    for (const [tipo, { usuario: login, senha }] of Object.entries(CONTAS)) {
        const nome = `Usuário de teste ${tipo}`;
        const email = `${login}@example.invalid`;
        const ativo = tipo !== 'INATIVO';
        const perfil = ativo ? tipo : 'ADMINISTRADOR';
        const senhaHash = await bcrypt.hash(senha, 10);
        const [existentes] = await connection.execute(
            'SELECT id, login, email FROM Usuario WHERE login = ? OR email = ?',
            [login, email]
        );

        if (existentes.length > 0) {
            const existente = existentes[0];
            if (
                existentes.length !== 1 ||
                existente.login !== login ||
                existente.email !== email
            ) {
                throw new Error(
                    `Conflito com conta existente ao preparar o usuário de teste ${login}.`
                );
            }
            await connection.execute(
                `UPDATE Usuario
                 SET nome = ?, perfil = ?, ativo = ?, senha_hash = ?,
                     deve_trocar_senha = FALSE
                 WHERE id = ?`,
                [nome, perfil, ativo, senhaHash, existente.id]
            );
        } else {
            await connection.execute(
                `INSERT INTO Usuario
                    (nome, email, perfil, ativo, login, senha_hash, deve_trocar_senha)
                 VALUES (?, ?, ?, ?, ?, ?, FALSE)`,
                [nome, email, perfil, ativo, login, senhaHash]
            );
        }
    }

    console.log('Schema e usuários de teste preparados com sucesso.');
} finally {
    await connection.end();
}
