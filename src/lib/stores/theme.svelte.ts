import { browser } from '$app/environment';

type Theme = 'light' | 'dark' | 'system';

function createThemeStore() {
    let current = $state<Theme>('system');
    let resolved = $state<'light' | 'dark'>('light');

    function apply(theme: Theme) {
        if (!browser) return;

        const root = document.documentElement;
        let targetTheme: 'light' | 'dark' = 'light';

        if (theme === 'system') {
            const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            targetTheme = isSystemDark ? 'dark' : 'light';
        } else {
            targetTheme = theme;
        }

        resolved = targetTheme;

        // Set data-theme for DaisyUI
        root.setAttribute('data-theme', targetTheme);

        // Set class for Tailwind dark mode
        if (targetTheme === 'dark') {
            root.classList.add('dark');
            root.classList.remove('light');
        } else {
            root.classList.add('light');
            root.classList.remove('dark');
        }

        // Save to localStorage
        localStorage.setItem('theme', theme);
    }

    function init() {
        if (!browser) return;

        const saved = (localStorage.getItem('theme') as Theme) || 'system';
        current = saved;
        apply(saved);

        // Listen for system changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', () => {
            if (current === 'system') {
                apply('system');
            }
        });
    }

    return {
        get current() {
            return current;
        },
        get resolved() {
            return resolved;
        },
        setTheme(theme: Theme) {
            current = theme;
            apply(theme);
        },
        init
    };
}

export const theme = createThemeStore();
