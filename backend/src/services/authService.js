import fs from 'fs';

export const MAX_TENTATIVAS = 5;
export const MINUTOS_BLOQUEIO = 15;

const usersFilePath = new URL('../../data/users.json', import.meta.url);

// controle de tentativas em memoria: usuario -> { falhas, bloqueadoAte }
// (zera se o servidor for reiniciado; na proxima sprint pode ir para o BD)
export const tentativas = new Map();

function lerUsuarios() {
    return JSON.parse(fs.readFileSync(usersFilePath, 'utf-8'));
}

/**
 * Resultado possivel:
 *  { ok: true, perfil }
 *  { ok: false, motivo: 'credenciais' }
 *  { ok: false, motivo: 'bloqueado', minutosRestantes }
 */
export function autenticar(usuario, senha) {
    const agora = Date.now();
    const estado = tentativas.get(usuario) || { falhas: 0, bloqueadoAte: 0 };

    // 1) esta bloqueado?
    if (estado.bloqueadoAte > agora) {
        return {
            ok: false,
            motivo: 'bloqueado',
            minutosRestantes: Math.ceil((estado.bloqueadoAte - agora) / 60000)
        };
    }

    // bloqueio anterior expirou: recomeca a contagem
    if (estado.bloqueadoAte && estado.bloqueadoAte <= agora) {
        estado.falhas = 0;
        estado.bloqueadoAte = 0;
    }

    // 2) confere usuario e senha
    const user = lerUsuarios().find(u => u.user === usuario && u.password === senha);

    if (user) {
        tentativas.delete(usuario);
        return { ok: true, perfil: user.profile };
    }

    // 3) erro: conta a tentativa (vale tambem para usuario inexistente,
    //    assim nao da para descobrir quais usuarios existem)
    estado.falhas += 1;

    if (estado.falhas >= MAX_TENTATIVAS) {
        estado.bloqueadoAte = agora + MINUTOS_BLOQUEIO * 60000;
        tentativas.set(usuario, estado);
        return { ok: false, motivo: 'bloqueado', minutosRestantes: MINUTOS_BLOQUEIO };
    }

    tentativas.set(usuario, estado);
    return { ok: false, motivo: 'credenciais' };
}
