import assert from 'node:assert/strict';
import { db } from '../src/config/db.js';

export { db };

// Contas fictícias, utilizadas exclusivamente nos testes.
export const CONTAS = {
    ADMINISTRADOR: {
        usuario: 'teste_76_admin',
        senha: 'SenhaTesteAdmin123',
    },
    TECNICO: {
        usuario: 'teste_76_tecnico',
        senha: 'SenhaTesteTecnico123',
    },
    GESTOR: {
        usuario: 'teste_76_gestor',
        senha: 'SenhaTesteGestor123',
    },
    ENDEMIAS: {
        usuario: 'teste_76_endemias',
        senha: 'SenhaTesteEndemias123',
    },
    INATIVO: {
        usuario: 'teste_76_inativo',
        senha: 'SenhaTesteInativo123',
    },
};

export function validarConfiguracaoBancoTeste() {
    const comando =
        'docker compose -f docker-compose.test.yml run --rm --build test';
    assert.equal(
        process.env.NODE_ENV,
        'test',
        `Use o ambiente de testes: ${comando}`
    );
    assert.equal(
        process.env.DB_NAME,
        'vigia_arboviroses_test',
        'Use o banco de testes.'
    );
    assert.equal(
        process.env.DB_USER,
        'vigia_test',
        'Use o usuário do banco de testes.'
    );
}

export async function validarBancoTeste(conexao = db) {
    validarConfiguracaoBancoTeste();

    const [[resultado]] = await conexao.query('SELECT DATABASE() AS banco');

    assert.equal(
        resultado.banco,
        'vigia_arboviroses_test',
        'A conexão deve utilizar exclusivamente o banco de testes.'
    );
}
