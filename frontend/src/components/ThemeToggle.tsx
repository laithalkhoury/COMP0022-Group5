import { useState, useEffect } from 'react';

export default function ThemeToggle() {
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('theme');
        return saved ? saved === 'dark' : document.documentElement.classList.contains('dark');
    });

    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }, [isDark]);

    function toggle() {
        setIsDark(!isDark);
    }

    return (
        <button
            onClick={toggle}
            aria-label="Toggle dark mode"
            className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600
                       hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
            {isDark ? '\u2600 Light' : '\u263E Dark'}
        </button>
    );
}
