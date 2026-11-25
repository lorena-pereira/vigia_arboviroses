
import bcrypt from 'bcryptjs';
import { buscarUsuarioAtivo } from '../repositories/userRepository.js';

export const MAX_TENTATIVAS = 5;
export const MINUTOS_BLOQUEIO = 15;

// Controle de tentativas de login
export const tentativas = new Map();

// Converte os perfis do banco para os nomes usados pelo restante do sistema.
const PERFIS = {
    ADMINISTRADOR: 'admin',
    TECNICO: 'agente_vigilancia_epidemiologica',
    GESTOR: 'municipio',
    ENDEMIAS: 'agente_combate_endemias',
};

/**
 * Autentica o usuário utilizando MySQL e bcrypt.
 *
 * Resultado:
 * { ok: true, perfil, exigeTrocaSenha }
 * { ok: false, motivo: 'credenciais' }
 * { ok: false, motivo: 'bloqueado', minutosRestantes }
 */
export async function autenticar(usuario, senha) {
    const agora = Date.now();

    const estado = tentativas.get(usuario) || {
        falhas: 0,
        bloqueadoAte: 0,
    };

    // Verifica se o usuário está bloqueado.
    if (estado.bloqueadoAte > agora) {
        return {
            ok: false,
            motivo: 'bloqueado',
            minutosRestantes: Math.ceil(
                (estado.bloqueadoAte - agora) / 60000
            ),
        };
    }

    // Reinicia a contagem quando o bloqueio expira.
    if (estado.bloqueadoAte && estado.bloqueadoAte <= agora) {
        estado.falhas = 0;
        estado.bloqueadoAte = 0;
    }

    // Consulta o usuário ativo no MySQL.
    const user = await buscarUsuarioAtivo(usuario);

    // Compara a senha digitada com o hash armazenado.
    let senhaCorreta = false;

    if (user && user.senha_hash) {
        senhaCorreta = await bcrypt.compare(senha, user.senha_hash);
    }

    // Login válido.
    if (user && senhaCorreta) {
        tentativas.delete(usuario);

        return {
            ok: true,
            perfil: PERFIS[user.perfil] || user.perfil,
            exigeTrocaSenha: Boolean(user.deve_trocar_senha),
        };
    }

    // Login inválido: contabiliza a tentativa.
    estado.falhas += 1;

    if (estado.falhas >= MAX_TENTATIVAS) {
        estado.bloqueadoAte = agora + MINUTOS_BLOQUEIO * 60000;

        tentativas.set(usuario, estado);

        return {
            ok: false,
            motivo: 'bloqueado',
            minutosRestantes: MINUTOS_BLOQUEIO,
        };
    }

    tentativas.set(usuario, estado);

    return {
        ok: false,
        motivo: 'credenciais',
    };
}
