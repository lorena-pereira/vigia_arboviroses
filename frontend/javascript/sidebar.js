(function () {
    function normalizePath(pathname) {
        const path = String(pathname || '').split('?')[0];
        if (path === '/' || path === '/index.html' || path.endsWith('/index.html')) {
            return '/index.html';
        }
        return path.startsWith('/') ? path : `/${path}`;
    }

    function renderSidebar() {
        const sidebar = document.querySelector('aside.sidebar[data-shared-sidebar]');
        if (!sidebar) return;

        const current = normalizePath(window.location.pathname);
        const isUsuariosPage =
            current === '/usuarios.html' ||
            current === '/cadastrar-usuario.html' ||
            current === '/editar-usuario.html';
        const isPacientesPage = current === '/cadastrar-paciente.html';

        sidebar.innerHTML = `
            <div class="sidebar-header">
                <div class="brand-icon">
                    <i data-lucide="activity"></i>
                </div>
                <h2>Vigia<br />Arboviroses</h2>
            </div>

            <nav class="sidebar-nav">
                <a href="/index.html" class="nav-item ${current === '/index.html' ? 'active' : ''}">
                    <i data-lucide="layout-dashboard"></i>
                    <span>Painel Geral</span>
                </a>

                <div class="nav-item-group ${isPacientesPage ? 'active' : ''}">
                    <button class="nav-item-toggle" type="button">
                        <div class="toggle-left">
                            <i data-lucide="users"></i>
                            <span>Pacientes</span>
                        </div>
                        <i data-lucide="chevron-down" class="arrow-icon"></i>
                    </button>
                    <div class="nav-submenu">
                        <a href="/cadastrar-paciente.html" class="submenu-item ${isPacientesPage ? 'active' : ''}">Cadastrar Paciente</a>
                    </div>
                </div>

                <a href="#" class="nav-item">
                    <i data-lucide="file-text"></i>
                    <span>Notificações</span>
                </a>

                <a href="/usuarios.html" class="nav-item ${isUsuariosPage ? 'active' : ''}" data-admin-only hidden>
                    <i data-lucide="users-round"></i>
                    <span>Usuários</span>
                </a>
            </nav>

            <div class="sidebar-footer">
                <a href="#" id="logout-btn" class="nav-item logout-btn">
                    <i data-lucide="log-out"></i>
                    <span>Encerrar sessão</span>
                </a>
            </div>
        `;

        sidebar.querySelectorAll('.nav-item-toggle').forEach((button) => {
            button.addEventListener('click', () => {
                const parentGroup = button.parentElement;
                if (parentGroup) parentGroup.classList.toggle('active');
            });
        });
    }

    function applySidebarUser(usuario) {
        const perfil = usuario?.perfil;
        const isAdministrador =
            perfil === 'admin' || perfil === 'ADMINISTRADOR';
        document.querySelectorAll('[data-admin-only]').forEach((item) => {
            item.hidden = !isAdministrador;
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        renderSidebar();
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }

        try {
            const stored = JSON.parse(localStorage.getItem('usuarioLogado') || 'null');
            if (stored) applySidebarUser(stored);
        } catch {}
    });

    window.applySidebarUser = applySidebarUser;
    window.renderSharedSidebar = renderSidebar;
})();
