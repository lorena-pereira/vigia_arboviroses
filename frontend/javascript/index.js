document.addEventListener('DOMContentLoaded', async () => {
    const usuarioLogado = JSON.parse(
        localStorage.getItem('usuarioLogado') || 'null'
    );

    const perfilLabels = {
        admin: 'Administrador',
        municipio: 'Município',
        agente_vigilancia_epidemiologica: 'Agente de Vigilância Epidemiológica',
        agente_combate_endemias: 'Agente de Combate às Endemias',
    };

    const formatarUsuarioTopo = (dadosUsuario) => {
        const perfil = dadosUsuario?.perfil;
        const nome = String(
            dadosUsuario?.nome || dadosUsuario?.user || ''
        ).trim();
        const cargo = perfilLabels[perfil] || 'Equipe Técnica';

        if (perfil === 'municipio') {
            return { nome: nome || 'Município', cargo };
        }

        if (perfil === 'agente_vigilancia_epidemiologica') {
            return { nome: nome || '1202255', cargo };
        }

        if (perfil === 'agente_combate_endemias') {
            return { nome: nome || '2202308', cargo };
        }

        return { nome: nome || 'Administrador', cargo };
    };

    const atualizarUsuarioTopo = (dadosUsuario) => {
        if (!dadosUsuario) return;

        const { nome, cargo } = formatarUsuarioTopo(dadosUsuario);
        const nameElement = document.getElementById('user-name');
        const roleElement = document.getElementById('user-role');

        if (nameElement) nameElement.textContent = nome;
        if (roleElement) roleElement.textContent = cargo;
    };

    if (usuarioLogado) {
        atualizarUsuarioTopo(usuarioLogado);
    }

    const sessaoValida = await window.inicializarAutenticacao();

    if (!sessaoValida) return;

    atualizarUsuarioTopo(sessaoValida);

    let sessionExpirationAt =
        Date.now() + (Number(sessaoValida.expiresInMs) || 30 * 60 * 1000);

    if (sessaoValida.perfil === 'municipio') {
        const sidebarNav = document.querySelector('.sidebar-nav');
        const dashboardContent = document.querySelector('.dashboard-content');

        if (sidebarNav) sidebarNav.style.display = 'none';
        if (dashboardContent) dashboardContent.style.display = 'none';
    }

    const encerrarSessao = async () => {
        try {
            await fetch('/logout', {
                method: 'POST',
                credentials: 'same-origin',
            });
        } catch (error) {
            console.error('Erro ao encerrar sessão:', error);
        }

        localStorage.removeItem('usuarioLogado');
        window.location.replace('../html/login.html');
    };

    const sessaoMonitor = async () => {
        const remainingMs = Math.max(0, sessionExpirationAt - Date.now());

        if (remainingMs <= 0) {
            await encerrarSessao();
        }
    };

    setInterval(sessaoMonitor, 1000);

    const logoutBtn = document.getElementById('logout-btn');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            const confirmar = window.confirm('Deseja encerrar a sessão atual?');
            if (!confirmar) return;

            await encerrarSessao();
        });
    }
});
