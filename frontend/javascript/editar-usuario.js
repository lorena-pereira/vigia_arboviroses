document.addEventListener('DOMContentLoaded', async () => {
    const sessao = await window.inicializarAutenticacao();
    if (!sessao) return;
    if (sessao.perfil !== 'admin' && sessao.perfil !== 'ADMINISTRADOR') {
        window.location.replace('/index.html');
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const usuario = params.get('usuario');
    const modo = params.get('modo');
    if (!usuario) {
        window.location.replace('/usuarios.html');
        return;
    }

    const form = document.getElementById('edit-user-form');
    const toast = document.getElementById('toast');
    let currentUser = null;

    function showToast(message, success = true) {
        toast.textContent = message;
        toast.style.background = success ? '#dcfce7' : '#fee2e2';
        toast.style.color = success ? '#166534' : '#991b1b';
        toast.style.borderColor = success ? '#86efac' : '#fca5a5';
        toast.style.display = 'block';
    }

    function initials(name) {
        return String(name).split(/\s+/).filter(Boolean).slice(0, 2)
            .map((part) => part[0]).join('').toUpperCase();
    }

    try {
        const response = await fetch(`/api/usuarios/${encodeURIComponent(usuario)}`, { credentials: 'same-origin' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        currentUser = data.user;

        document.getElementById('edit-nome').value = currentUser.nome;
        document.getElementById('edit-usuario').value = currentUser.usuario;
        document.getElementById('edit-email').value = currentUser.email;
        document.getElementById('edit-perfil').value =
            ({ admin: 'ADMINISTRADOR', municipio: 'GESTOR',
               agente_vigilancia_epidemiologica: 'TECNICO',
               agente_combate_endemias: 'ENDEMIAS' }[currentUser.perfil] || currentUser.perfil);
        document.getElementById('edit-ativo').checked = currentUser.ativo;
        document.getElementById('force-reset').checked = currentUser.exigeTrocaSenha;
        document.getElementById('edit-avatar').textContent = initials(currentUser.nome);
        document.getElementById('edit-name').textContent = currentUser.nome;
        document.getElementById('edit-login').textContent = currentUser.email;

        updateStatus();
        if (modo === 'senha') {
            setTimeout(() => document.getElementById('security-section').scrollIntoView({ behavior: 'smooth' }), 150);
        }
    } catch (error) {
        showToast(error.message, false);
    }

    function updateStatus() {
        const status = document.getElementById('account-status');
        const active = document.getElementById('edit-ativo').checked;
        const pending = document.getElementById('force-reset').checked;
        status.className = 'account-status';
        if (!active) {
            status.textContent = 'Inativo';
            status.classList.add('inactive');
        } else if (pending) {
            status.textContent = 'Troca de senha pendente';
            status.classList.add('pending');
        } else {
            status.textContent = 'Ativo';
        }
        document.getElementById('deactivate-label').textContent =
            active ? 'Desativar operador' : 'Ativar operador';
    }

    document.getElementById('edit-ativo').addEventListener('change', updateStatus);
    document.getElementById('force-reset').addEventListener('change', updateStatus);

    document.getElementById('deactivate-user').addEventListener('click', () => {
        document.getElementById('edit-ativo').checked =
            !document.getElementById('edit-ativo').checked;
        updateStatus();
    });

    document.getElementById('reset-password').addEventListener('click', async () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        const lowers = 'abcdefghijkmnpqrstuvwxyz';
        const nums = '23456789';
        const specials = '@#$%!&*';
        const temporaryPassword =
            'Vigia@' + chars[Math.floor(Math.random() * chars.length)] +
            lowers[Math.floor(Math.random() * lowers.length)] +
            nums[Math.floor(Math.random() * nums.length)] +
            specials[Math.floor(Math.random() * specials.length)];

        try {
            const response = await fetch(
                `/api/usuarios/${encodeURIComponent(usuario)}/redefinir-senha`,
                { method: 'POST', headers: { 'Content-Type': 'application/json' },
                  credentials: 'same-origin', body: JSON.stringify({ senha: temporaryPassword }) }
            );
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            document.getElementById('force-reset').checked = true;
            updateStatus();
            showToast(`Senha provisória: ${temporaryPassword}`);
        } catch (error) {
            showToast(error.message, false);
        }
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const payload = {
            nome: document.getElementById('edit-nome').value.trim(),
            email: document.getElementById('edit-email').value.trim(),
            perfil: document.getElementById('edit-perfil').value,
            ativo: document.getElementById('edit-ativo').checked,
            exigeTrocaSenha: document.getElementById('force-reset').checked,
        };
        try {
            const response = await fetch(`/api/usuarios/${encodeURIComponent(usuario)}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin', body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            showToast(data.message);
            setTimeout(() => window.location.replace('/usuarios.html'), 900);
        } catch (error) {
            showToast(error.message, false);
        }
    });

    document.getElementById('logout-btn')?.addEventListener('click', async (event) => {
        event.preventDefault();
        await fetch('/logout', { method: 'POST', credentials: 'same-origin' });
        localStorage.removeItem('usuarioLogado');
        window.location.replace('/html/login.html');
    });
});
