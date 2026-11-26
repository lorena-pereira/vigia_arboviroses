document.addEventListener('DOMContentLoaded', async () => {
    const sessao = await window.inicializarAutenticacao();
    if (!sessao) return;
    if (sessao.perfil !== 'admin' && sessao.perfil !== 'ADMINISTRADOR') {
        window.location.replace('/index.html');
        return;
    }
    if (window.applySidebarUser) window.applySidebarUser(sessao);

    const form = document.getElementById('form-usuario');
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(form));
        data.exigeTrocaSenha = document.getElementById('exigeTroca').checked;
        data.ativo = true;

        try {
            const { response, data: payload } = await window.apiFetch(
                '/api/usuarios',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                }
            );
            if (!response.ok)
                throw new Error(
                    payload?.message || 'Erro ao cadastrar usuário.'
                );

            window.showToast('Usuário cadastrado com sucesso.', 'success');
            setTimeout(() => window.location.replace('/usuarios.html'), 900);
        } catch (error) {
            console.error('Erro ao cadastrar usuário:', error);
            window.showToast(error.message, 'error');
        }
    });
});
