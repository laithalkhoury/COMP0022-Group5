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
import Toast from '@/components/Toast';
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
    const [toastVisible, setToastVisible] = useState(false);
    const hasRestoredScroll = useRef(false);

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
                size: 10,
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
            requestAnimationFrame(() => {
                restoreScroll(scrollKey);
            });
        }
    }, [loading, movies, scrollKey]);

    // Save scroll position on scroll
    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;
        function handleScroll() {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                saveScroll(scrollKey);
            }, 150);
        }
        window.addEventListener('scroll', handleScroll);
        return () => {
            clearTimeout(timeout);
            window.removeEventListener('scroll', handleScroll);
        };
    }, [scrollKey]);

    function handleSearch(params: MovieQueryParams) {
        const qs = paramsToSearch({ ...params, page: 1, size: 10 });
        navigate(`/movies${qs ? `?${qs}` : ''}`);
    }

    function handlePageChange(newPage: number) {
        const qs = paramsToSearch({ ...currentParams, page: newPage, size: 10 });
        navigate(`/movies${qs ? `?${qs}` : ''}`);
    }

    const page = currentParams.page ?? 1;

    return (
        <div>
            <FiltersBar
                filterOptions={filterOptions}
                initialValues={currentParams}
                onSearch={handleSearch}
            />

            <div className="mt-6 space-y-4">
                {loading &&
                    Array.from({ length: 5 }, (_, i) => <CardSkeleton key={i} />)}

                {error && <ErrorPanel message={error} onRetry={fetchMovies} />}

                {!loading && !error && movies?.items.length === 0 && <EmptyState />}

                {!loading &&
                    !error &&
                    movies?.items.map((movie) => (
                        <MovieCard
                            key={movie.id}
                            movie={movie}
                            searchedTag={currentParams.tag}
                            onAddToPlanner={() => setToastVisible(true)}
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

            {toastVisible && (
                <Toast
                    message="Planner coming soon. Please login to manage lists."
                    onClose={() => setToastVisible(false)}
                />
            )}
        </div>
    );
}
