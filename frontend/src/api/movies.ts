import { apiFetch } from './client';
import type { MovieSummary, MovieDetail, PaginatedResponse, MovieQueryParams } from '@/types/dto';

export function getMovies(
    params: MovieQueryParams
): Promise<PaginatedResponse<MovieSummary>> {
    return apiFetch<PaginatedResponse<MovieSummary>>(
        '/movies',
        params as Record<string, unknown>
    );
}

export function getMovie(id: string | number): Promise<MovieDetail> {
    return apiFetch<MovieDetail>(`/movies/${id}`);
}
