document.addEventListener('DOMContentLoaded', async () => {
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado') || 'null');

    const perfilLabels = {
        admin: 'Administrador',
        municipio: 'Município',
        agente_vigilancia_epidemiologica: 'Agente de Vigilância Epidemiológica',
        agente_combate_endemias: 'Agente de Combate às Endemias'
    };

    const formatarUsuarioTopo = (dadosUsuario) => {
        const perfil = dadosUsuario?.perfil;
        const nome = String(dadosUsuario?.nome || dadosUsuario?.user || '').trim();
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

    const sessaoValida = await window.validarSessao?.();

    if (!sessaoValida) {
        localStorage.removeItem('usuarioLogado');
        window.location.replace('../html/login.html');
        return;
    }

    atualizarUsuarioTopo(sessaoValida);

    if (sessaoValida.perfil === 'municipio') {
        const sidebarNav = document.querySelector('.sidebar-nav');
        const dashboardContent = document.querySelector('.dashboard-content');

        if (sidebarNav) sidebarNav.style.display = 'none';
        if (dashboardContent) dashboardContent.style.display = 'none';
    }

    const sessionWarning = document.getElementById('session-warning');
    const sessionWarningText = document.getElementById('session-warning-text');
    const sessionTime = document.getElementById('session-time');
    const renewBtn = document.getElementById('session-renew-btn');

    const showWarning = (message) => {
        if (!sessionWarning || !sessionWarningText) return;
        sessionWarningText.textContent = message;
        sessionWarning.style.display = 'flex';
    };

    const hideWarning = () => {
        if (!sessionWarning) return;
        sessionWarning.style.display = 'none';
        if (sessionWarningText) sessionWarningText.textContent = '';
    };

    const formatTimer = (milissegundos) => {
        const totalSeconds = Math.max(0, Math.ceil(milissegundos / 1000));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    let sessionExpirationAt = Date.now() + (Number(sessaoValida.expiresInMs) || 30 * 60 * 1000);

    const renovarSessao = async () => {
        try {
            const response = await fetch('/api/session', {
                method: 'GET',
                credentials: 'same-origin'
            });

            if (!response.ok) {
                await encerrarSessao();
                return;
            }

            const data = await response.json();
            if (data.authenticated) {
                sessionExpirationAt = Date.now() + (Number(data.expiresInMs) || 30 * 60 * 1000);
                hideWarning();
            }
        } catch (error) {
            console.error('Erro ao renovar a sessão:', error);
        }
    };

    if (renewBtn) {
        renewBtn.addEventListener('click', async () => {
            await renovarSessao();
        });
    }

    const encerrarSessao = async () => {
        try {
            await fetch('/logout', { method: 'POST', credentials: 'same-origin' });
        } catch (error) {
            console.error('Erro ao encerrar sessão:', error);
        }

        localStorage.removeItem('usuarioLogado');
        window.location.replace('../html/login.html');
    };

    const sessaoMonitor = async () => {
        const remainingMs = Math.max(0, sessionExpirationAt - Date.now());

        if (sessionTime) {
            sessionTime.textContent = formatTimer(remainingMs);
        }

        if (remainingMs <= 0) {
            await encerrarSessao();
            return;
        }

        if (remainingMs <= 10 * 60 * 1000) {
            const segundos = Math.ceil(remainingMs / 1000);
            const minutos = Math.floor(segundos / 60);
            const sobra = segundos % 60;
            showWarning(`Sua sessão expirará em ${minutos}m ${sobra}s. Deseja continuar?`);
        } else {
            hideWarning();
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