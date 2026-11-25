// garante que o script rode apÃ³s o HTML carregar
document.addEventListener('DOMContentLoaded', async () => {
    const usuarioJaLogado = await window.validarSessao?.();
    if (usuarioJaLogado) {
        window.location.replace('/index.html');
        return;
    }

    // buscando os elementos HTML
    const loginForm = document.getElementById('login-form');
    const userInput = document.getElementById('user');
    const passwordInput = document.getElementById('password');
    const togglePasswordIcon = document.querySelector('.icon-right');

    // lÃ³gica do ocultamento de senha
    if (togglePasswordIcon && passwordInput) {
        togglePasswordIcon.addEventListener('click', () => {
            const currentType = passwordInput.getAttribute('type');

            if (currentType === 'password') {
                passwordInput.setAttribute('type', 'text');
            } else {
                passwordInput.setAttribute('type', 'password');
                togglePasswordIcon.style.opacity = '0.5';
            }
        });
    }

    // envio do formulÃ¡rio e integraÃ§Ã£o com o API
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const usuario = userInput.value.trim();
        const senha = passwordInput.value;

        if (!usuario || !senha) {
            if (window.showToast) { window.showToast('Por favor, preencha todos os campos!', 'warning'); }
            return;
        }

        try {
        try {
            const result = window.apiFetch
                ? await window.apiFetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ usuario, senha }),
                    redirectOn401: false,
                })
                : await (async () => { const response = await fetch('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario, senha }) }); return { response, data: await response.json().catch(() => null) }; })();
            const { response, data } = result;

            if (response.ok && data?.success) {
                const usuarioLogado = data.user || {
                    nome: usuario,
                    perfil: data.profile || 'UsuÃ¡rio',
                };

                localStorage.setItem(
                    'usuarioLogado',
                    JSON.stringify(usuarioLogado)
                );
                sessionStorage.removeItem('sessionExpirationAt');

                // Redireciona substituindo a pÃ¡gina no histÃ³rico
                window.location.replace(data.redirect || '/index.html');
            } else {
                if (window.showToast) { window.showToast((data && data.message) || 'Erro ao realizar login.', 'error'); }

                passwordInput.value = '';
                passwordInput.focus();
            }
        } catch (error) {
            console.error('Erro de conexÃ£o:', error);
            if (window.showToast) { window.showToast('Não foi possível conectar ao servidor. Verifique se o Back-end está rodando.', 'error'); }
        }
    });
});
