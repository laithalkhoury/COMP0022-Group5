import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMovie } from '@/api/movies';
import type { MovieDetail } from '@/types/dto';
import { ErrorPanel, DetailSkeleton } from '@/components/ui';

const FALLBACK_POSTER = 'https://placehold.co/300x450?text=No+Image';

export default function MovieDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [movie, setMovie] = useState<MovieDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

    const formatValue = (val: string | number | null | undefined): string => {
        if (val === null || val === undefined || val === '') return 'N/A';
        return String(val);
    };

    const formatArray = (arr: string[] | null | undefined): string => {
        if (!arr || arr.length === 0) return 'N/A';
        return arr.join(', ');
    };

    return (
        <div>
            <button
                onClick={() => navigate(-1)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-6 inline-block"
            >
                &larr; Back to results
            </button>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Poster */}
                <img
                    src={movie.posterUrl ?? FALLBACK_POSTER}
                    alt={`${movie.title} poster`}
                    className="w-60 h-auto rounded-lg shadow-md flex-shrink-0 object-cover"
                />

                {/* Details */}
                <div className="flex-1 space-y-4">
                    <h1 className="text-2xl font-bold">{movie.title}</h1>

                    <div className="text-gray-500 dark:text-gray-400">
                        {movie.year}
                        {movie.avgRating !== null && (
                            <span className="ml-4">
                                &#9733; {movie.avgRating.toFixed(1)}
                                {movie.ratingCount !== null && (
                                    <span className="text-sm ml-1">
                                        ({movie.ratingCount.toLocaleString()} ratings)
                                    </span>
                                )}
                            </span>
                        )}
                    </div>

                    {/* Genres */}
                    <div className="flex flex-wrap gap-2">
                        {movie.genres.map((g) => (
                            <span
                                key={g}
                                className="px-3 py-1 text-sm rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
                            >
                                {g}
                            </span>
                        ))}
                    </div>

                    {/* Tags */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Tags
                        </h3>
                        {movie.tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                                {movie.tags.map((t) => (
                                    <span
                                        key={t}
                                        className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
                                    >
                                        {t}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400">N/A</p>
                        )}
                    </div>

                    {/* Additional fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <InfoField label="Director" value={formatValue(movie.director)} />
                        <InfoField label="Actors" value={formatArray(movie.actors)} />
                        <InfoField label="Awards" value={formatArray(movie.awards)} />
                        <InfoField label="Box Office" value={formatValue(movie.boxOffice)} />
                        <InfoField
                            label="Critic Score"
                            value={
                                movie.criticScore !== null && movie.criticScore !== undefined
                                    ? String(movie.criticScore)
                                    : 'N/A'
                            }
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoField({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</dt>
            <dd className="text-sm mt-0.5">{value}</dd>
        </div>
    );
}
