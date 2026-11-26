(function () {
    function ensureContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.setAttribute('aria-live', 'polite');
            container.setAttribute('aria-atomic', 'true');
            Object.assign(container.style, {
                position: 'fixed',
                top: '24px',
                right: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                zIndex: '10000',
                pointerEvents: 'none',
            });
            document.body.appendChild(container);
        }
        return container;
    }

    function showToast(message, options) {
        if (typeof options === 'string') {
            options = { type: options };
        }
        const opts = Object.assign(
            { type: 'info', duration: 3500 },
            options || {}
        );

        const container = ensureContainer();
        const toast = document.createElement('div');
        toast.className = `toast toast-${opts.type}`;

        const palette = {
            success: {
                bg: '#dcfce7',
                color: '#166534',
                border: '#86efac',
                icon: 'check-circle',
            },
            error: {
                bg: '#fee2e2',
                color: '#991b1b',
                border: '#fca5a5',
                icon: 'alert-circle',
            },
            warning: {
                bg: '#fef3c7',
                color: '#92400e',
                border: '#fcd34d',
                icon: 'alert-triangle',
            },
            info: {
                bg: '#eff6ff',
                color: '#1e3a8a',
                border: '#93c5fd',
                icon: 'info',
            },
        };
        const theme = palette[opts.type] || palette.info;

        Object.assign(toast.style, {
            pointerEvents: 'auto',
            minWidth: '280px',
            maxWidth: '420px',
            background: theme.bg,
            color: theme.color,
            border: `1px solid ${theme.border}`,
            padding: '12px 14px',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            opacity: '0',
            transform: 'translateX(16px)',
            transition: 'opacity 0.25s ease, transform 0.25s ease',
        });

        const text = document.createElement('span');
        text.textContent = String(message == null ? '' : message);
        text.style.flex = '1';

        if (window.lucide) {
            const icon = document.createElement('i');
            icon.setAttribute('data-lucide', theme.icon);
            icon.style.width = '18px';
            icon.style.height = '18px';
            icon.style.flexShrink = '0';
            toast.appendChild(icon);
        }

        toast.appendChild(text);
        container.appendChild(toast);

        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons({ root: toast });
        }

        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        });

        const remove = () => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(16px)';
            setTimeout(() => toast.remove(), 250);
        };

        if (opts.duration > 0) {
            setTimeout(remove, opts.duration);
        }

        return { remove };
    }

    window.showToast = showToast;
})();
