const MAX_ID = 4294967295;

export function inteiroPositivo(valor) {
    return Number.isInteger(valor) && valor > 0 && valor <= MAX_ID;
}

function dataValida(valor) {
    if (typeof valor !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(valor)) {
        return false;
    }
    const data = new Date(`${valor}T00:00:00Z`);
    return (
        !Number.isNaN(data.getTime()) &&
        data.toISOString().slice(0, 10) === valor
    );
}

const texto = (limite) => (valor) =>
    typeof valor === 'string' &&
    valor.trim().length > 0 &&
    Array.from(valor).length <= limite;
const opcoes = (lista) => (valor) => lista.split(' ').includes(valor);
const sinais = (valor) =>
    Array.isArray(valor) && valor.length <= 50 && valor.every(texto(100));

const camposObrigatorios = {
    numero_sinan: texto(30),
    paciente_id: inteiroPositivo,
    agravo_id: inteiroPositivo,
    unidade_id: inteiroPositivo,
    data_notificacao: dataValida,
};

const camposOpcionais = {
    data_1_sintoma: dataValida,
    data_investigacao: dataValida,
    data_encerramento: dataValida,
    uf: (valor) => typeof valor === 'string' && /^[A-Z]{2}$/.test(valor),
    municipio: texto(100),
    endereco_id: inteiroPositivo,
    unidade_acompanhamento_id: inteiroPositivo,
    hospitalizado: opcoes('SIM NAO IGNORADO'),
    gestante: opcoes(
        'PRIMEIRO_TRIMESTRE SEGUNDO_TRIMESTRE TERCEIRO_TRIMESTRE IDADE_GESTACIONAL_IGNORADA NAO NAO_SE_APLICA IGNORADO'
    ),
    escolaridade: opcoes(
        'ANALFABETO FUNDAMENTAL_1_A_4_INCOMPLETO FUNDAMENTAL_4_COMPLETO FUNDAMENTAL_5_A_8_INCOMPLETO FUNDAMENTAL_COMPLETO MEDIO_INCOMPLETO MEDIO_COMPLETO SUPERIOR_INCOMPLETO SUPERIOR_COMPLETO IGNORADO NAO_SE_APLICA'
    ),
    evolucao_caso: opcoes(
        'CURA OBITO_PELO_AGRAVO OBITO_POR_OUTRAS_CAUSAS OBITO_EM_INVESTIGACAO IGNORADO'
    ),
    classificacao_final: opcoes(
        'DESCARTADO DENGUE DENGUE_COM_SINAIS_DE_ALARME DENGUE_GRAVE CHIKUNGUNYA ZIKA'
    ),
    criterio_confirmacao: opcoes(
        'LABORATORIAL CLINICO_EPIDEMIOLOGICO EM_INVESTIGACAO'
    ),
    sinais_alarme: sinais,
    sinais_gravidade: sinais,
};

export const camposExame = {
    tipo_exame: opcoes(
        'NS1 SOROLOGIA_IGM RT_PCR ISOLAMENTO_VIRAL PRNT IMUNOHISTOQUIMICA HISTOPATOLOGIA OUTRO'
    ),
    data_solicitacao: dataValida,
    data_coleta: dataValida,
    data_resultado: dataValida,
    resultado: opcoes(
        'POSITIVO NEGATIVO REAGENTE NAO_REAGENTE INCONCLUSIVO NAO_REALIZADO'
    ),
    numero_requisicao_gal: texto(40),
    situacao_exame: opcoes(
        'SOLICITADO AGUARDANDO_COLETA EM_ANALISE CONCLUIDO CANCELADO'
    ),
    observacao: texto(16000),
};

export class DadosNotificacaoInvalidos extends Error {}

function objeto(valor) {
    return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}

function validarExames(exames) {
    if (!Array.isArray(exames) || exames.length > 100) {
        throw new DadosNotificacaoInvalidos(
            'Informe uma lista de até 100 exames.'
        );
    }
    const ids = new Set();
    for (const exame of exames) {
        if (!objeto(exame) || !camposExame.tipo_exame(exame.tipo_exame)) {
            throw new DadosNotificacaoInvalidos(
                'Informe um tipo válido para cada exame.'
            );
        }
        for (const [campo, valor] of Object.entries(exame)) {
            const valido =
                campo === 'id'
                    ? inteiroPositivo(valor) && !ids.has(valor)
                    : Object.hasOwn(camposExame, campo) &&
                      (valor === null || camposExame[campo](valor));
            if (!valido) {
                throw new DadosNotificacaoInvalidos(
                    `Campo de exame inválido: ${campo}.`
                );
            }
        }
        if (exame.id !== undefined) ids.add(exame.id);
    }
}

