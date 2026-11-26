document.addEventListener('DOMContentLoaded', async () => {
    const usuarioJaLogado = await window.validarSessao();
    if (usuarioJaLogado) {
        window.location.replace('/index.html');
        return;
    }

    const loginForm = document.getElementById('login-form');
    const userInput = document.getElementById('user');
    const passwordInput = document.getElementById('password');
    const togglePasswordIcon = document.querySelector('.icon-right');
    if (!loginForm || !userInput || !passwordInput) return;

    if (togglePasswordIcon) {
        togglePasswordIcon.addEventListener('click', () => {
            const showingPassword = passwordInput.type === 'password';
            passwordInput.type = showingPassword ? 'text' : 'password';
            togglePasswordIcon.style.opacity = showingPassword ? '1' : '0.5';
        });
    }

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const usuario = userInput.value.trim();
        const senha = passwordInput.value;
        if (!usuario || !senha) {
            window.showToast('Por favor, preencha todos os campos.', 'warning');
            return;
        }

        try {
            const { response, data } = await window.apiFetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario, senha }),
                redirectOn401: false,
            });

            if (response.ok && data?.success) {
                const usuarioLogado = data.user || {
                    nome: usuario,
                    perfil: data.profile || 'Usuário',
                };
                localStorage.setItem(
                    'usuarioLogado',
                    JSON.stringify(usuarioLogado)
                );
                sessionStorage.removeItem('sessionExpirationAt');
                window.location.replace(data.redirect || '/index.html');
                return;
            }

            window.showToast(
                data?.message || 'Erro ao realizar login.',
                'error'
            );
            passwordInput.value = '';
            passwordInput.focus();
        } catch (error) {
            console.error('Erro de conexão:', error);
            window.showToast(
                'Não foi possível conectar ao servidor. Verifique se o back-end está rodando.',
                'error'
            );
        }
    });
});
