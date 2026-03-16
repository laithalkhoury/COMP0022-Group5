import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import type { CollectionSummary, CollectionMovie } from '@/types/dto';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
    getCollections,
    createCollection,
    updateCollection,
    deleteCollection,
    reorderCollections,
    getCollectionMovies,
    removeMovieFromCollection,
    reorderCollectionMovies,
} from '@/api/collections';

const FALLBACK_POSTER =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='120' viewBox='0 0 80 120'%3E%3Crect width='80' height='120' fill='%23e5e7eb'/%3E%3Ctext x='40' y='65' text-anchor='middle' fill='%239ca3af' font-size='11' font-family='sans-serif'%3ENo%20Image%3C/text%3E%3C/svg%3E";

function StarRating({ rating }: { rating: number }) {
    const pct = Math.min(100, Math.max(0, (rating / 5) * 100));
    return (
        <span className="inline-flex items-center gap-1" title={`${rating.toFixed(2)} / 5`}>
            <span className="relative text-lg leading-none text-gray-300 dark:text-gray-600">
                <span aria-hidden>★★★★★</span>
                <span
                    className="absolute inset-0 overflow-hidden text-yellow-400"
                    style={{ width: `${pct}%` }}
                    aria-hidden
                >
                    ★★★★★
                </span>
            </span>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {rating.toFixed(1)}
            </span>
        </span>
    );
}

// ---- Left Sidebar ----

interface SidebarProps {
    collections: CollectionSummary[];
    selectedId: number | null;
    onSelect: (id: number) => void;
    onCreate: (name: string) => void;
    onRename: (id: number, name: string) => void;
    onDelete: (id: number) => void;
    onReorder: (collections: CollectionSummary[]) => void;
}

function Sidebar({ collections, selectedId, onSelect, onCreate, onRename, onDelete, onReorder }: SidebarProps) {
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<CollectionSummary | null>(null);
    const dragItem = useRef<number | null>(null);
    const dragOver = useRef<number | null>(null);

    function handleCreate() {
        if (!newName.trim()) return;
        onCreate(newName.trim());
        setNewName('');
        setCreating(false);
    }

    function handleRenameSubmit(id: number) {
        if (editName.trim()) {
            onRename(id, editName.trim());
        }
        setEditingId(null);
    }

    function handleDragStart(idx: number) {
        dragItem.current = idx;
    }

    function handleDragEnter(idx: number) {
        dragOver.current = idx;
    }

    function handleDrop() {
        if (dragItem.current === null || dragOver.current === null || dragItem.current === dragOver.current) return;
        const items = [...collections];
        const [dragged] = items.splice(dragItem.current, 1);
        items.splice(dragOver.current, 0, dragged);
        dragItem.current = null;
        dragOver.current = null;
        onReorder(items);
    }

    return (
        <>
        <div className="w-[280px] flex-shrink-0 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-900">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">My Collections</h2>
                <button
                    onClick={() => setCreating(true)}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors text-lg leading-none"
                    title="New collection"
                >
                    +
                </button>
            </div>

            {creating && (
                <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex gap-1">
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCreate();
                                if (e.key === 'Escape') setCreating(false);
                            }}
                            placeholder="Collection name"
                            autoFocus
                            className="flex-1 text-sm px-2 py-1 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                            onClick={handleCreate}
                            className="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
                        >
                            Add
                        </button>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto">
                {collections.length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-gray-400">
                        No collections yet. Create one to get started.
                    </div>
                )}

                {collections.map((col, idx) => (
                    <div
                        key={col.collectionId}
                        draggable
                        onDragStart={() => handleDragStart(idx)}
                        onDragEnter={() => handleDragEnter(idx)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        onClick={() => onSelect(col.collectionId)}
                        className={`group px-4 py-3 cursor-pointer border-b border-gray-100 dark:border-gray-800 transition-colors ${
                            selectedId === col.collectionId
                                ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-l-blue-500'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-800 border-l-2 border-l-transparent'
                        }`}
                    >
                        {editingId === col.collectionId ? (
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleRenameSubmit(col.collectionId);
                                    if (e.key === 'Escape') setEditingId(null);
                                }}
                                onBlur={() => handleRenameSubmit(col.collectionId)}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                                className="w-full text-sm px-2 py-0.5 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        ) : (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-sm font-medium truncate text-gray-800 dark:text-gray-200">
                                        {col.collectionName}
                                    </span>
                                    <span className="text-xs text-gray-400 flex-shrink-0">
                                        {col.movieCount}
                                    </span>
                                </div>
                                <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingId(col.collectionId);
                                            setEditName(col.collectionName);
                                        }}
                                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                        title="Rename"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDeleteTarget(col);
                                        }}
                                        className="p-1 text-gray-400 hover:text-red-600 transition-colors text-xs"
                                        title="Delete"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>

        {deleteTarget && (
            <ConfirmDialog
                title="Delete collection"
                message={`"${deleteTarget.collectionName}" and all its items will be permanently deleted.`}
                onConfirm={() => {
                    onDelete(deleteTarget.collectionId);
                    setDeleteTarget(null);
                }}
                onCancel={() => setDeleteTarget(null)}
            />
        )}
        </>
    );
}

