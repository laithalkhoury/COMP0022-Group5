export function Spinner() {
    return (
        <div className="flex justify-center items-center py-16">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );
}

export function ErrorPanel({
    message,
    onRetry,
}: {
    message: string;
    onRetry: () => void;
}) {
    return (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-red-600 dark:text-red-400 font-medium">{message}</p>
            <button
                onClick={onRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
            >
                Retry
            </button>
        </div>
    );
}

export function EmptyState() {
    return (
        <div className="py-16 text-center text-gray-500 dark:text-gray-400">
            No results found.
        </div>
    );
}

export function DetailSkeleton() {
    return (
        <div className="flex gap-6 animate-pulse">
            <div className="w-48 h-72 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="flex-1 space-y-4 pt-2">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
            </div>
        </div>
    );
}

export function CardSkeleton() {
    return (
        <div className="flex gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg animate-pulse">
            <div className="w-20 h-[120px] bg-gray-200 dark:bg-gray-700 rounded flex-shrink-0" />
            <div className="flex-1 space-y-3 py-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                <div className="flex gap-2">
                    <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
                    <div className="h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
                </div>
            </div>
        </div>
    );
}
