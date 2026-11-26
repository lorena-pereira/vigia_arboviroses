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
    window.applySidebarUser?.(sessaoValida);

    let sessionExpirationAt =
        Date.now() + (Number(sessaoValida.expiresInMs) || 30 * 60 * 1000);

    // Mantém o prazo absoluto da sessão ao navegar pelas páginas do sistema.
    const storedExpirationAt = Number(
        sessionStorage.getItem('sessionExpirationAt') || 0
    );
    if (storedExpirationAt > Date.now()) {
        sessionExpirationAt = Math.min(sessionExpirationAt, storedExpirationAt);
    }
    sessionStorage.setItem('sessionExpirationAt', String(sessionExpirationAt));

    const userProfile = document.querySelector('.user-profile');
    let sessionTimer = document.getElementById('session-timer');

    if (!sessionTimer && userProfile) {
        sessionTimer = document.createElement('div');
        sessionTimer.id = 'session-timer';
        sessionTimer.setAttribute('aria-live', 'polite');
        sessionTimer.title = 'Tempo restante da sessão';
        sessionTimer.style.cssText =
            'min-width: 108px; margin-left: 8px; padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; color: #475569; font-size: 12px; font-weight: 700; text-align: center;';
        userProfile.appendChild(sessionTimer);
    }

    if (sessaoValida.perfil === 'municipio') {
        const sidebarNav = document.querySelector('.sidebar-nav');
        const dashboardContent = document.querySelector('.dashboard-content');

        if (sidebarNav) sidebarNav.style.display = 'none';
        if (dashboardContent) dashboardContent.style.display = 'none';
    }

    const encerrarSessao = async () => {
        try {
            const { response } = await window.apiFetch('/logout', {
                method: 'POST',
                redirectOn401: false,
            });
            if (!response.ok) {
                throw new Error('O servidor não confirmou o encerramento.');
            }
        } catch (error) {
            console.error('Erro ao encerrar sessão:', error);
        } finally {
            sessionStorage.removeItem('sessionExpirationAt');
            localStorage.removeItem('usuarioLogado');
            window.location.replace('/html/login.html');
        }
    };

    let alertaSessaoExibido = false;

    const exibirAvisoSessao = async () => {
        if (alertaSessaoExibido) return;
        alertaSessaoExibido = true;

        const renovar = window.confirm(
            'Sua sessão está próxima do fim. Deseja renovar a sessão agora?'
        );

        if (!renovar) return;

        try {
            const { response, data } = await window.apiFetch(
                '/api/session/renew',
                {
                    method: 'POST',
                    redirectOn401: false,
                }
            );

            if (!response.ok || !data?.authenticated) {
                await encerrarSessao();
                return;
            }

            sessionExpirationAt = Date.now() + Number(data.expiresInMs);
            sessionStorage.setItem(
                'sessionExpirationAt',
                String(sessionExpirationAt)
            );
            alertaSessaoExibido = false;
            if (window.showToast) {
                window.showToast('Sessão renovada com sucesso!', 'success');
            }
        } catch (error) {
            console.error('Erro ao renovar sessão:', error);
            if (window.showToast) {
                window.showToast('Não foi possível renovar a sessão.', 'error');
            }
        }
    };

    const atualizarTimerSessao = () => {
        const remainingMs = Math.max(0, sessionExpirationAt - Date.now());
        const totalSeconds = Math.ceil(remainingMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        if (sessionTimer) {
            sessionTimer.textContent = `Sessão: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

            if (remainingMs <= 5 * 60 * 1000) {
                void exibirAvisoSessao();
                sessionTimer.style.color = '#b91c1c';
                sessionTimer.style.borderColor = '#fecaca';
                sessionTimer.style.background = '#fef2f2';
            } else {
                sessionTimer.style.color = '#475569';
                sessionTimer.style.borderColor = '#e2e8f0';
                sessionTimer.style.background = '#f8fafc';
            }
        }

        if (remainingMs <= 0) {
            if (timerInterval) clearInterval(timerInterval);
            void encerrarSessao();
        }
    };

    let timerInterval = null;
    atualizarTimerSessao();
    timerInterval = setInterval(atualizarTimerSessao, 1000);
});
