document.addEventListener('DOMContentLoaded', async () => {
    const sessao = await window.inicializarAutenticacao();
    if (!sessao) return;
    if (window.applySidebarUser) window.applySidebarUser(sessao);
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
    const nomeInput = document.getElementById('edit-nome');
    const emailInput = document.getElementById('edit-email');
    const perfilInput = document.getElementById('edit-perfil');
    const ativoInput = document.getElementById('edit-ativo');
    const forceResetInput = document.getElementById('force-reset');
    let savedSnapshot = null;

    function showToast(message, success = true) {
        window.showToast(message, success ? 'success' : 'error');
    }

    function initials(name) {
        return String(name)
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0])
            .join('')
            .toUpperCase();
    }

    function getSnapshot() {
        return {
            nome: nomeInput.value,
            email: emailInput.value,
            perfil: perfilInput.value,
            ativo: ativoInput.checked,
            exigeTrocaSenha: forceResetInput.checked,
        };
    }

    function isDirty() {
        if (!savedSnapshot) return false;
        const current = getSnapshot();
        return Object.keys(savedSnapshot).some(
            (key) => savedSnapshot[key] !== current[key]
        );
    }

    document.querySelector('.sidebar')?.addEventListener(
        'click',
        (event) => {
            const link = event.target.closest('a');
            if (!link) return;
            if (isDirty()) {
                event.preventDefault();
                event.stopImmediatePropagation();
                if (window.showToast) {
                    window.showToast(
                        'Você possui alterações não salvas. Salve as alterações antes de acessar outro item do menu.',
                        'warning'
                    );
                }
            }
        },
        true
    );

    try {
        const { response, data } = await window.apiFetch(
            `/api/usuarios/${encodeURIComponent(usuario)}`
        );
        if (!response.ok)
            throw new Error(data?.message || 'Erro ao carregar usuário.');
        const currentUser = data.user;

        nomeInput.value = currentUser.nome;
        document.getElementById('edit-usuario').value = currentUser.usuario;
        emailInput.value = currentUser.email;
        perfilInput.value =
            {
                admin: 'ADMINISTRADOR',
                municipio: 'GESTOR',
                agente_vigilancia_epidemiologica: 'TECNICO',
                agente_combate_endemias: 'ENDEMIAS',
            }[currentUser.perfil] || currentUser.perfil;
        ativoInput.checked = currentUser.ativo;
        forceResetInput.checked = currentUser.exigeTrocaSenha;
        document.getElementById('edit-avatar').textContent = initials(
            currentUser.nome
        );
        document.getElementById('edit-name').textContent = currentUser.nome;
        document.getElementById('edit-login').textContent = currentUser.email;

        updateStatus();
        savedSnapshot = getSnapshot();
        if (modo === 'senha') {
            setTimeout(
                () =>
                    document
                        .getElementById('security-section')
                        .scrollIntoView({ behavior: 'smooth' }),
                150
            );
        }
    } catch (error) {
        showToast(error.message, false);
    }

    function updateStatus() {
        const status = document.getElementById('account-status');
        const active = ativoInput.checked;
        const pending = forceResetInput.checked;
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
        document.getElementById('deactivate-label').textContent = active
            ? 'Desativar operador'
            : 'Ativar operador';
    }

    ativoInput.addEventListener('change', updateStatus);
    forceResetInput.addEventListener('change', updateStatus);

    document.getElementById('deactivate-user').addEventListener('click', () => {
        ativoInput.checked = !ativoInput.checked;
        updateStatus();
    });

    document
        .getElementById('reset-password')
        .addEventListener('click', async () => {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
            const lowers = 'abcdefghijkmnpqrstuvwxyz';
            const nums = '23456789';
            const specials = '@#$%!&*';
            const temporaryPassword =
                'Vigia@' +
                chars[Math.floor(Math.random() * chars.length)] +
                lowers[Math.floor(Math.random() * lowers.length)] +
                nums[Math.floor(Math.random() * nums.length)] +
                specials[Math.floor(Math.random() * specials.length)];

            try {
                const { response, data } = await window.apiFetch(
                    `/api/usuarios/${encodeURIComponent(usuario)}/redefinir-senha`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ senha: temporaryPassword }),
                    }
                );
                if (!response.ok)
                    throw new Error(
                        data?.message || 'Erro ao redefinir senha.'
                    );
                forceResetInput.checked = true;
                updateStatus();
                if (savedSnapshot) savedSnapshot.exigeTrocaSenha = true;
                showToast(`Senha provisória: ${temporaryPassword}`);
            } catch (error) {
                showToast(error.message, false);
            }
        });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const payload = {
            nome: nomeInput.value.trim(),
            email: emailInput.value.trim(),
            perfil: perfilInput.value,
            ativo: ativoInput.checked,
            exigeTrocaSenha: forceResetInput.checked,
        };
        try {
            const { response, data } = await window.apiFetch(
                `/api/usuarios/${encodeURIComponent(usuario)}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                }
            );
            if (!response.ok)
                throw new Error(data?.message || 'Erro ao atualizar usuário.');
            savedSnapshot = getSnapshot();
            showToast(data.message);
            setTimeout(() => window.location.replace('/usuarios.html'), 900);
        } catch (error) {
            showToast(error.message, false);
        }
    });
});
