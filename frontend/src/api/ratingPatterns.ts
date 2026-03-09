import { apiFetch } from './client';
import type { ScatterResponse, MovieSearchResult } from '@/types/dto';

export async function getScatterData(
    movieId: number,
    genres: string[]
): Promise<ScatterResponse> {
    return apiFetch<ScatterResponse>('/api/rating-patterns/scatter', {
        movie_id: movieId,
        genre: genres,
    });
}

export async function searchMovies(
    query: string,
    limit = 10
): Promise<MovieSearchResult[]> {
    return apiFetch<MovieSearchResult[]>('/api/rating-patterns/movie-search', {
        q: query,
        limit,
    });
}
