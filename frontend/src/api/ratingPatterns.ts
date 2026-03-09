import { apiFetch } from './client';
import type { ScatterResponse, MovieSearchResult, GenreVsGenreResponse } from '@/types/dto';

export async function getScatterData(
    movieId: number,
    genres: string[],
    minRatings = 1
): Promise<ScatterResponse> {
    return apiFetch<ScatterResponse>('/api/rating-patterns/scatter', {
        movie_id: movieId,
        genre: genres,
        min_ratings: minRatings,
    });
}

export async function getGenreVsGenreData(
    genresX: string[],
    genresY: string[],
    minRatings = 1
): Promise<GenreVsGenreResponse> {
    return apiFetch<GenreVsGenreResponse>('/api/rating-patterns/scatter-genre', {
        genre_x: genresX,
        genre_y: genresY,
        min_ratings: minRatings,
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
