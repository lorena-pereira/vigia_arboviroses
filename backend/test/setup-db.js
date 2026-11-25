import { readFile, readdir } from 'node:fs/promises';
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
    // Executa todas as migracoes SQL em ordem.
    const migrationsDir = new URL('../database/migrations/', import.meta.url);

    const migrations = (await readdir(migrationsDir))
        .filter((file) => file.endsWith('.sql'))
        .sort();

    for (const migration of migrations) {
        const sql = await readFile(new URL(migration, migrationsDir), 'utf8');

        await connection.query(sql);

        console.log(`Migracao executada: ${migration}`);
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

    console.log('Schema e usuários de teste preparados com sucesso.');
} finally {
    await connection.end();
}