// ---- Right Panel: Collection Detail ----

interface CollectionDetailProps {
    collection: CollectionSummary;
    movies: CollectionMovie[];
    onUpdateNotes: (notes: string) => void;
    onRemoveMovie: (movieId: number) => void;
    onReorderMovies: (movies: CollectionMovie[]) => void;
}

function CollectionDetail({ collection, movies, onUpdateNotes, onRemoveMovie }: CollectionDetailProps) {
    const [notes, setNotes] = useState(collection.notes ?? '');
    const [removeTarget, setRemoveTarget] = useState<CollectionMovie | null>(null);

    useEffect(() => {
        setNotes(collection.notes ?? '');
    }, [collection.collectionId, collection.notes]);

    // Group movies by genre; a movie with multiple genres appears under each
    const genreGroups: Record<string, CollectionMovie[]> = {};
    for (const movie of movies) {
        const genres = movie.genres.length > 0 ? movie.genres : ['Uncategorised'];
        for (const genre of genres) {
            if (!genreGroups[genre]) genreGroups[genre] = [];
            genreGroups[genre].push(movie);
        }
    }
    const sortedGenres = Object.keys(genreGroups).sort();

    function MovieCard({ movie }: { movie: CollectionMovie }) {
        return (
            <div className="flex gap-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow group">
                <Link to={`/movie/${movie.id}`} className="flex-shrink-0">
                    <img
                        src={movie.posterUrl ?? FALLBACK_POSTER}
                        alt={`${movie.title} poster`}
                        className="w-20 h-[120px] object-cover rounded-lg bg-gray-100 dark:bg-gray-700"
                        loading="lazy"
                    />
                </Link>

                <div className="flex flex-col gap-2 flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <Link
                            to={`/movie/${movie.id}`}
                            className="font-semibold text-base leading-snug hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-2"
                        >
                            {movie.title}
                        </Link>
                        <button
                            onClick={() => setRemoveTarget(movie)}
                            className="flex-shrink-0 p-1 text-gray-300 hover:text-red-500 transition-colors text-sm leading-none opacity-0 group-hover:opacity-100"
                            title="Remove from collection"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                        <span>{movie.year}</span>
                        {movie.runtime != null && (
                            <>
                                <span className="text-gray-300 dark:text-gray-600">·</span>
                                <span>{movie.runtime} min</span>
                            </>
                        )}
                    </div>

                    {movie.avgRating != null && (
                        <div className="flex items-center gap-2">
                            <StarRating rating={movie.avgRating} />
                            {movie.ratingCount != null && (
                                <span className="text-xs text-gray-400">
                                    ({movie.ratingCount.toLocaleString()} ratings)
                                </span>
                            )}
                        </div>
                    )}

                    <div className="flex flex-wrap gap-1">
                        {movie.genres.map((g) => (
                            <span
                                key={g}
                                className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
                            >
                                {g}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
        <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {collection.collectionName}
                </h1>

                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onBlur={() => onUpdateNotes(notes)}
                    placeholder="Add notes about this collection..."
                    rows={2}
                    className="w-full text-sm px-3 py-2 mb-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none placeholder-gray-400"
                />

                {movies.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <div className="text-4xl mb-3">🎬</div>
                        <p className="text-sm">No movies yet. Browse the dashboard and use the ☆ button to add movies.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {sortedGenres.map((genre) => (
                            <div key={genre}>
                                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3 border-b border-gray-100 dark:border-gray-800 pb-1">
                                    {genre}
                                </h2>
                                <div className="space-y-3">
                                    {genreGroups[genre].map((movie) => (
                                        <MovieCard key={movie.id} movie={movie} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

        {removeTarget && (
            <ConfirmDialog
                title="Remove movie"
                message={`"${removeTarget.title}" will be removed from this collection.`}
                confirmLabel="Remove"
                onConfirm={() => {
                    onRemoveMovie(Number(removeTarget.id));
                    setRemoveTarget(null);
                }}
                onCancel={() => setRemoveTarget(null)}
            />
        )}
        </>
    );
}

// ---- Main Page ----

export default function UserMoviePage() {
    const navigate = useNavigate();
    const [collections, setCollections] = useState<CollectionSummary[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(() => {
        const saved = localStorage.getItem('selectedCollectionId');
        return saved ? Number(saved) : null;
    });
    const [movies, setMovies] = useState<CollectionMovie[]>([]);
    const [loading, setLoading] = useState(true);
    const [moviesLoading, setMoviesLoading] = useState(false);
    const reorderTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // Auth guard
    useEffect(() => {
        if (!localStorage.getItem('token')) {
            navigate('/login', { replace: true });
        }
    }, [navigate]);

    // Fetch collections
    const fetchCollections = useCallback(async () => {
        try {
            const data = await getCollections();
            setCollections(data);
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (localStorage.getItem('token')) {
            fetchCollections().then(() => {
                // Validate saved selection still exists after collections load
                setCollections((prev) => {
                    if (selectedId != null && !prev.find((c) => c.collectionId === selectedId)) {
                        setSelectedId(null);
                    }
                    return prev;
                });
            });
        }
    }, [fetchCollections]);

    // Persist selected collection
    useEffect(() => {
        if (selectedId != null) {
            localStorage.setItem('selectedCollectionId', String(selectedId));
        } else {
            localStorage.removeItem('selectedCollectionId');
        }
    }, [selectedId]);

    // Fetch movies when selection changes
    useEffect(() => {
        if (selectedId == null) {
            setMovies([]);
            return;
        }
        setMoviesLoading(true);
        getCollectionMovies(selectedId)
            .then(setMovies)
            .catch(() => setMovies([]))
            .finally(() => setMoviesLoading(false));
    }, [selectedId]);

    async function handleCreate(name: string) {
        try {
            const col = await createCollection(name);
            setCollections((prev) => [...prev, col]);
            setSelectedId(col.collectionId);
        } catch {
            // ignore
        }
    }

    async function handleRename(id: number, name: string) {
        try {
            const updated = await updateCollection(id, { name });
            setCollections((prev) => prev.map((c) => (c.collectionId === id ? { ...c, collectionName: updated.collectionName } : c)));
        } catch {
            // ignore
        }
    }

    async function handleDelete(id: number) {
        try {
            await deleteCollection(id);
            if (selectedId === id) {
                setSelectedId(null);
                setMovies([]);
            }
            await fetchCollections();
        } catch {
            // ignore
        }
    }

    function handleReorderCollections(reordered: CollectionSummary[]) {
        setCollections(reordered);
        clearTimeout(reorderTimeout.current);
        reorderTimeout.current = setTimeout(() => {
            const order = reordered.map((c, i) => ({ collectionId: c.collectionId, sortOrder: i }));
            reorderCollections(order).catch(() => {});
        }, 500);
    }

    async function handleUpdateNotes(notes: string) {
        if (selectedId == null) return;
        try {
            await updateCollection(selectedId, { notes });
            setCollections((prev) =>
                prev.map((c) => (c.collectionId === selectedId ? { ...c, notes } : c))
            );
        } catch {
            // ignore
        }
    }

    async function handleRemoveMovie(movieId: number) {
        if (selectedId == null) return;
        try {
            await removeMovieFromCollection(selectedId, movieId);
            setMovies((prev) => prev.filter((m) => Number(m.id) !== movieId));
            await fetchCollections();
        } catch {
            // ignore
        }
    }

    function handleReorderMovies(reordered: CollectionMovie[]) {
        setMovies(reordered);
        if (selectedId == null) return;
        clearTimeout(reorderTimeout.current);
        const colId = selectedId;
        reorderTimeout.current = setTimeout(() => {
            const order = reordered.map((m, i) => ({ movieId: Number(m.id), sortOrder: i }));
            reorderCollectionMovies(colId, order).catch(() => {});
        }, 500);
    }

    const selectedCollection = collections.find((c) => c.collectionId === selectedId) ?? null;

    if (!localStorage.getItem('token')) return null;

    return (
        <div className="flex" style={{ height: 'calc(100vh - 3.5rem)' }}>
            <Sidebar
                collections={collections}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onCreate={handleCreate}
                onRename={handleRename}
                onDelete={handleDelete}
                onReorder={handleReorderCollections}
            />

            {selectedCollection ? (
                moviesLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-gray-400 text-sm">Loading movies...</div>
                    </div>
                ) : (
                    <CollectionDetail
                        collection={selectedCollection}
                        movies={movies}
                        onUpdateNotes={handleUpdateNotes}
                        onRemoveMovie={handleRemoveMovie}
                        onReorderMovies={handleReorderMovies}
                    />
                )
            ) : (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-gray-400">
                        <div className="text-5xl mb-4">📚</div>
                        <p className="text-sm">
                            {loading ? 'Loading...' : 'Select a collection to view movies'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
