import assert from 'node:assert/strict';
import test from 'node:test';
import {
    DadosNotificacaoInvalidos,
    validarCaso,
    validarDadosNotificacao,
    validarDatasExame,
} from '../src/services/dadosNotificacao.js';

const notificacao = {
    numero_sinan: ' 000123 ',
    paciente_id: 1,
    agravo_id: 1,
    unidade_id: 1,
    data_notificacao: '2026-11-28',
    data_1_sintoma: '2026-11-27',
};

test('valida uma nova notificação e normaliza o número SINAN', () => {
    const { campos } = validarDadosNotificacao(notificacao);
    assert.equal(campos.numero_sinan, '000123');
    assert.throws(
        () =>
            validarDadosNotificacao({
                ...notificacao,
                data_notificacao: '2026-02-30',
            }),
        DadosNotificacaoInvalidos
    );
});

test('calcula o status com base na classificação e no critério', () => {
    const caso = { ...notificacao, agravo: 'Dengue' };
    assert.equal(validarCaso(caso), null);
    assert.equal(
        validarCaso({
            ...caso,
            classificacao_final: 'DENGUE_GRAVE',
            criterio_confirmacao: 'LABORATORIAL',
        }),
        'CONFIRMADO'
    );
    assert.equal(
        validarCaso({ ...caso, classificacao_final: 'DESCARTADO' }),
        'DESCARTADO'
    );
    assert.throws(
        () => validarCaso({ ...caso, classificacao_final: 'DENGUE_GRAVE' }),
        DadosNotificacaoInvalidos
    );
});

test('valida a ordem cronológica das datas de um exame', () => {
    const exame = {
        data_solicitacao: '2026-11-26',
        data_coleta: '2026-11-27',
        data_resultado: '2026-11-28',
    };
    assert.doesNotThrow(() => validarDatasExame(exame));
    assert.throws(
        () => validarDatasExame({ ...exame, data_resultado: '2026-11-26' }),
        DadosNotificacaoInvalidos
    );
});
