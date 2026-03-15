import { apiFetch } from './client';
import type { MovieSummary, MovieDetail, PaginatedResponse, MovieQueryParams, CrewMember } from '@/types/dto';

// ---- Raw backend shapes ----

interface BackendMovieSummary {
    movie_id: number;
    title: string;
    release_year: number;
    runtime: number | null;
    avg_rating: number | string | null;
    genres?: string[];
    poster_url?: string | null;
}

interface BackendCrewMember {
    name: string;
    role: string;
    character: string | null;
}

interface BackendMovieDetail {
    movie_id: number;
    title: string;
    release_year: number;
    runtime: number | null;
    poster_url?: string | null;
    genres: string[];
    average_rating: number | string | null;
    rating_count: number | null;
    tags: string[];
    crew: BackendCrewMember[];
    box_office: {
        budget: number | null;
        revenue: number | null;
    } | null;
    awards: {
        status: 'award_received' | 'nominated_for';
        description: string;
    }[];
}

interface BackendSearchResponse {
    count: number;
    results: BackendMovieSummary[];
}

// ---- Mappers ----

function toMovieSummary(m: BackendMovieSummary): MovieSummary {
    const avgRating = m.avg_rating != null ? parseFloat(String(m.avg_rating)) : null;
    return {
        id: m.movie_id,
        title: m.title,
        year: m.release_year,
        releaseDate: String(m.release_year),
        posterUrl: m.poster_url ?? null,
        avgRating: avgRating != null && !isNaN(avgRating) ? avgRating : null,
        ratingCount: null,
        genres: m.genres ?? [],
        runtime: m.runtime ?? null,
    };
}

function toMovieDetail(m: BackendMovieDetail): MovieDetail {
    const avgRating =
        m.average_rating != null ? parseFloat(String(m.average_rating)) : null;

    const crew: CrewMember[] = (m.crew ?? []).map((c) => ({
        name: c.name,
        role: c.role,
        character: c.character ?? null,
    }));

    const director =
        crew.find((c) => c.role.toLowerCase().includes('director'))?.name ?? null;

    const actors = crew
        .filter(
            (c) =>
                c.role.toLowerCase().includes('actor') ||
                c.role.toLowerCase().includes('actress') ||
                c.character != null
        )
        .map((c) => c.name);

    return {
        id: m.movie_id,
        title: m.title,
        year: m.release_year,
        releaseDate: String(m.release_year),
        posterUrl: m.poster_url ?? null,
        avgRating: avgRating != null && !isNaN(avgRating) ? avgRating : null,
        ratingCount: m.rating_count ?? null,
        genres: m.genres ?? [],
        runtime: m.runtime ?? null,
        tags: m.tags ?? [],
        director,
        actors: actors.length > 0 ? actors : null,
        box_office: m.box_office ?? null, 
        awards: m.awards ?? [],
        crew,
    };
}

// ---- API functions ----

export function getMovies(params: MovieQueryParams): Promise<PaginatedResponse<MovieSummary>> {
    const size = params.size ?? 10;
    const page = params.page ?? 1;
    const offset = (page - 1) * size;

    const backendParams: Record<string, unknown> = { limit: size, offset };

    if (params.title) backendParams.title = params.title;
    if (params.genres?.length) backendParams.genre = params.genres;
    if (params.tag) backendParams.tag = params.tag;
    if (params.crew) backendParams.crew = params.crew;
    if (params.ratingMin != null) backendParams.min_rating = params.ratingMin;
    if (params.ratingMax != null) backendParams.max_rating = params.ratingMax;
    if (params.sortBy) backendParams.sort_by = params.sortBy;
    if (params.sortDir) backendParams.sort_dir = params.sortDir;

    if (params.dateFrom) {
        const year = parseInt(params.dateFrom.substring(0, 4), 10);
        if (!isNaN(year)) backendParams.year_start = year;
    }
    if (params.dateTo) {
        const year = parseInt(params.dateTo.substring(0, 4), 10);
        if (!isNaN(year)) backendParams.year_end = year;
    }

    return apiFetch<BackendSearchResponse>('/api/movies', backendParams).then((data) => {
        const items = data.results.map(toMovieSummary);
        const totalPages = Math.ceil(data.count / size) || 1;
        return { items, page, size, total: data.count, totalPages };
    });
}

export function getMovie(id: string | number): Promise<MovieDetail> {
    return apiFetch<BackendMovieDetail>(`/api/movies/${id}`).then(toMovieDetail);
}
