document.addEventListener('DOMContentLoaded', async () => {
    const sessao = await window.inicializarAutenticacao();
    if (!sessao) return;

    const form = document.getElementById('pwd-form');
    const nova = document.getElementById('nova-senha');
    const confirmar = document.getElementById('confirmar-senha');
    const atual = document.getElementById('senha-atual');
    const toast = document.getElementById('toast');
    const checks = document.querySelectorAll('#password-checks li');

    function validatePassword() {
        const value = nova.value;
        const rules = {
            length: value.length >= 8,
            upper: /[A-Z]/.test(value),
            lower: /[a-z]/.test(value),
            number: /\d/.test(value),
            special: /[^A-Za-z0-9]/.test(value),
        };
        checks.forEach((item) => item.classList.toggle('valid', Boolean(rules[item.dataset.rule])));
        return Object.values(rules).every(Boolean);
    }

    nova.addEventListener('input', validatePassword);

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!validatePassword()) {
            toast.textContent = 'A nova senha não atende a todos os critérios.';
            toast.style.display = 'block';
            return;
        }
        if (nova.value !== confirmar.value) {
            toast.textContent = 'As senhas informadas não coincidem.';
            toast.style.display = 'block';
            return;
        }

        try {
            const response = await fetch('/api/usuarios/trocar-senha', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                    senhaAtual: atual.value,
                    novaSenha: nova.value,
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Erro ao redefinir senha.');

            toast.textContent = 'Senha redefinida com sucesso.';
            toast.style.display = 'block';
            setTimeout(() => window.location.replace('/index.html'), 900);
        } catch (error) {
            toast.textContent = error.message;
            toast.style.display = 'block';
        }
    });
});
