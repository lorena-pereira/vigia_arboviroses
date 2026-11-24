// Subtask 8.2 — middleware de perfil.
// Os nomes seguem a matriz de permissões e o ENUM Usuario.perfil.

export const PERFIS = Object.freeze({
    ADMINISTRADOR: 'ADMINISTRADOR',
    TECNICO: 'TECNICO',
    GESTOR: 'GESTOR',
    ENDEMIAS: 'ENDEMIAS',
});

const PERFIS_LEGADOS = Object.freeze({
    admin: PERFIS.ADMINISTRADOR,
    agente_vigilancia_epidemiologica: PERFIS.TECNICO,
    municipio: PERFIS.GESTOR,
    agente_combate_endemias: PERFIS.ENDEMIAS,
});

export function normalizarPerfil(perfil) {
    if (!perfil) return null;
    if (Object.values(PERFIS).includes(perfil)) return perfil;

    return PERFIS_LEGADOS[perfil] ?? null;
}

export function requireRole(...permitidos) {
    const invalidos = permitidos.filter(
        (p) => !Object.values(PERFIS).includes(p)
    );

    if (permitidos.length === 0 || invalidos.length > 0) {
        throw new Error(
            `requireRole: perfil inválido ${JSON.stringify(invalidos)}`
        );
    }

    return function verificarPerfil(req, res, next) {
        if (!req.session) {
            return res.status(401).json({
                authenticated: false,
                message: 'Sessão inválida ou expirada.',
            });
        }

        const perfil = normalizarPerfil(req.session.perfil);

        if (!perfil || !permitidos.includes(perfil)) {
            return res.status(403).json({
                authenticated: true,
                message: 'Acesso negado para este perfil.',
            });
        }

        req.perfil = perfil;
        return next();
    };
}

// Campos que identificam o paciente (RF30): só o Técnico pode recebê-los.
export const CAMPOS_PESSOAIS = Object.freeze([
    'nome',
    'cpf',
    'cartao_sus',
    'telefone',
    'telefones',
    'nome_mae',
    'data_nascimento',
]);

// Remove campos pessoais sem alterar o objeto original.
export function removerDadosPessoais(dados) {
    if (Array.isArray(dados)) return dados.map(removerDadosPessoais);
    if (!dados || typeof dados !== 'object') return dados;

    return Object.fromEntries(
        Object.entries(dados).filter(
            ([campo]) => !CAMPOS_PESSOAIS.includes(campo)
        )
    );
}
