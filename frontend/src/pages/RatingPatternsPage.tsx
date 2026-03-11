import { useState, useEffect, useRef, useCallback } from 'react';
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    ResponsiveContainer,
    Label,
    ReferenceArea,
    ReferenceLine,
} from 'recharts';
import { getFilterOptions } from '@/api/filters';
import { getScatterData, getGenreVsGenreData, getPreferenceAnalysis, searchMovies } from '@/api/ratingPatterns';
import type {
    FilterOptions,
    ScatterResponse,
    GenreVsGenreResponse,
    MovieSearchResult,
    PreferenceAnalysisResponse,
} from '@/types/dto';
import { Spinner, ErrorPanel, EmptyState } from '@/components/ui';

type Mode = 'movie-vs-genre' | 'genre-vs-genre';

const RATING_STEPS = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];

/* ── Interpretation helpers ─────────────────────────────── */

function strengthLabel(r: number): string {
    const abs = Math.abs(r);
    if (abs < 0.2) return 'very weak';
    if (abs < 0.4) return 'weak';
    if (abs < 0.6) return 'moderate';
    if (abs < 0.8) return 'strong';
    return 'very strong';
}

function interpretMovieVsGenre(r: number | null, movieTitle: string): string {
    if (r === null) return 'Not enough data to compute correlation.';
    const strength = strengthLabel(r);
    const direction = r > 0
        ? 'tend to also rate the genre lower'
        : 'tend to rate the genre higher';
    return `${strength.charAt(0).toUpperCase() + strength.slice(1)} ${r > 0 ? 'positive' : 'negative'} correlation (r = ${r.toFixed(4)}). Viewers who rate "${movieTitle}" low ${direction}.`;
}

function interpretGenreVsGenre(r: number | null, xLabel: string, yLabel: string): string {
    if (r === null) return 'Not enough data to compute correlation.';
    const strength = strengthLabel(r);
    const direction = r > 0
        ? `tend to also rate ${yLabel} lower`
        : `tend to rate ${yLabel} higher`;
    return `${strength.charAt(0).toUpperCase() + strength.slice(1)} ${r > 0 ? 'positive' : 'negative'} correlation (r = ${r.toFixed(4)}). Viewers who rate ${xLabel} low ${direction}.`;
}

/* ── Genre multi-select dropdown (reusable) ─────────────── */

