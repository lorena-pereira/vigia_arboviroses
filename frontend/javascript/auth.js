async function validarSessao() {
    try {
        const response = await fetch('/api/session', {
            method: 'GET',
            credentials: 'same-origin'
        });

        const data = await response.json();

        if (!response.ok || !data.authenticated) {
            return null;
        }

        localStorage.setItem('usuarioLogado', JSON.stringify({
            nome: data.user.nome,
            perfil: data.user.perfil
        }));

        return {
            ...data.user,
            warning: Boolean(data.warning),
            expiresInMs: Number(data.expiresInMs || 0)
        };
    } catch (error) {
        console.error('Erro ao validar sessão:', error);
        return null;
    }
}

window.validarSessao = validarSessao;

async function inicializarAutenticacao() {
    if (window.location.pathname.endsWith('/login.html')) {
        return;
    }

    const usuario = await validarSessao();

    if (!usuario) {
        localStorage.removeItem('usuarioLogado');
        window.location.replace('../html/login.html');
    }

    window.addEventListener('pageshow', async (event) => {
        if (event.persisted && !(await validarSessao())) {
            localStorage.removeItem('usuarioLogado');
            window.location.replace('../html/login.html');
        }
    });
}