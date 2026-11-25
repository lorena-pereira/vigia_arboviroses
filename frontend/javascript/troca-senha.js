document.addEventListener('DOMContentLoaded', async () => {
    const sessao = await window.inicializarAutenticacao();
    if (!sessao) return;

    const form = document.getElementById('pwd-form');
    const nova = document.getElementById('nova-senha');
    const confirmar = document.getElementById('confirmar-senha');
    const atual = document.getElementById('senha-atual');
    const checks = document.querySelectorAll('#password-checks li');
    const toggles = document.querySelectorAll('.toggle-password');

    function showToast(message, type = 'error') {
        if (window.showToast) {
            window.showToast(message, type);
            return;
        }
    }

    function validatePassword() {
        const value = nova.value;
        const rules = {
            length: value.length >= 8,
            upper: /[A-Z]/.test(value),
            lower: /[a-z]/.test(value),
            number: /\d/.test(value),
            special: /[^A-Za-z0-9]/.test(value),
        };
        checks.forEach((item) =>
            item.classList.toggle('valid', Boolean(rules[item.dataset.rule]))
        );
        return Object.values(rules).every(Boolean);
    }

    toggles.forEach((button) => {
        button.addEventListener('click', () => {
            const targetId = button.dataset.target;
            const input = document.getElementById(targetId);
            if (!input) return;

            const showing = input.type === 'text';
            input.type = showing ? 'password' : 'text';
            button.setAttribute(
                'aria-label',
                showing ? 'Mostrar senha' : 'Ocultar senha'
            );
            button.innerHTML = `<i data-lucide="${showing ? 'eye-off' : 'eye'}"></i>`;
            if (
                window.lucide &&
                typeof window.lucide.createIcons === 'function'
            ) {
                window.lucide.createIcons();
            }
        });
    });

    validatePassword();
    nova.addEventListener('input', validatePassword);

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!validatePassword()) {
            showToast(
                'A nova senha ainda não atende a todos os requisitos. Verifique os itens em vermelho.',
                'error'
            );
            nova.focus();
            return;
        }
        if (nova.value !== confirmar.value) {
            showToast('As senhas informadas não coincidem.', 'error');
            confirmar.focus();
            return;
        }

        try {
            const result = window.apiFetch
                ? await window.apiFetch('/api/usuarios/trocar-senha', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                          senhaAtual: atual.value,
                          novaSenha: nova.value,
                      }),
                  })
                : await (async () => {
                      const response = await fetch(
                          '/api/usuarios/trocar-senha',
                          {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'same-origin',
                              body: JSON.stringify({
                                  senhaAtual: atual.value,
                                  novaSenha: nova.value,
                              }),
                          }
                      );
                      return {
                          response,
                          data: await response.json().catch(() => null),
                          ok: response.ok,
                      };
                  })();
            const { response, data } = result;
            if (!response.ok)
                throw new Error(data?.message || 'Erro ao redefinir senha.');

            showToast('Senha redefinida com sucesso.', 'success');
            setTimeout(() => window.location.replace('/index.html'), 900);
        } catch (error) {
            showToast(error.message, 'error');
        }
    });
});
