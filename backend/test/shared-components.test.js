import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const apiSource = await readFile(
    new URL('../../frontend/javascript/api.js', import.meta.url),
    'utf8'
);

function createApiContext(fetchImpl, pathname = '/html/usuarios.html') {
    const removedLocalItems = [];
    const removedSessionItems = [];
    const redirects = [];
    const context = {
        fetch: fetchImpl,
        localStorage: {
            removeItem: (key) => removedLocalItems.push(key),
        },
        sessionStorage: {
            removeItem: (key) => removedSessionItems.push(key),
        },
        window: {
            location: {
                pathname,
                replace: (url) => redirects.push(url),
            },
        },
        console,
    };

    vm.runInNewContext(apiSource, context);
    return {
        apiFetch: context.window.apiFetch,
        removedLocalItems,
        removedSessionItems,
        redirects,
    };
}

test('apiFetch redirects and clears client session on 401 by default', async () => {
    let requestOptions;
    const { apiFetch, removedLocalItems, removedSessionItems, redirects } =
        createApiContext(async (_url, options) => {
            requestOptions = options;
            return {
                status: 401,
                ok: false,
                headers: { get: () => 'application/json' },
                json: async () => ({ authenticated: false }),
            };
        });

    const result = await apiFetch('/api/usuarios');

    assert.equal(result.status, 401);
    assert.deepEqual(removedLocalItems, ['usuarioLogado']);
    assert.deepEqual(removedSessionItems, ['sessionExpirationAt']);
    assert.deepEqual(redirects, ['/html/login.html']);
    assert.equal(requestOptions.credentials, 'same-origin');
});

test('apiFetch can leave 401 handling to authentication flows and parses 204 as null', async () => {
    const requestCalls = [];
    const { apiFetch, redirects } = createApiContext(async (_url, options) => {
        requestCalls.push(options);
        if (requestCalls.length === 1) {
            return {
                status: 401,
                ok: false,
                headers: { get: () => 'application/json' },
                json: async () => ({ authenticated: false }),
            };
        }
        return {
            status: 204,
            ok: true,
            headers: { get: () => '' },
            text: async () => '',
        };
    });

    const unauthorized = await apiFetch('/api/session', {
        redirectOn401: false,
    });
    const noContent = await apiFetch('/api/resource', { method: 'DELETE' });

    assert.equal(unauthorized.status, 401);
    assert.equal(unauthorized.data.authenticated, false);
    assert.equal(noContent.data, null);
    assert.equal(requestCalls[0].redirectOn401, undefined);
    assert.equal(requestCalls[0].credentials, 'same-origin');
    assert.deepEqual(redirects, []);
});

test('representative application pages load the shared sidebar, toast, and API client', async () => {
    const pages = [
        'index.html',
        'cadastrar-paciente.html',
        'usuarios.html',
        'cadastrar-usuario.html',
        'editar-usuario.html',
    ];

    for (const page of pages) {
        const html = await readFile(
            new URL(`../../frontend/html/${page}`, import.meta.url),
            'utf8'
        );
        assert.match(html, /data-shared-sidebar/);
        assert.match(html, /javascript\/sidebar\.js/);
        assert.match(html, /javascript\/toast\.js/);
        assert.match(html, /javascript\/api\.js/);
    }
});
