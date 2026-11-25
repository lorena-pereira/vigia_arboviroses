document.addEventListener('DOMContentLoaded', async () => {
    const sessao = await window.inicializarAutenticacao();
    if (!sessao) return;

    if (sessao.perfil !== 'admin' && sessao.perfil !== 'ADMINISTRADOR') {
        window.location.replace('/index.html');
        return;
    }

    const userName = document.getElementById('user-name');
    const userRole = document.getElementById('user-role');
    if (userName) userName.textContent = sessao.nome || 'Administrador';
    if (userRole) userRole.textContent = 'Administrador';
    if (window.applySidebarUser) window.applySidebarUser(sessao);

    const logout = document.getElementById('logout-btn');
    logout?.addEventListener('click', async (event) => {
        event.preventDefault();
        try {
            if (window.apiFetch) {
                await window.apiFetch('/logout', { method: 'POST', redirectOn401: false });
            } else {
                await fetch('/logout', { method: 'POST', credentials: 'same-origin' });
            }
        } catch {}
        localStorage.removeItem('usuarioLogado');
        window.location.replace('/html/login.html');
    });

    const body = document.getElementById('users-body');
    const search = document.getElementById('filter-search');
    const profile = document.getElementById('filter-profile');
    const status = document.getElementById('filter-status');
    let users = [];

    const initials = (name) =>
        String(name)
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0])
            .join('')
            .toUpperCase();

    const profileLabel = {
        ADMINISTRADOR: 'Administrador',
        admin: 'Administrador',
        agente_vigilancia_epidemiologica: 'Agente de Vigilância Epidemiológica',
        agente_combate_endemias: 'Agente de Combate de Endemias',
        municipio: 'Munícipe',
        TECNICO: 'Agente de Vigilância Epidemiológica',
        GESTOR: 'Munícipe',
        ENDEMIAS: 'Agente de Combate de Endemias',
    };

    function render() {
        const term = search.value.trim().toLowerCase();
        const filtered = users.filter((user) => {
            const matchesTerm =
                !term ||
                [user.nome, user.usuario, user.email]
                    .join(' ')
                    .toLowerCase()
                    .includes(term);
            const normalizedProfile =
                {
                    admin: 'ADMINISTRADOR',
                    agente_vigilancia_epidemiologica: 'TECNICO',
                    municipio: 'GESTOR',
                    agente_combate_endemias: 'ENDEMIAS',
                }[user.perfil] || user.perfil;
            const matchesProfile =
                !profile.value || normalizedProfile === profile.value;
            const matchesStatus =
                !status.value ||
                (status.value === 'ativo' &&
                    user.ativo &&
                    !user.exigeTrocaSenha) ||
                (status.value === 'pendente' && user.exigeTrocaSenha);
            return matchesTerm && matchesProfile && matchesStatus;
        });

        body.innerHTML = filtered.length
            ? filtered
                  .map(
                      (user) => `
                <tr>
                    <td><div class="user-cell"><div class="avatar-user">${initials(user.nome)}</div><div><strong>${user.nome}</strong><br><small>${user.usuario}</small></div></div></td>
                    <td>${user.email || '-'}</td>
                    <td><span class="role-badge">${profileLabel[user.perfil] || user.perfil}</span></td>
                    <td><span class="status-badge ${user.exigeTrocaSenha ? 'status-pending' : 'status-active'}">${user.exigeTrocaSenha ? 'Primeiro acesso pendente' : 'Ativo'}</span></td>
                    <td><div class="table-actions"><button class="icon-btn" data-edit-user="${encodeURIComponent(user.usuario)}" title="Editar usuário" aria-label="Editar usuário"><i data-lucide="pencil"></i></button></div></td>
                </tr>`
                  )
                  .join('')
            : '<tr><td colspan="5">Nenhum usuário encontrado.</td></tr>';
        lucide.createIcons();
        body.querySelectorAll('[data-edit-user]').forEach((button) => {
            button.addEventListener('click', () => {
                window.location.href = `/editar-usuario.html?usuario=${button.dataset.editUser}&modo=editar`;
            });
        });
    }

    try {
        const result = window.apiFetch
            ? await window.apiFetch('/api/usuarios')
            : await (async () => { const response = await fetch('/api/usuarios', { credentials: 'same-origin' }); return { response, data: await response.json().catch(() => null) }; })();
        const { response, data } = result;
        if (!response.ok) throw new Error(data?.message);
        users = data.users || [];
    } catch {
        body.innerHTML =
            '<tr><td colspan="5">Não foi possível carregar os usuários.</td></tr>';
        if (window.showToast) window.showToast('Não foi possível carregar os usuários.', 'error');
    }

    search.addEventListener('input', render);
    profile.addEventListener('change', render);
    status.addEventListener('change', render);
    render();
});
