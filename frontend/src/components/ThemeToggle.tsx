import { useState, useEffect } from 'react';

export default function ThemeToggle() {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        setIsDark(document.documentElement.classList.contains('dark'));
    }, []);

    function toggle() {
        const html = document.documentElement;
        if (isDark) {
            html.classList.remove('dark');
        } else {
            html.classList.add('dark');
        }
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
