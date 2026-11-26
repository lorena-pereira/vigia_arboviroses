(function () {
    async function parseResponse(response) {
        if (response.status === 204) return null;

        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            return response.json();
        }
        return response.text();
    }

    async function apiFetch(url, options) {
        const opts = {
            ...options,
            redirectOn401: options?.redirectOn401 !== false,
        };
        const fetchOptions = Object.assign({}, opts);
        delete fetchOptions.redirectOn401;

        if (!fetchOptions.credentials) {
            fetchOptions.credentials = 'same-origin';
        }

        const response = await fetch(url, fetchOptions);

        if (response.status === 401 && opts.redirectOn401) {
            try {
                localStorage.removeItem('usuarioLogado');
            } catch (error) {
                console.error(
                    'Não foi possível limpar os dados locais.',
                    error
                );
            }
            try {
                sessionStorage.removeItem('sessionExpirationAt');
            } catch (error) {
                console.error('Não foi possível limpar a sessão local.', error);
            }

            const pathname = String(window.location.pathname);
            const isLoginPage =
                pathname === '/' || pathname.endsWith('/login.html');
            if (!isLoginPage) {
                window.location.replace('/html/login.html');
            }
        }

        const data = await parseResponse(response);
        return { response, data, ok: response.ok, status: response.status };
    }

    window.apiFetch = apiFetch;
})();