function GenreMultiSelect({
    label,
    genres,
    selected,
    onToggle,
}: {
    label: string;
    genres: string[];
    selected: string[];
    onToggle: (g: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    return (
        <div className="relative" ref={ref}>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">
                {label}
            </label>
            <button
                type="button"
                onClick={() => setOpen((p) => !p)}
                className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-transparent focus:ring-2 focus:ring-blue-500 outline-none text-left flex items-center justify-between"
            >
                <span className={selected.length === 0 ? 'text-gray-400' : ''}>
                    {selected.length === 0
                        ? '-- Choose genres --'
                        : `${selected.length} genre${selected.length > 1 ? 's' : ''} selected`}
                </span>
                <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {open && (
                <ul className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {genres.map((g) => (
                        <li
                            key={g}
                            onClick={() => onToggle(g)}
                            className="px-4 py-2 text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                        >
                            <input
                                type="checkbox"
                                checked={selected.includes(g)}
                                readOnly
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>{g}</span>
                        </li>
                    ))}
                </ul>
            )}
            {selected.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                    {selected.map((g) => (
                        <span
                            key={g}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        >
                            {g}
                            <button
                                type="button"
                                onClick={() => onToggle(g)}
                                className="hover:text-blue-900 dark:hover:text-blue-200"
                            >
                                x
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ── Preference table (reusable) ────────────────────────── */

type SortColumn = 'genre' | 'avg_rating' | 'num_users';
type SortDir = 'asc' | 'desc';
interface SortState { column: SortColumn; dir: SortDir; }

function sortArrow(active: boolean, dir: SortDir) {
    if (!active) return '';
    return dir === 'asc' ? ' \u25B2' : ' \u25BC';
}

function PreferenceTable({
    label,
    thresholdValue,
    analysis,
    sort,
    onSort,
    colorClass,
}: {
    label: string;
    thresholdValue: number;
    analysis: PreferenceAnalysisResponse | null;
    sort: SortState;
    onSort: (column: SortColumn) => void;
    colorClass: 'red' | 'green';
}) {
    const headerColor = colorClass === 'red'
        ? 'text-red-600 dark:text-red-400'
        : 'text-green-600 dark:text-green-400';
    const bgAccent = colorClass === 'red'
        ? 'bg-red-50 dark:bg-red-900/10'
        : 'bg-green-50 dark:bg-green-900/10';

    const thClass = 'px-2 py-1.5 font-semibold cursor-pointer select-none hover:underline';

    return (
        <div className="flex-1 min-h-0 flex flex-col">
            <h3 className={`text-sm font-bold ${headerColor} mb-2`}>
                {label} ({colorClass === 'red' ? '<=' : '>='} {thresholdValue})
            </h3>
            {!analysis ? (
                <div className="flex items-center justify-center py-4">
                    <Spinner />
                </div>
            ) : analysis.entries.length === 0 ? (
                <p className="text-xs text-gray-400 py-2">No data for this region.</p>
            ) : (
                <div className="overflow-y-auto max-h-[200px] border border-gray-200 dark:border-gray-700 rounded-md">
                    <table className="w-full text-xs">
                        <thead className={`sticky top-0 ${bgAccent}`}>
                            <tr>
                                <th className={`text-left ${thClass}`} onClick={() => onSort('genre')}>
                                    Genre{sortArrow(sort.column === 'genre', sort.dir)}
                                </th>
                                <th className={`text-right ${thClass}`} onClick={() => onSort('avg_rating')}>
                                    Avg Rating{sortArrow(sort.column === 'avg_rating', sort.dir)}
                                </th>
                                <th className={`text-right ${thClass}`} onClick={() => onSort('num_users')}>
                                    Users{sortArrow(sort.column === 'num_users', sort.dir)}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {analysis.entries.map((entry) => (
                                <tr
                                    key={entry.genreCombination}
                                    className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                >
                                    <td className="px-2 py-1">{entry.genreCombination}</td>
                                    <td className="px-2 py-1 text-right font-mono">{entry.avgRating.toFixed(2)}</td>
                                    <td className="px-2 py-1 text-right text-gray-400">{entry.numUsers}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

/* ── Main page ──────────────────────────────────────────── */

export default function RatingPatternsPage() {
    const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
    const [loadingOptions, setLoadingOptions] = useState(true);
    const [mode, setMode] = useState<Mode>('movie-vs-genre');

    // Movie typeahead (movie-vs-genre mode)
    const [movieQuery, setMovieQuery] = useState('');
    const [movieResults, setMovieResults] = useState<MovieSearchResult[]>([]);
    const [selectedMovie, setSelectedMovie] = useState<MovieSearchResult | null>(null);
    const [showMovieDropdown, setShowMovieDropdown] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const movieDropdownRef = useRef<HTMLDivElement>(null);

    // Y-axis genres (shared by both modes)
    const [selectedGenresY, setSelectedGenresY] = useState<string[]>([]);

    // X-axis genres (genre-vs-genre mode)
    const [selectedGenresX, setSelectedGenresX] = useState<string[]>([]);

    // Min ratings (both modes)
    const [minRatings, setMinRatings] = useState(1);

    // Results
    const [movieScatter, setMovieScatter] = useState<ScatterResponse | null>(null);
    const [genreScatter, setGenreScatter] = useState<GenreVsGenreResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Preference analysis
    const [lowThreshold, setLowThreshold] = useState<number | null>(null);
    const [highThreshold, setHighThreshold] = useState<number | null>(null);
    const [combinationType, setCombinationType] = useState<'single' | 'pair'>('single');
    const [lowSort, setLowSort] = useState<SortState>({ column: 'avg_rating', dir: 'desc' });
    const [highSort, setHighSort] = useState<SortState>({ column: 'avg_rating', dir: 'desc' });
    const [lowAnalysis, setLowAnalysis] = useState<PreferenceAnalysisResponse | null>(null);
    const [highAnalysis, setHighAnalysis] = useState<PreferenceAnalysisResponse | null>(null);
    const [analysisLoading, setAnalysisLoading] = useState(false);
    const analysisDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Load genre options
    useEffect(() => {
        getFilterOptions()
            .then(setFilterOptions)
            .finally(() => setLoadingOptions(false));
    }, []);

    // Close movie dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (movieDropdownRef.current && !movieDropdownRef.current.contains(e.target as Node)) {
                setShowMovieDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Reset state when mode changes
    useEffect(() => {
        setMovieScatter(null);
        setGenreScatter(null);
        setError(null);
        setLowThreshold(null);
        setHighThreshold(null);
        setLowAnalysis(null);
        setHighAnalysis(null);
    }, [mode]);

    // Debounced movie search
    const handleMovieQueryChange = useCallback((value: string) => {
        setMovieQuery(value);
        setSelectedMovie(null);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (value.trim().length < 2) {
            setMovieResults([]);
            setShowMovieDropdown(false);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            try {
                const results = await searchMovies(value.trim());
                setMovieResults(results);
                setShowMovieDropdown(results.length > 0);
            } catch {
                setMovieResults([]);
            }
        }, 300);
    }, []);

    const handleSelectMovie = (movie: MovieSearchResult) => {
        setSelectedMovie(movie);
        setMovieQuery(movie.title);
        setShowMovieDropdown(false);
        setMovieResults([]);
    };

    const toggleGenreY = (g: string) =>
        setSelectedGenresY((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

    const toggleGenreX = (g: string) =>
        setSelectedGenresX((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

    // Fetch: movie-vs-genre
    useEffect(() => {
        if (mode !== 'movie-vs-genre') return;
        if (!selectedMovie || selectedGenresY.length === 0) {
            setMovieScatter(null);
            return;
        }
        setLoading(true);
        setError(null);
        getScatterData(selectedMovie.movieId, selectedGenresY, minRatings)
            .then(setMovieScatter)
            .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load data'))
            .finally(() => setLoading(false));
    }, [mode, selectedMovie, selectedGenresY, minRatings]);

    // Fetch: genre-vs-genre
    useEffect(() => {
        if (mode !== 'genre-vs-genre') return;
        if (selectedGenresX.length === 0 || selectedGenresY.length === 0) {
            setGenreScatter(null);
            return;
        }
        setLoading(true);
        setError(null);
        getGenreVsGenreData(selectedGenresX, selectedGenresY, minRatings)
            .then(setGenreScatter)
            .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load data'))
            .finally(() => setLoading(false));
    }, [mode, selectedGenresX, selectedGenresY, minRatings]);

    // Fetch: preference analysis (debounced)
    useEffect(() => {
        if (analysisDebounceRef.current) clearTimeout(analysisDebounceRef.current);

        // Validate: need scatter data loaded and at least one threshold
        const hasScatter = mode === 'movie-vs-genre' ? !!movieScatter : !!genreScatter;
        if (!hasScatter) {
            setLowAnalysis(null);
            setHighAnalysis(null);
            return;
        }

        // Validate overlap
        const hasOverlap = lowThreshold !== null && highThreshold !== null && lowThreshold >= highThreshold;

        if (lowThreshold === null && highThreshold === null) {
            setLowAnalysis(null);
            setHighAnalysis(null);
            return;
        }

        analysisDebounceRef.current = setTimeout(async () => {
            setAnalysisLoading(true);
            const baseParams = {
                mode,
                movieId: mode === 'movie-vs-genre' ? selectedMovie?.movieId : undefined,
                genresX: mode === 'genre-vs-genre' ? selectedGenresX : undefined,
                minRatings,
                combinationType,
            };

            try {
                const promises: Promise<void>[] = [];

                if (lowThreshold !== null && !hasOverlap) {
                    promises.push(
                        getPreferenceAnalysis({
                            ...baseParams,
                            thresholdValue: lowThreshold,
                            thresholdType: 'low',
                            sortBy: lowSort.column,
                            sortDir: lowSort.dir,
                        }).then(setLowAnalysis)
                    );
                } else {
                    setLowAnalysis(null);
                }

                if (highThreshold !== null && !hasOverlap) {
                    promises.push(
                        getPreferenceAnalysis({
                            ...baseParams,
                            thresholdValue: highThreshold,
                            thresholdType: 'high',
                            sortBy: highSort.column,
                            sortDir: highSort.dir,
                        }).then(setHighAnalysis)
                    );
                } else {
                    setHighAnalysis(null);
                }

                await Promise.all(promises);
            } catch {
                // Silently handle — individual sections show empty state
            } finally {
                setAnalysisLoading(false);
            }
        }, 500);

        return () => {
            if (analysisDebounceRef.current) clearTimeout(analysisDebounceRef.current);
        };
    }, [lowThreshold, highThreshold, combinationType, mode, selectedMovie, selectedGenresX, minRatings, movieScatter, genreScatter, lowSort, highSort]);

    // Derived display values
    const yLabel = selectedGenresY.join(' + ');
    const xLabelGenre = selectedGenresX.join(' + ');

    const chartData =
        mode === 'movie-vs-genre'
            ? movieScatter
                ? { points: movieScatter.points, count: movieScatter.count, correlation: movieScatter.correlation }
                : null
            : genreScatter
                ? { points: genreScatter.points, count: genreScatter.count, correlation: genreScatter.correlation }
                : null;

    const xDataKey = mode === 'movie-vs-genre' ? 'movieRating' : 'xAvgRating';
    const yDataKey = mode === 'movie-vs-genre' ? 'genreAvgRating' : 'yAvgRating';

    const xAxisLabel =
        mode === 'movie-vs-genre'
            ? `Rating for "${selectedMovie?.title ?? '...'}"`
            : `Avg rating in ${xLabelGenre || '...'}`;
    const yAxisLabel = `Avg rating in ${yLabel || '...'}`;

    const chartTitle =
        mode === 'movie-vs-genre'
            ? `"${movieScatter?.movieTitle ?? ''}" vs ${yLabel}`
            : `${xLabelGenre} vs ${yLabel}`;

    const interpretText =
        mode === 'movie-vs-genre'
            ? interpretMovieVsGenre(chartData?.correlation ?? null, movieScatter?.movieTitle ?? '')
            : interpretGenreVsGenre(chartData?.correlation ?? null, xLabelGenre, yLabel);

    const hasSelection =
        mode === 'movie-vs-genre'
            ? !!selectedMovie && selectedGenresY.length > 0
            : selectedGenresX.length > 0 && selectedGenresY.length > 0;

    const hasOverlap = lowThreshold !== null && highThreshold !== null && lowThreshold >= highThreshold;
    const showPanel = (lowThreshold !== null || highThreshold !== null) && !hasOverlap;

    // Count users in each threshold region from loaded scatter points
    function pointX(p: { movieRating?: number; xAvgRating?: number }): number {
        return mode === 'movie-vs-genre' ? (p.movieRating ?? 0) : (p.xAvgRating ?? 0);
    }
    const lowRegionCount = chartData && lowThreshold !== null
        ? chartData.points.filter((p) => pointX(p) <= lowThreshold).length
        : null;
    const highRegionCount = chartData && highThreshold !== null
        ? chartData.points.filter((p) => pointX(p) >= highThreshold).length
        : null;

    if (loadingOptions) {
        return (
            <div className="flex justify-center py-20">
                <Spinner />
            </div>
        );
    }

    const genres = filterOptions?.genres ?? [];

    return (
        <div className="max-w-[1400px] mx-auto space-y-8 px-4">
            <header>
                <h1 className="text-2xl font-bold">Rating Pattern Analysis</h1>
                <p className="text-gray-500 dark:text-gray-400">
                    Analyse whether viewers who give low ratings to one film or genre also
                    give low ratings to others in the same or different genres.
                </p>
            </header>

            {/* Mode selector */}
            <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">
                    X-Axis Type
                </label>
                <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as Mode)}
                    className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-transparent focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    <option value="movie-vs-genre">Movie vs Genre</option>
                    <option value="genre-vs-genre">Genre vs Genre</option>
                </select>
            </div>

            {/* Controls */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: X-axis input */}
                    {mode === 'movie-vs-genre' ? (
                        <div className="relative" ref={movieDropdownRef}>
                            <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">
                                Select Movie (X-Axis)
                            </label>
                            <input
                                type="text"
                                value={movieQuery}
                                onChange={(e) => handleMovieQueryChange(e.target.value)}
                                placeholder="Type to search, e.g. Toy Story"
                                className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-transparent focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            {showMovieDropdown && movieResults.length > 0 && (
                                <ul className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                    {movieResults.map((m) => (
                                        <li
                                            key={m.movieId}
                                            onClick={() => handleSelectMovie(m)}
                                            className="px-4 py-2 text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            <span className="font-medium">{m.title}</span>
                                            {m.year && (
                                                <span className="text-gray-400 ml-2">({m.year})</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {selectedMovie && selectedMovie.genres.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {selectedMovie.genres.map((g) => (
                                        <span
                                            key={g}
                                            className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                                        >
                                            {g}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <GenreMultiSelect
                            label="Select Genres (X-Axis)"
                            genres={genres}
                            selected={selectedGenresX}
                            onToggle={toggleGenreX}
                        />
                    )}

                    {/* Right: Y-axis genres */}
                    <GenreMultiSelect
                        label="Select Genres (Y-Axis)"
                        genres={genres}
                        selected={selectedGenresY}
                        onToggle={toggleGenreY}
                    />
                </div>

                {/* Min ratings + threshold controls */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Min ratings filter */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">
                            Min Movies Rated per Genre
                        </label>
                        <input
                            type="number"
                            min={1}
                            value={minRatings}
                            onChange={(e) => setMinRatings(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-24 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-transparent focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            Only include users who rated at least this many movies in each genre group.
                        </p>
                        {chartData && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-1">
                                Users plotted: {chartData.count.toLocaleString()}
                            </p>
                        )}
                    </div>

                    {/* Low threshold */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">
                            Low Rating Region (&lt;=)
                        </label>
                        <select
                            value={lowThreshold ?? ''}
                            onChange={(e) => setLowThreshold(e.target.value === '' ? null : parseFloat(e.target.value))}
                            className="w-24 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-transparent focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">None</option>
                            {RATING_STEPS.map((v) => (
                                <option key={v} value={v}>{v}</option>
                            ))}
                        </select>
                        {lowThreshold !== null && chartData && (
                            <p className="text-xs text-red-600 dark:text-red-400 font-semibold mt-1">
                                {(lowRegionCount ?? 0).toLocaleString()} users in region
                            </p>
                        )}
                    </div>

                    {/* High threshold */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">
                            High Rating Region (&gt;=)
                        </label>
                        <select
                            value={highThreshold ?? ''}
                            onChange={(e) => setHighThreshold(e.target.value === '' ? null : parseFloat(e.target.value))}
                            className="w-24 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-transparent focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">None</option>
                            {RATING_STEPS.map((v) => (
                                <option key={v} value={v}>{v}</option>
                            ))}
                        </select>
                        {highThreshold !== null && chartData && (
                            <p className="text-xs text-green-600 dark:text-green-400 font-semibold mt-1">
                                {(highRegionCount ?? 0).toLocaleString()} users in region
                            </p>
                        )}
                    </div>
                </div>

                {hasOverlap && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                        Low threshold must be less than high threshold. Adjust the values to see analysis results.
                    </p>
                )}
            </div>

            {/* Results area */}
            <div>
                {error && (
                    <ErrorPanel message={error} onRetry={() => setError(null)} />
                )}

                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <Spinner />
                        <p className="text-sm text-gray-500 animate-pulse font-medium">
                            Loading scatter data...
                        </p>
                    </div>
                )}

                {!loading && !error && hasSelection && chartData && chartData.count === 0 && (
                    <EmptyState />
                )}

                {!loading && !error && chartData && chartData.count > 0 && (
                    <div className="space-y-6">
                        <div className={`flex gap-6 ${showPanel ? 'flex-col lg:flex-row' : ''}`}>
                            {/* Chart column */}
                            <div className={showPanel ? 'flex-[3] min-w-0' : 'w-full'}>
                                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
                                    <h2 className="text-lg font-bold mb-4">{chartTitle}</h2>
                                    <ResponsiveContainer width="100%" height={450}>
                                        <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                            <XAxis
                                                type="number"
                                                dataKey={xDataKey}
                                                domain={[0, 5.5]}
                                                ticks={[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]}
                                                tick={{ fontSize: 12 }}
                                            >
                                                <Label
                                                    value={xAxisLabel}
                                                    position="bottom"
                                                    offset={15}
                                                    style={{ fontSize: 13, fill: '#6b7280' }}
                                                />
                                            </XAxis>
                                            <YAxis
                                                type="number"
                                                dataKey={yDataKey}
                                                domain={[0, 5.5]}
                                                ticks={[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]}
                                                tick={{ fontSize: 12 }}
                                            >
                                                <Label
                                                    value={yAxisLabel}
                                                    angle={-90}
                                                    position="insideLeft"
                                                    offset={0}
                                                    style={{ fontSize: 13, fill: '#6b7280', textAnchor: 'middle' }}
                                                />
                                            </YAxis>
                                            {lowThreshold !== null && !hasOverlap && (
                                                <>
                                                    <ReferenceArea x1={0} x2={lowThreshold} fill="#ef4444" fillOpacity={0.08} />
                                                    <ReferenceLine x={lowThreshold} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={1.5} />
                                                </>
                                            )}
                                            {highThreshold !== null && !hasOverlap && (
                                                <>
                                                    <ReferenceArea x1={highThreshold} x2={5.5} fill="#22c55e" fillOpacity={0.08} />
                                                    <ReferenceLine x={highThreshold} stroke="#22c55e" strokeDasharray="5 5" strokeWidth={1.5} />
                                                </>
                                            )}
                                            <Scatter
                                                data={chartData.points}
                                                fill="#3b82f6"
                                                fillOpacity={0.5}
                                                r={3}
                                            />
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Analysis side panel */}
                            {showPanel && (
                                <div className="flex-[2] min-w-0">
                                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm space-y-4 h-full">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-bold">Preference Analysis</h3>
                                            {analysisLoading && <Spinner />}
                                        </div>

                                        {/* Combination type toggle */}
                                        <div className="flex gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setCombinationType('single')}
                                                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                                                    combinationType === 'single'
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                }`}
                                            >
                                                Single Genres
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setCombinationType('pair')}
                                                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                                                    combinationType === 'pair'
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                }`}
                                            >
                                                Genre Pairs
                                            </button>
                                        </div>

                                        {/* Low region table */}
                                        {lowThreshold !== null && (
                                            <PreferenceTable
                                                label="Low Raters"
                                                thresholdValue={lowThreshold}
                                                analysis={lowAnalysis}
                                                sort={lowSort}
                                                onSort={(col) => setLowSort((prev) =>
                                                    prev.column === col
                                                        ? { column: col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                                                        : { column: col, dir: 'desc' }
                                                )}
                                                colorClass="red"
                                            />
                                        )}

                                        {/* High region table */}
                                        {highThreshold !== null && (
                                            <PreferenceTable
                                                label="High Raters"
                                                thresholdValue={highThreshold}
                                                analysis={highAnalysis}
                                                sort={highSort}
                                                onSort={(col) => setHighSort((prev) =>
                                                    prev.column === col
                                                        ? { column: col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                                                        : { column: col, dir: 'desc' }
                                                )}
                                                colorClass="green"
                                            />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm space-y-3">
                            <div className="flex flex-wrap gap-6 text-sm">
                                <div>
                                    <span className="text-gray-400 font-semibold uppercase text-xs">Pearson r</span>
                                    <p className="text-lg font-bold">
                                        {chartData.correlation !== null ? chartData.correlation.toFixed(4) : 'N/A'}
                                    </p>
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{interpretText}</p>
                        </div>
                    </div>
                )}

                {!loading && !error && !chartData && (
                    <div className="py-16 text-center text-gray-400">
                        {mode === 'movie-vs-genre'
                            ? 'Select a movie and at least one genre to see the scatter plot.'
                            : 'Select genres for both axes to see the scatter plot.'}
                    </div>
                )}
            </div>
        </div>
    );
}
