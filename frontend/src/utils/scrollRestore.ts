export function saveScroll(key: string): void {
    sessionStorage.setItem(`scroll:${key}`, String(window.scrollY));
}

export function restoreScroll(key: string): void {
    const saved = sessionStorage.getItem(`scroll:${key}`);
    if (saved !== null) {
        window.scrollTo({ top: Number(saved), behavior: 'instant' });
    }
}
