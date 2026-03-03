import { Link } from 'react-router-dom';
import type { MovieSummary } from '@/types/dto';

interface MovieCardProps {
    movie: MovieSummary;
    searchedTag?: string;
    onAddToPlanner: () => void;
}

const FALLBACK_POSTER = 'https://placehold.co/80x120?text=No+Image';

export default function MovieCard({ movie, searchedTag, onAddToPlanner }: MovieCardProps) {
    return (
        <div className="flex gap-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <img
                src={movie.posterUrl ?? FALLBACK_POSTER}
                alt={`${movie.title} poster`}
                className="w-20 h-[120px] object-cover rounded flex-shrink-0"
                loading="lazy"
            />

            <div className="flex flex-col gap-2 flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <Link
                        to={`/movie/${movie.id}`}
                        className="font-semibold text-base leading-snug hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-2"
                    >
                        {movie.title}
                    </Link>
                    <button
                        onClick={onAddToPlanner}
                        title="Add to Planner"
                        aria-label="Add to Planner"
                        className="flex-shrink-0 p-1 text-gray-400 hover:text-blue-500 transition-colors"
                    >
                        &#9734;
                    </button>
                </div>

                <div className="text-sm text-gray-500 dark:text-gray-400">
                    {movie.year}
                    {movie.avgRating !== null && (
                        <span className="ml-3">
                            &#9733; {movie.avgRating.toFixed(1)}
                            {movie.ratingCount !== null && (
                                <span className="text-xs ml-1">
                                    ({movie.ratingCount.toLocaleString()})
                                </span>
                            )}
                        </span>
                    )}
                </div>

                <div className="flex flex-wrap gap-1">
                    {movie.genres.map((g) => (
                        <span
                            key={g}
                            className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
                        >
                            {g}
                        </span>
                    ))}
                    {searchedTag && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                            Tag: {searchedTag}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
