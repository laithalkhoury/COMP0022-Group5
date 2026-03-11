import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { MovieSummary } from '@/types/dto';
import AddToCollectionPopup from './AddToCollectionPopup';

interface MovieCardProps {
    movie: MovieSummary;
    searchedTag?: string;
}

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

export default function MovieCard({ movie, searchedTag }: MovieCardProps) {
    const [showPopup, setShowPopup] = useState(false);
    const isLoggedIn = !!localStorage.getItem('token');

    return (
        <div className="flex gap-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <img
                src={movie.posterUrl ?? FALLBACK_POSTER}
                alt={`${movie.title} poster`}
                className="w-20 h-[120px] object-cover rounded-lg flex-shrink-0 bg-gray-100 dark:bg-gray-700"
                loading="lazy"
            />

            <div className="flex flex-col gap-2 flex-1 min-w-0">
                {/* Title + collection button */}
                <div className="flex items-start justify-between gap-2">
                    <Link
                        to={`/movie/${movie.id}`}
                        className="font-semibold text-base leading-snug hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-2"
                    >
                        {movie.title}
                    </Link>
                    {isLoggedIn && (
                        <div className="relative flex-shrink-0">
                            <button
                                onClick={() => setShowPopup((v) => !v)}
                                title="Save to collection"
                                aria-label="Save to collection"
                                className="p-1 text-gray-400 hover:text-yellow-500 transition-colors text-lg leading-none"
                            >
                                ☆
                            </button>
                            {showPopup && (
                                <AddToCollectionPopup
                                    movieId={Number(movie.id)}
                                    onClose={() => setShowPopup(false)}
                                />
                            )}
                        </div>
                    )}
                </div>

                {/* Year + runtime */}
                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                    <span>{movie.year}</span>
                    {movie.runtime != null && (
                        <>
                            <span className="text-gray-300 dark:text-gray-600">·</span>
                            <span>{movie.runtime} min</span>
                        </>
                    )}
                </div>

                {/* Star rating */}
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

                {/* Genre + tag chips */}
                <div className="flex flex-wrap gap-1">
                    {movie.genres.map((g) => (
                        <span
                            key={g}
                            className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
                        >
                            {g}
                        </span>
                    ))}
                    {searchedTag && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                            #{searchedTag}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