export function validarDadosNotificacao(dados, parcial = false) {
    if (!objeto(dados) || (parcial && Object.keys(dados).length === 0)) {
        throw new DadosNotificacaoInvalidos(
            'Informe os campos da notificação em um objeto.'
        );
    }
    const { exames, ...campos } = dados;
    for (const campo of [
        'status',
        'semana_epidemiologica',
        'ano_epidemiologico',
        'usuario_id',
    ]) {
        delete campos[campo];
    }
    if (parcial && Object.keys(campos).length === 0 && exames === undefined) {
        throw new DadosNotificacaoInvalidos(
            'Informe ao menos um campo editável.'
        );
    }
    if (typeof campos.numero_sinan === 'string')
        campos.numero_sinan = campos.numero_sinan.trim();
    for (const [campo, valor] of Object.entries(campos)) {
        if (
            Object.hasOwn(camposObrigatorios, campo) &&
            camposObrigatorios[campo](valor)
        )
            continue;
        if (
            Object.hasOwn(camposOpcionais, campo) &&
            (valor === null || camposOpcionais[campo](valor))
        )
            continue;
        throw new DadosNotificacaoInvalidos(
            `Campo de notificação inválido: ${campo}.`
        );
    }
    if (
        !parcial &&
        Object.keys(camposObrigatorios).some(
            (campo) => !Object.hasOwn(campos, campo)
        )
    ) {
        throw new DadosNotificacaoInvalidos(
            'Informe número SINAN, paciente, agravo, unidade e data da notificação.'
        );
    }
    if (exames !== undefined) validarExames(exames);
    return { campos, exames };
}

export function validarDatasExame(exame) {
    const datas = [
        exame.data_solicitacao,
        exame.data_coleta,
        exame.data_resultado,
    ].filter(Boolean);
    if (datas.some((data, i) => i > 0 && data < datas[i - 1])) {
        throw new DadosNotificacaoInvalidos(
            'As datas de solicitação, coleta e resultado do exame devem estar em ordem cronológica.'
        );
    }
}

export function validarCaso(caso) {
    if (caso.data_1_sintoma && caso.data_1_sintoma > caso.data_notificacao) {
        throw new DadosNotificacaoInvalidos(
            'Os primeiros sintomas devem ser anteriores ou iguais à data da notificação.'
        );
    }
    const datas = [
        caso.data_notificacao,
        caso.data_investigacao,
        caso.data_encerramento,
    ].filter(Boolean);
    if (datas.some((data, i) => i > 0 && data < datas[i - 1])) {
        throw new DadosNotificacaoInvalidos(
            'As datas de notificação, investigação e encerramento devem estar em ordem cronológica.'
        );
    }

    const agravo = caso.agravo.toUpperCase();
    const classificacao = caso.classificacao_final;
    const criterio = caso.criterio_confirmacao;
    const confirmado =
        criterio === 'LABORATORIAL' || criterio === 'CLINICO_EPIDEMIOLOGICO';
    const descartado = classificacao === 'DESCARTADO';
    const classificacoesDengue = [
        'DENGUE',
        'DENGUE_COM_SINAIS_DE_ALARME',
        'DENGUE_GRAVE',
    ];
    if (
        classificacao &&
        !descartado &&
        classificacao !== agravo &&
        !(agravo === 'DENGUE' && classificacoesDengue.includes(classificacao))
    ) {
        throw new DadosNotificacaoInvalidos(
            'A classificação final deve corresponder ao agravo da notificação.'
        );
    }
    if (
        confirmado !== Boolean(classificacao && !descartado) ||
        (descartado && criterio)
    ) {
        throw new DadosNotificacaoInvalidos(
            'Informe a classificação e o critério para confirmar um caso. Para descartar, use critério nulo.'
        );
    }
    if (
        agravo !== 'DENGUE' &&
        (caso.sinais_alarme?.length || caso.sinais_gravidade?.length)
    ) {
        throw new DadosNotificacaoInvalidos(
            'Os sinais de alarme e gravidade são registrados para dengue.'
        );
    }
    if (descartado) return 'DESCARTADO';
    return confirmado ? 'CONFIRMADO' : null;
}
