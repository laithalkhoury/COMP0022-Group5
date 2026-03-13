import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMovie } from '@/api/movies';
import type { MovieDetail, CrewMember } from '@/types/dto';
import { ErrorPanel, DetailSkeleton } from '@/components/ui';
import AddToCollectionPopup from '@/components/AddToCollectionPopup';

const FALLBACK_POSTER = 'https://placehold.co/300x450?text=No+Image';

// ---- Sub-components ----

function StarRating({ rating, max = 5, label }: { rating: number; max?: number; label?: string }) {
    const pct = Math.min(100, Math.max(0, (rating / max) * 100));
    return (
        <div className="flex items-center gap-2">
            <span
                className="relative text-xl leading-none text-gray-300 dark:text-gray-600"
                title={`${rating.toFixed(2)} / ${max}`}
            >
                <span aria-hidden>★★★★★</span>
                <span
                    className="absolute inset-0 overflow-hidden text-yellow-400"
                    style={{ width: `${pct}%` }}
                    aria-hidden
                >
                    ★★★★★
                </span>
            </span>
            <span className="font-bold text-lg">{rating.toFixed(1)}</span>
            <span className="text-sm text-gray-400">/ {max}</span>
            {label && <span className="text-xs text-gray-400 ml-1">({label})</span>}
        </div>
    );
}

function Badge({ children, color = 'gray' }: { children: React.ReactNode; color?: string }) {
    const colors: Record<string, string> = {
        gray: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
        blue: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700',
    };
    return (
        <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${colors[color] ?? colors.gray}`}>
            {children}
        </span>
    );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
    if (!value) return null;
    return (
        <div className="flex gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
            <dt className="w-28 flex-shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-400">
                {label}
            </dt>
            <dd className="text-sm text-gray-800 dark:text-gray-200">{value}</dd>
        </div>
    );
}

function CrewSection({ crew }: { crew: CrewMember[] }) {
    if (!crew.length) return null;

    const grouped = crew.reduce<Record<string, CrewMember[]>>((acc, member) => {
        const role = member.role || 'Other';
        if (!acc[role]) acc[role] = [];
        acc[role].push(member);
        return acc;
    }, {});

    const roleOrder = ['director', 'producer', 'writer', 'actor', 'actress', 'self'];
    const sortedRoles = Object.keys(grouped).sort((a, b) => {
        const ai = roleOrder.findIndex((r) => a.toLowerCase().includes(r));
        const bi = roleOrder.findIndex((r) => b.toLowerCase().includes(r));
        if (ai === -1 && bi === -1) return a.localeCompare(b);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
    });

    return (
        <div>
            <h2 className="text-base font-semibold mb-3">Cast &amp; Crew</h2>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-gray-700/50">
                            <th className="text-left px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                Name
                            </th>
                            <th className="text-left px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                Role
                            </th>
                            <th className="text-left px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                Character
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {sortedRoles.flatMap((role) =>
                            grouped[role].map((member, i) => (
                                <tr
                                    key={`${role}-${member.name}-${i}`}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                                >
                                    <td className="px-4 py-2 font-medium">{member.name}</td>
                                    <td className="px-4 py-2 text-gray-500 dark:text-gray-400 capitalize">{member.role}</td>
                                    <td className="px-4 py-2 text-gray-500 dark:text-gray-400 italic">
                                        {member.character ?? '—'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ---- Main page ----

export default function MovieDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [movie, setMovie] = useState<MovieDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCollectionPopup, setShowCollectionPopup] = useState(false);
    const isLoggedIn = !!localStorage.getItem('token');

    const fetchData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            const data = await getMovie(id);
            setMovie(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) return <DetailSkeleton />;
    if (error) return <ErrorPanel message={error} onRetry={fetchData} />;
    if (!movie) return null;

    return (
        <div className="space-y-8">
            <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
                ← Back to results
            </button>

            {/* Hero */}
            <div className="flex flex-col md:flex-row gap-8">
                {/* Poster placeholder */}
                <div className="flex-shrink-0">
                    <img
                        src={movie.posterUrl ?? FALLBACK_POSTER}
                        alt={`${movie.title} poster`}
                        className="w-52 rounded-xl shadow-lg object-cover bg-gray-100 dark:bg-gray-700"
                    />
                </div>

                {/* Details */}
                <div className="flex-1 space-y-4">
                    <div>
                        <div className="flex items-start justify-between gap-3">
                            <h1 className="text-3xl font-bold leading-tight">{movie.title}</h1>
                            {isLoggedIn && (
                                <div className="relative flex-shrink-0 mt-1">
                                    <button
                                        onClick={() => setShowCollectionPopup((v) => !v)}
                                        title="Save to collection"
                                        aria-label="Save to collection"
                                        className="p-1.5 text-gray-400 hover:text-yellow-500 transition-colors text-2xl leading-none"
                                    >
                                        ☆
                                    </button>
                                    {showCollectionPopup && (
                                        <AddToCollectionPopup
                                            movieId={Number(movie.id)}
                                            onClose={() => setShowCollectionPopup(false)}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-gray-500 dark:text-gray-400">
                            <span className="font-medium">{movie.year}</span>
                            {movie.runtime != null && (
                                <><span>·</span><span>{movie.runtime} min</span></>
                            )}
                        </div>
                    </div>

                    {/* Genres */}
                    {movie.genres.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {movie.genres.map((g) => (
                                <Badge key={g} color="blue">{g}</Badge>
                            ))}
                        </div>
                    )}

                    {/* Rating */}
                    {movie.avgRating != null && (
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
                                Average Rating
                            </p>
                            <StarRating
                                rating={movie.avgRating}
                                max={5}
                                label={
                                    movie.ratingCount != null
                                        ? `${movie.ratingCount.toLocaleString()} ratings`
                                        : undefined
                                }
                            />
                        </div>
                    )}

                    {/* Quick info */}
                    <dl className="pt-1">
                        <InfoRow label="Director" value={movie.director} />
                        <InfoRow label="Actors" value={movie.actors?.slice(0, 5).join(', ')} />
                    </dl>
                </div>
            </div>

            {/* Crew table */}
            {movie.crew.length > 0 && <CrewSection crew={movie.crew} />}

            {/* Tags */}
            {movie.tags.length > 0 && (
                <div>
                    <h2 className="text-base font-semibold mb-3">User Tags</h2>
                    <div className="flex flex-wrap gap-2">
                        {movie.tags.map((t) => (
                            <Badge key={t} color="gray">#{t}</Badge>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
