import { useEffect } from 'react';

interface ToastProps {
    message: string;
    onClose: () => void;
    durationMs?: number;
}

export default function Toast({ message, onClose, durationMs = 3000 }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(onClose, durationMs);
        return () => clearTimeout(timer);
    }, [onClose, durationMs]);

    return (
        <div
            role="status"
            aria-live="polite"
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
                       bg-gray-800 dark:bg-gray-700 text-white text-sm
                       px-5 py-3 rounded-lg shadow-lg"
        >
            {message}
        </div>
    );
}
