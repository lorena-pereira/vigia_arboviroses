document.addEventListener('DOMContentLoaded', () => {
    // lógica de exibição do usuário logado
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    
    if (usuarioLogado) {
        const nameElement = document.getElementById('user-name');
        const roleElement = document.getElementById('user-role');

        // atualiza o conteúdo dos elementos com as informações do usuário logado
        if (nameElement) nameElement.textContent = usuarioLogado.nome;
        if (roleElement) roleElement.textContent = usuarioLogado.perfil === 'admin' ? 'Administrador' : 'Equipe Técnica';
    }

    // lógica do botão de sair 
    const logoutBtn = document.getElementById('logout-btn');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // remove o usuário da sessão
            localStorage.removeItem('usuarioLogado');
            
            // redireciona para o login
            window.location.replace('../html/login.html');
        });
    }
});