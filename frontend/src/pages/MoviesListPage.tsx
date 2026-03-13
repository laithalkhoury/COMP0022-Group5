import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { getMovies } from '@/api/movies';
import { getFilterOptions } from '@/api/filters';
import type { MovieSummary, FilterOptions, PaginatedResponse, MovieQueryParams } from '@/types/dto';
import { paramsToSearch, searchToParams } from '@/utils/query';
import { saveScroll, restoreScroll } from '@/utils/scrollRestore';
import FiltersBar from '@/components/FiltersBar';
import MovieCard from '@/components/MovieCard';
import Pagination from '@/components/Pagination';
import { ErrorPanel, EmptyState, CardSkeleton } from '@/components/ui';

export default function MoviesListPage() {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();

    const currentParams = useMemo(() => searchToParams(searchParams), [searchParams]);
    const scrollKey = location.pathname + location.search;

    const [movies, setMovies] = useState<PaginatedResponse<MovieSummary> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
    const hasRestoredScroll = useRef<boolean>(false);

    // Fetch filter options once on mount
    useEffect(() => {
        getFilterOptions()
            .then(setFilterOptions)
            .catch(() => {
                /* filter options failing is non-critical */
            });
    }, []);

    // Fetch movies whenever URL params change
    const fetchMovies = useCallback(async () => {
        setLoading(true);
        setError(null);
        hasRestoredScroll.current = false;
        try {
            const params: MovieQueryParams = {
                ...currentParams,
                page: currentParams.page ?? 1,
                size: 20,
            };
            const data = await getMovies(params);
            setMovies(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [currentParams]);

    useEffect(() => {
        fetchMovies();
    }, [fetchMovies]);

    // Restore scroll after movies render
    useEffect(() => {
        if (!loading && movies && !hasRestoredScroll.current) {
            hasRestoredScroll.current = true;
            requestAnimationFrame(() => restoreScroll(scrollKey));
        }
    }, [loading, movies, scrollKey]);

    // Save scroll position on scroll
    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;
        function handleScroll() {
            clearTimeout(timeout);
            timeout = setTimeout(() => saveScroll(scrollKey), 150);
        }
        window.addEventListener('scroll', handleScroll);
        return () => {
            clearTimeout(timeout);
            window.removeEventListener('scroll', handleScroll);
        };
    }, [scrollKey]);

    function handleSearch(params: MovieQueryParams) {
        const qs = paramsToSearch({ ...params, page: 1, size: 20 });
        navigate(`/movies${qs ? `?${qs}` : ''}`);
    }

    function handlePageChange(newPage: number) {
        const qs = paramsToSearch({ ...currentParams, page: newPage, size: 20 });
        navigate(`/movies${qs ? `?${qs}` : ''}`);
    }

    const page = currentParams.page ?? 1;

    // Build a human-readable summary of active filters
    const activeFilterLabels: string[] = [];
    if (currentParams.title) activeFilterLabels.push(`title: "${currentParams.title}"`);
    if (currentParams.crew) activeFilterLabels.push(`crew: "${currentParams.crew}"`);
    if (currentParams.genres?.length) activeFilterLabels.push(currentParams.genres.join(', '));
    if (currentParams.tag) activeFilterLabels.push(`tag: #${currentParams.tag}`);
    if (currentParams.dateFrom || currentParams.dateTo) {
        const from = currentParams.dateFrom?.substring(0, 4) ?? '…';
        const to = currentParams.dateTo?.substring(0, 4) ?? '…';
        activeFilterLabels.push(`${from}–${to}`);
    }
    if (currentParams.ratingMin != null || currentParams.ratingMax != null) {
        const lo = currentParams.ratingMin ?? 0;
        const hi = currentParams.ratingMax ?? 5;
        activeFilterLabels.push(`rating ${lo}–${hi}`);
    }

    return (
        <div>
            <FiltersBar
                filterOptions={filterOptions}
                initialValues={currentParams}
                onSearch={handleSearch}
            />

            {/* Results summary bar */}
            {!loading && movies && (
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>
                        {movies.total === 0
                            ? 'No results'
                            : `Showing ${(page - 1) * 20 + 1}–${Math.min(page * 20, (page - 1) * 20 + movies.items.length)} results`}
                    </span>
                    {activeFilterLabels.length > 0 && (
                        <>
                            <span className="text-gray-300 dark:text-gray-600">·</span>
                            <span className="truncate">
                                Filtered by{' '}
                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                    {activeFilterLabels.join(' · ')}
                                </span>
                            </span>
                        </>
                    )}
                </div>
            )}

            <div className="mt-4 space-y-3">
                {loading && Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)}

                {error && <ErrorPanel message={error} onRetry={fetchMovies} />}

                {!loading && !error && movies?.items.length === 0 && <EmptyState />}

                {!loading &&
                    !error &&
                    movies?.items.map((movie) => (
                        <MovieCard
                            key={movie.id}
                            movie={movie}
                            searchedTag={currentParams.tag}
                        />
                    ))}
            </div>

            {!loading && movies && movies.totalPages > 1 && (
                <Pagination
                    page={page}
                    totalPages={movies.totalPages}
                    onPageChange={handlePageChange}
                />
            )}

        </div>
    );
}
