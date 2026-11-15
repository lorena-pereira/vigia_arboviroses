// Subtask 8.2 — middleware de perfil.
// Os nomes seguem a matriz de permissões (config/permissoes_vigia_arboviroses.json)
// e o ENUM Usuario.perfil do 001_schema.sql.
export const PERFIS = Object.freeze({
    ADMINISTRADOR: 'ADMINISTRADOR',
    TECNICO: 'TECNICO',
    GESTOR: 'GESTOR',
    ENDEMIAS: 'ENDEMIAS'
});

// Nomes usados pelo users.json enquanto o login ainda não lê do banco (7.1).
// Quando o login passar a usar a tabela Usuario, este mapa pode ser removido.
const PERFIS_LEGADOS = Object.freeze({
    admin: PERFIS.ADMINISTRADOR,
    agente_vigilancia_epidemiologica: PERFIS.TECNICO,
    municipio: PERFIS.GESTOR,
    agente_combate_endemias: PERFIS.ENDEMIAS
});

export function normalizarPerfil(perfil) {
    if (!perfil) return null;
    if (Object.values(PERFIS).includes(perfil)) return perfil;
    return PERFIS_LEGADOS[perfil] ?? null;
}

// Uso: router.get('/api/usuarios', requireRole('ADMINISTRADOR'), handler)
// Deve vir depois do requireAuth (7.3), que preenche req.session.
export function requireRole(...permitidos) {
    const invalidos = permitidos.filter(p => !Object.values(PERFIS).includes(p));
    if (permitidos.length === 0 || invalidos.length > 0) {
        // erro de programação: falha ao subir o servidor, e não em produção
        throw new Error(`requireRole: perfil inválido ${JSON.stringify(invalidos)}`);
    }

    return function verificarPerfil(req, res, next) {
        if (!req.session) {
            return res.status(401).json({ authenticated: false, message: 'Sessão inválida ou expirada.' });
        }

        const perfil = normalizarPerfil(req.session.perfil);

        if (!perfil || !permitidos.includes(perfil)) {
            // resposta mínima: não revela nada sobre o recurso
            return res.status(403).json({ authenticated: true, message: 'Acesso negado para este perfil.' });
        }

        req.perfil = perfil;
        return next();
    };
}

// Campos que identificam o paciente (RF30): só o Técnico pode recebê-los.
export const CAMPOS_PESSOAIS = Object.freeze([
    'nome', 'cpf', 'cartao_sus', 'telefone', 'telefones', 'nome_mae', 'data_nascimento'
]);

// Remove os campos pessoais de um objeto ou lista, para respostas a perfis
// que só podem ver dados agregados (ex.: Gestor). Não altera o original.
export function removerDadosPessoais(dados) {
    if (Array.isArray(dados)) return dados.map(removerDadosPessoais);
    if (!dados || typeof dados !== 'object') return dados;

    return Object.fromEntries(
        Object.entries(dados).filter(([campo]) => !CAMPOS_PESSOAIS.includes(campo))
    );
}
