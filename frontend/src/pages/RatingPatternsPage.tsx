import { useState, useEffect, useRef, useCallback } from 'react';
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    ResponsiveContainer,
    Label,
} from 'recharts';
import { getFilterOptions } from '@/api/filters';
import { getScatterData, searchMovies } from '@/api/ratingPatterns';
import type {
    FilterOptions,
    ScatterResponse,
    MovieSearchResult,
} from '@/types/dto';
import { Spinner, ErrorPanel, EmptyState } from '@/components/ui';

function interpretCorrelation(r: number | null): string {
    if (r === null) return 'Not enough data to compute correlation.';
    const abs = Math.abs(r);
    let strength: string;
    if (abs < 0.2) strength = 'very weak';
    else if (abs < 0.4) strength = 'weak';
    else if (abs < 0.6) strength = 'moderate';
    else if (abs < 0.8) strength = 'strong';
    else strength = 'very strong';

    const direction =
        r > 0
            ? 'tend to also rate the genre lower'
            : 'tend to rate the genre higher';

    return `${strength.charAt(0).toUpperCase() + strength.slice(1)} ${r > 0 ? 'positive' : 'negative'} correlation (r = ${r.toFixed(4)}). Viewers who rate this movie low ${direction}.`;
}

export default function RatingPatternsPage() {
    const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(
        null
    );
    const [loadingOptions, setLoadingOptions] = useState(true);

    // Movie typeahead
    const [movieQuery, setMovieQuery] = useState('');
    const [movieResults, setMovieResults] = useState<MovieSearchResult[]>([]);
    const [selectedMovie, setSelectedMovie] = useState<MovieSearchResult | null>(
        null
    );
    const [showDropdown, setShowDropdown] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Genre
    const [selectedGenre, setSelectedGenre] = useState('');

    // Scatter data
    const [scatterData, setScatterData] = useState<ScatterResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load genre options on mount
    useEffect(() => {
        getFilterOptions()
            .then(setFilterOptions)
            .finally(() => setLoadingOptions(false));
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target as Node)
            ) {
                setShowDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Debounced movie search
    const handleMovieQueryChange = useCallback((value: string) => {
        setMovieQuery(value);
        setSelectedMovie(null);

        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (value.trim().length < 2) {
            setMovieResults([]);
            setShowDropdown(false);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            try {
                const results = await searchMovies(value.trim());
                setMovieResults(results);
                setShowDropdown(results.length > 0);
            } catch {
                setMovieResults([]);
            }
        }, 300);
    }, []);

    // Select movie from dropdown
    const handleSelectMovie = (movie: MovieSearchResult) => {
        setSelectedMovie(movie);
        setMovieQuery(movie.title);
        setShowDropdown(false);
        setMovieResults([]);
    };

    // Fetch scatter data when both selections are made
    useEffect(() => {
        if (!selectedMovie || !selectedGenre) {
            setScatterData(null);
            return;
        }

        setLoading(true);
        setError(null);

        getScatterData(selectedMovie.movieId, selectedGenre)
            .then(setScatterData)
            .catch((err) =>
                setError(err instanceof Error ? err.message : 'Failed to load data')
            )
            .finally(() => setLoading(false));
    }, [selectedMovie, selectedGenre]);

    if (loadingOptions) {
        return (
            <div className="flex justify-center py-20">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 px-4">
            <header>
                <h1 className="text-2xl font-bold">Rating Pattern Analysis</h1>
                <p className="text-gray-500 dark:text-gray-400">
                    Analyse whether viewers who give low ratings to one film also
                    give low ratings to others in the same or different genres.
                </p>
            </header>

            {/* Controls */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Movie typeahead */}
                    <div className="relative" ref={dropdownRef}>
                        <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">
                            Select Movie
                        </label>
                        <input
                            type="text"
                            value={movieQuery}
                            onChange={(e) => handleMovieQueryChange(e.target.value)}
                            placeholder="Type to search, e.g. Toy Story"
                            className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-transparent focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        {showDropdown && movieResults.length > 0 && (
                            <ul className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                {movieResults.map((m) => (
                                    <li
                                        key={m.movieId}
                                        onClick={() => handleSelectMovie(m)}
                                        className="px-4 py-2 text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <span className="font-medium">{m.title}</span>
                                        {m.year && (
                                            <span className="text-gray-400 ml-2">
                                                ({m.year})
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Genre dropdown */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">
                            Select Genre
                        </label>
                        <select
                            value={selectedGenre}
                            onChange={(e) => setSelectedGenre(e.target.value)}
                            className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-transparent focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">-- Choose a genre --</option>
                            {filterOptions?.genres.map((g) => (
                                <option key={g} value={g}>
                                    {g}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Results area */}
            <div>
                {error && (
                    <ErrorPanel
                        message={error}
                        onRetry={() => {
                            if (selectedMovie && selectedGenre) {
                                setLoading(true);
                                setError(null);
                                getScatterData(selectedMovie.movieId, selectedGenre)
                                    .then(setScatterData)
                                    .catch((err) =>
                                        setError(
                                            err instanceof Error
                                                ? err.message
                                                : 'Failed to load data'
                                        )
                                    )
                                    .finally(() => setLoading(false));
                            }
                        }}
                    />
                )}

                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <Spinner />
                        <p className="text-sm text-gray-500 animate-pulse font-medium">
                            Loading scatter data...
                        </p>
                    </div>
                )}

                {!loading && !error && selectedMovie && selectedGenre && scatterData && scatterData.count === 0 && (
                    <EmptyState />
                )}

                {!loading && !error && scatterData && scatterData.count > 0 && (
                    <div className="space-y-6">
                        {/* Chart */}
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
                            <h2 className="text-lg font-bold mb-4">
                                "{scatterData.movieTitle}" vs {scatterData.genre} Genre
                            </h2>
                            <ResponsiveContainer width="100%" height={450}>
                                <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                    <XAxis
                                        type="number"
                                        dataKey="movieRating"
                                        domain={[0, 5.5]}
                                        ticks={[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]}
                                        tick={{ fontSize: 12 }}
                                    >
                                        <Label
                                            value={`Rating for "${scatterData.movieTitle}"`}
                                            position="bottom"
                                            offset={15}
                                            style={{ fontSize: 13, fill: '#6b7280' }}
                                        />
                                    </XAxis>
                                    <YAxis
                                        type="number"
                                        dataKey="genreAvgRating"
                                        domain={[0, 5.5]}
                                        ticks={[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]}
                                        tick={{ fontSize: 12 }}
                                    >
                                        <Label
                                            value={`Avg rating in ${scatterData.genre}`}
                                            angle={-90}
                                            position="insideLeft"
                                            offset={0}
                                            style={{ fontSize: 13, fill: '#6b7280', textAnchor: 'middle' }}
                                        />
                                    </YAxis>
                                    <Scatter
                                        data={scatterData.points}
                                        fill="#3b82f6"
                                        fillOpacity={0.5}
                                        r={3}
                                    />
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Stats */}
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm space-y-3">
                            <div className="flex flex-wrap gap-6 text-sm">
                                <div>
                                    <span className="text-gray-400 font-semibold uppercase text-xs">
                                        Users plotted
                                    </span>
                                    <p className="text-lg font-bold">
                                        {scatterData.count.toLocaleString()}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-gray-400 font-semibold uppercase text-xs">
                                        Pearson r
                                    </span>
                                    <p className="text-lg font-bold">
                                        {scatterData.correlation !== null
                                            ? scatterData.correlation.toFixed(4)
                                            : 'N/A'}
                                    </p>
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {interpretCorrelation(scatterData.correlation)}
                            </p>
                        </div>
                    </div>
                )}

                {!loading && !error && !scatterData && (
                    <div className="py-16 text-center text-gray-400">
                        Select a movie and a genre to see the scatter plot.
                    </div>
                )}
            </div>
        </div>
    );
}
