document.addEventListener('DOMContentLoaded', async () => {
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado') || 'null');
    
    if (usuarioLogado) {
        const nameElement = document.getElementById('user-name');
        const roleElement = document.getElementById('user-role');

        if (nameElement) nameElement.textContent = usuarioLogado.nome;
        if (roleElement) roleElement.textContent = usuarioLogado.perfil === 'admin' ? 'Administrador' : 'Equipe Técnica';
    }

    const sessaoValida = await window.validarSessao?.();

    if (!sessaoValida) {
        localStorage.removeItem('usuarioLogado');
        window.location.replace('../html/login.html');
        return;
    }

    const nameElement = document.getElementById('user-name');
    const roleElement = document.getElementById('user-role');

    if (nameElement) nameElement.textContent = sessaoValida.nome;
    if (roleElement) roleElement.textContent = sessaoValida.perfil === 'admin' ? 'Administrador' : 'Equipe Técnica';

    const sessionWarning = document.getElementById('session-warning');
    const sessionTime = document.getElementById('session-time');

    const showWarning = (message) => {
        if (!sessionWarning) return;
        sessionWarning.textContent = message;
        sessionWarning.style.display = 'block';
    };

    const hideWarning = () => {
        if (!sessionWarning) return;
        sessionWarning.style.display = 'none';
        sessionWarning.textContent = '';
    };

    const formatTimer = (milissegundos) => {
        const totalSeconds = Math.max(0, Math.ceil(milissegundos / 1000));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const sessionExpirationAt = Date.now() + (Number(sessaoValida.expiresInMs) || 30 * 60 * 1000);

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

        if (remainingMs <= 5 * 60 * 1000) {
            const segundos = Math.ceil(remainingMs / 1000);
            const minutos = Math.floor(segundos / 60);
            const sobra = segundos % 60;
            showWarning(`Sua sessão expirará em ${minutos}m ${sobra}s.`);
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