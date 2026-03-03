export interface MovieSummary {
    id: string | number;
    title: string;
    releaseDate: string;
    year: number;
    posterUrl: string | null;
    avgRating: number | null;
    ratingCount: number | null;
    genres: string[];
}

export interface MovieDetail extends MovieSummary {
    tags: string[];
    director: string | null;
    actors: string[] | null;
    awards: string[] | null;
    boxOffice: string | number | null;
    criticScore: number | null;
}

export interface FilterOptions {
    genres: string[];
    tags: string[];
    awards: string[];
}

export interface PaginatedResponse<T> {
    items: T[];
    page: number;
    size: number;
    total: number;
    totalPages: number;
}

export interface MovieQueryParams {
    title?: string;
    dateFrom?: string;
    dateTo?: string;
    genres?: string[];
    tag?: string;
    ratingMin?: number;
    ratingMax?: number;
    sortBy?: 'rating' | 'year' | 'popularity' | 'boxOffice' | 'criticScore';
    sortDir?: 'asc' | 'desc';
    page?: number;
    size?: number;
}
