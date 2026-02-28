interface PaginationProps {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

const MAX_VISIBLE = 7;

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
    if (totalPages <= 1) return null;

    function getPageNumbers(): (number | '...')[] {
        if (totalPages <= MAX_VISIBLE) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        const around = new Set(
            [1, totalPages, page - 2, page - 1, page, page + 1, page + 2].filter(
                (p) => p >= 1 && p <= totalPages
            )
        );
        const sorted = Array.from(around).sort((a, b) => a - b);
        const result: (number | '...')[] = [];
        for (let i = 0; i < sorted.length; i++) {
            if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('...');
            result.push(sorted[i]);
        }
        return result;
    }

    const pages = getPageNumbers();

    return (
        <div className="flex items-center justify-center gap-2 mt-8">
            <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600
                           disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
                Prev
            </button>
            {pages.map((p, i) =>
                p === '...' ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-gray-500">
                        &hellip;
                    </span>
                ) : (
                    <button
                        key={p}
                        onClick={() => onPageChange(p)}
                        className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                            p === page
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                    >
                        {p}
                    </button>
                )
            )}
            <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600
                           disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
                Next
            </button>
        </div>
    );
}
