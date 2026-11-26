async function validarSessao() {
    try {
        const { response, data } = await window.apiFetch('/api/session', {
            redirectOn401: false,
        });

        if (!response.ok || !data.authenticated) {
            return null;
        }

        localStorage.setItem(
            'usuarioLogado',
            JSON.stringify({
                nome: data.user.nome,
                perfil: data.user.perfil,
            })
        );

        return {
            ...data.user,
            warning: Boolean(data.warning),
            expiresInMs: Number(data.expiresInMs || 0),
        };
    } catch (error) {
        console.error('Erro ao validar sessão:', error);
        return null;
    }
}

window.validarSessao = validarSessao;

async function inicializarAutenticacao() {
    if (
        window.location.pathname === '/' ||
        window.location.pathname.endsWith('/login.html')
    ) {
        return null;
    }

    const usuario = await validarSessao();

    if (!usuario) {
        localStorage.removeItem('usuarioLogado');
        window.location.replace('/html/login.html');
        return null;
    }

    window.addEventListener('pageshow', async (event) => {
        if (event.persisted && !(await validarSessao())) {
            localStorage.removeItem('usuarioLogado');
            window.location.replace('/html/login.html');
        }
    });

    return usuario;
}

window.inicializarAutenticacao = inicializarAutenticacao;
