import { apiFetch } from './client';
import type { ScatterResponse, MovieSearchResult, GenreVsGenreResponse, PreferenceAnalysisResponse } from '@/types/dto';

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

export async function getPreferenceAnalysis(params: {
    mode: 'movie-vs-genre' | 'genre-vs-genre';
    movieId?: number;
    genresX?: string[];
    thresholdValue: number;
    thresholdType: 'low' | 'high';
    minRatings?: number;
    combinationType: 'single' | 'pair';
    sortBy?: 'genre' | 'avg_rating' | 'num_users';
    sortDir?: 'asc' | 'desc';
}): Promise<PreferenceAnalysisResponse> {
    return apiFetch<PreferenceAnalysisResponse>('/api/rating-patterns/preference-analysis', {
        mode: params.mode,
        movie_id: params.movieId,
        genre_x: params.genresX,
        threshold_value: params.thresholdValue,
        threshold_type: params.thresholdType,
        min_ratings: params.minRatings,
        combination_type: params.combinationType,
        sort_by: params.sortBy,
        sort_dir: params.sortDir,
    });
}

export async function getTotalRatings(params: {
    mode: 'movie-vs-genre' | 'genre-vs-genre';
    movieId?: number;
    genresX?: string[];
}): Promise<{ totalRatings: number; totalUsers: number }> {
    return apiFetch<{ totalRatings: number; totalUsers: number }>('/api/rating-patterns/total-ratings', {
        mode: params.mode,
        movie_id: params.movieId,
        genre_x: params.genresX,
    });
}

export async function getThresholdCounts(params: {
    mode: 'movie-vs-genre' | 'genre-vs-genre';
    movieId?: number;
    genresX?: string[];
    genresY?: string[];
    thresholdValue: number;
    thresholdType: 'low' | 'high';
    minRatings?: number;
}): Promise<{ totalUsers: number; scatterUsers: number | null }> {
    return apiFetch<{ totalUsers: number; scatterUsers: number | null }>('/api/rating-patterns/threshold-counts', {
        mode: params.mode,
        movie_id: params.movieId,
        genre_x: params.genresX,
        genre_y: params.genresY,
        threshold_value: params.thresholdValue,
        threshold_type: params.thresholdType,
        min_ratings: params.minRatings,
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
