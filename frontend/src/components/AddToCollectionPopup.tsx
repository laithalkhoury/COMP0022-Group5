import { useState, useEffect, useRef } from 'react';
import type { CollectionSummary } from '@/types/dto';
import { getCollections, createCollection, addMovieToCollection } from '@/api/collections';

interface AddToCollectionPopupProps {
    movieId: number;
    onClose: () => void;
}

export default function AddToCollectionPopup({ movieId, onClose }: AddToCollectionPopupProps) {
    const [collections, setCollections] = useState<CollectionSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [feedback, setFeedback] = useState<string | null>(null);
    const popupRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        getCollections()
            .then(setCollections)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    // Close on click outside
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
                onClose();
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [onClose]);

    async function handleAdd(collectionId: number) {
        try {
            await addMovieToCollection(collectionId, movieId);
            setFeedback('Added!');
            setTimeout(onClose, 600);
        } catch (e: any) {
            setFeedback(e.message?.includes('409') || e.message?.includes('already') ? 'Already in collection' : 'Error');
            setTimeout(() => setFeedback(null), 1500);
        }
    }

    async function handleCreate() {
        if (!newName.trim()) return;
        try {
            const col = await createCollection(newName.trim());
            await addMovieToCollection(col.collectionId, movieId);
            setFeedback('Created & added!');
            setTimeout(onClose, 600);
        } catch {
            setFeedback('Error creating collection');
            setTimeout(() => setFeedback(null), 1500);
        }
    }

    return (
        <div
            ref={popupRef}
            className="absolute right-0 top-full mt-1 z-50 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Add to collection
                </p>
            </div>

            {feedback && (
                <div className="px-3 py-2 text-xs font-medium text-center text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30">
                    {feedback}
                </div>
            )}

            <div className="max-h-48 overflow-y-auto">
                {loading && (
                    <div className="px-3 py-4 text-center text-xs text-gray-400">Loading...</div>
                )}

                {!loading && collections.length === 0 && !creating && (
                    <div className="px-3 py-3 text-center text-xs text-gray-400">
                        No collections yet
                    </div>
                )}

                {!loading &&
                    collections.map((col) => (
                        <button
                            key={col.collectionId}
                            onClick={() => handleAdd(col.collectionId)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
                        >
                            <span className="truncate">{col.collectionName}</span>
                            <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                                {col.movieCount}
                            </span>
                        </button>
                    ))}
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700 px-3 py-2">
                {creating ? (
                    <div className="flex gap-1">
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                            placeholder="Collection name"
                            autoFocus
                            className="flex-1 text-sm px-2 py-1 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                            onClick={handleCreate}
                            className="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
                        >
                            Add
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setCreating(true)}
                        className="w-full text-left text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                    >
                        + New collection
                    </button>
                )}
            </div>
        </div>
    );
}
