(function () {
    async function parseResponse(response) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            try {
                return await response.json();
            } catch {
                return null;
            }
        }
        try {
            return await response.text();
        } catch {
            return null;
        }
    }

    async function apiFetch(url, options) {
        const opts = Object.assign({ redirectOn401: true }, options || {});
        const fetchOptions = Object.assign({}, opts);
        delete fetchOptions.redirectOn401;

        if (!fetchOptions.credentials) {
            fetchOptions.credentials = 'same-origin';
        }

        const response = await fetch(url, fetchOptions);
        const data = await parseResponse(response);

        if (response.status === 401 && opts.redirectOn401) {
            try {
                localStorage.removeItem('usuarioLogado');
            } catch {}
            try {
                sessionStorage.removeItem('sessionExpirationAt');
            } catch {}
            if (!String(window.location.pathname).endsWith('/login.html')) {
                window.location.replace('/html/login.html');
            }
        }

        return { response, data, ok: response.ok, status: response.status };
    }

    window.apiFetch = apiFetch;
})();
