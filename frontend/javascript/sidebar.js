document.addEventListener('DOMContentLoaded', async () => {
    const toggleButtons = document.querySelectorAll('.nav-item-toggle');

    toggleButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const parentGroup = button.parentElement;

            parentGroup.classList.toggle('active');
        });
    });

    if (window.inicializarAutenticacao) {
        const usuario = await window.inicializarAutenticacao();
        if (!usuario) return;

        const isAdministrador =
            usuario.perfil === 'admin' || usuario.perfil === 'ADMINISTRADOR';

        document.querySelectorAll('[data-admin-only]').forEach((item) => {
            item.hidden = !isAdministrador;
        });
    }
});
