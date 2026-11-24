document.addEventListener('DOMContentLoaded', async () => {
    const sessao = await window.inicializarAutenticacao();
    if (!sessao) return;
    if (sessao.perfil !== 'admin' && sessao.perfil !== 'ADMINISTRADOR') {
        window.location.replace('/index.html');
        return;
    }

    const form = document.getElementById('form-usuario');
    const toast = document.getElementById('toast');
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(form));
        data.exigeTrocaSenha = document.getElementById('exigeTroca').checked;
        data.ativo = true;

        try {
            const response = await fetch('/api/usuarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify(data),
            });
            const result = await response.json();
            if (!response.ok)
                throw new Error(result.message || 'Erro ao cadastrar usuário.');

            toast.textContent = 'Usuário cadastrado com sucesso.';
            toast.style.display = 'block';
            setTimeout(() => window.location.replace('/usuarios.html'), 900);
        } catch (error) {
            toast.textContent = error.message;
            toast.style.display = 'block';
        }
    });
});
