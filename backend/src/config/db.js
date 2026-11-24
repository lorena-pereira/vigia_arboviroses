
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Carrega as variáveis do .env da raiz do projeto
dotenv.config({
    path: fileURLToPath(
        new URL('../../../.env', import.meta.url)
    ),
});

// Cria o pool de conexões com o MySQL
export const db = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3307),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Testa a conexão com o banco
export async function testarConexao() {
    const conexao = await db.getConnection();

    try {
        await conexao.query('SELECT 1');
        console.log('Conexão com MySQL realizada!');
    } finally {
        conexao.release();
    }
}
