document.addEventListener('DOMContentLoaded', async () => {
    const sessao = await window.inicializarAutenticacao();
    if (!sessao) return;
    if (sessao.perfil !== 'admin' && sessao.perfil !== 'ADMINISTRADOR') {
        window.location.replace('/index.html');
        return;
    }
    if (window.applySidebarUser) window.applySidebarUser(sessao);

    const form = document.getElementById('form-usuario');
    const toastEl = document.getElementById('toast');
    const notify = (message, type = 'info') => {
        if (window.showToast) { window.showToast(message, type); return; }
        if (toastEl) { toastEl.textContent = message; toastEl.style.display = 'block'; }
    };

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(form));
        data.exigeTrocaSenha = document.getElementById('exigeTroca').checked;
        data.ativo = true;

        try {
            const result = window.apiFetch
                ? await window.apiFetch('/api/usuarios', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(data),
                  })
                : await (async () => { const response = await fetch('/api/usuarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(data) }); return { response, data: await response.json().catch(() => null) }; })();
            const { response, data: payload } = result;
            if (!response.ok)
                throw new Error(payload?.message || 'Erro ao cadastrar usuário.');

            notify('Usuário cadastrado com sucesso.', 'success');
            setTimeout(() => window.location.replace('/usuarios.html'), 900);
        } catch (error) {
            notify(error.message, 'error');
        }
    });
});
