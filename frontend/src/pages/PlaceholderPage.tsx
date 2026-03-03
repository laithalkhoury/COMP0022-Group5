interface PlaceholderPageProps {
    title: string;
}

export default function PlaceholderPage({ title }: PlaceholderPageProps) {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center p-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm max-w-sm w-full">
                <div className="text-4xl mb-4">&#128679;</div>
                <h1 className="text-xl font-semibold mb-2">{title}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Coming soon.</p>
            </div>
        </div>
    );
}
